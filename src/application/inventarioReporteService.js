const pool = require('../infrastructure/db');

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

class InventarioReportService {

  // RF2.4 - recalcula stock actual de un producto (por codigo)
  static recalculateStockByCodigo(codigo) {
    // Sum entradas - salidas desde bitacora
    const q = `
      SELECT COALESCE(SUM(
        CASE WHEN tipo_movimiento IN ('entrada','registro_inicial') THEN cantidad
             WHEN tipo_movimiento = 'salida' THEN -cantidad
             ELSE 0 END
      ),0) AS stock_calc
      FROM bitacora
      WHERE codigo_producto = $1
    `;
    return pool.query(q, [codigo])
      .then(r => {
        const stockCalc = Number(r.rows[0].stock_calc || 0);
        // Actualizamos la columna cantidad en productos (o stock, según tu modelo)
        return pool.query(
          `UPDATE productos SET cantidad = $1 WHERE codigo = $2 RETURNING *`,
          [stockCalc, codigo]
        ).then(res => res.rows[0]);
      });
  }

  // Recalcula todos los productos (devuelve array de productos actualizados)
  static recalculateAllStocks() {
    // obtenemos todos los codigos
    return pool.query('SELECT codigo FROM productos')
      .then(r => Promise.all(r.rows.map(row => InventarioReportService.recalculateStockByCodigo(row.codigo))));
  }

  // RF2.1 - inventario actual: lista productos con stock calculado (se puede usar la columna cantidad ya actualizada)
  static reporteInventarioActual() {
    return pool.query(`
      SELECT p.codigo, p.nombre, p.descripcion, p.cantidad AS stock_actual, p.precio, p.proveedor, p.id_categoria, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      ORDER BY p.nombre
    `).then(r => r.rows);
  }

  // RF2.1 - productos más vendidos (basado en bitacora tipo 'salida')
  // periodo opcional: { fecha_inicio, fecha_fin }, limit opcional
  static reporteMasVendidos({ fecha_inicio, fecha_fin, limit = 10 } = {}) {
    const params = [];
    let filtro = `WHERE tipo_movimiento = 'salida'`;
    if (fecha_inicio) {
      params.push(fecha_inicio);
      filtro += ` AND fecha >= $${params.length}`;
    }
    if (fecha_fin) {
      params.push(fecha_fin);
      filtro += ` AND fecha <= $${params.length}`;
    }
    params.push(limit);
    const q = `
      SELECT b.codigo_producto, p.nombre, SUM(b.cantidad) AS total_vendido
      FROM bitacora b
      LEFT JOIN productos p ON p.codigo = b.codigo_producto
      ${filtro}
      GROUP BY b.codigo_producto, p.nombre
      ORDER BY total_vendido DESC
      LIMIT $${params.length}
    `;
    return pool.query(q, params).then(r => r.rows);
  }

  // RF2.1 - productos con bajo stock (threshold opcional)
  static reporteBajoStock({ threshold = DEFAULT_LOW_STOCK_THRESHOLD } = {}) {
    return pool.query(`
      SELECT p.codigo, p.nombre, p.cantidad AS stock_actual, p.precio, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      WHERE p.cantidad <= $1
      ORDER BY p.cantidad ASC
    `, [threshold]).then(r => r.rows);
  }

  // RF2.1 - movimientos por periodo (filtros en body)
  static reporteMovimientosPeriodo({ fecha_inicio, fecha_fin, codigo_producto = null } = {}) {
    const params = [];
    let where = 'WHERE 1=1';
    if (fecha_inicio) {
      params.push(fecha_inicio);
      where += ` AND fecha >= $${params.length}`;
    }
    if (fecha_fin) {
      params.push(fecha_fin);
      where += ` AND fecha <= $${params.length}`;
    }
    if (codigo_producto) {
      params.push(codigo_producto);
      where += ` AND codigo_producto = $${params.length}`;
    }

    const q = `
      SELECT b.id, b.codigo_producto, p.nombre as nombre_producto, b.tipo_movimiento, b.cantidad, b.descripcion, b.id_usuario, b.fecha
      FROM bitacora b
      LEFT JOIN productos p ON p.codigo = b.codigo_producto
      ${where}
      ORDER BY b.fecha DESC
    `;
    return pool.query(q, params).then(r => r.rows);
  }

  // RF2.2 - Export helpers will be in controller (PDF/Excel generation), but we can provide data fetch wrappers:
  static fetchReportData(reportType, params = {}) {
    switch (reportType) {
      case 'inventario':
        return InventarioReportService.reporteInventarioActual();
      case 'mas_vendidos':
        return InventarioReportService.reporteMasVendidos(params);
      case 'bajo_stock':
        return InventarioReportService.reporteBajoStock(params);
      case 'movimientos_periodo':
        return InventarioReportService.reporteMovimientosPeriodo(params);
      default:
        return Promise.reject(new Error('Tipo de reporte desconocido'));
    }
  }

  // RF2.3 - Datos para dashboards
  static dashboardMasVendidos({ periodo = { fecha_inicio: null, fecha_fin: null }, limit = 10 } = {}) {
    return InventarioReportService.reporteMasVendidos({ ...periodo, limit })
      .then(rows => ({
        labels: rows.map(r => r.nombre || r.codigo_producto),
        datasets: [{ label: 'Unidades vendidas', data: rows.map(r => Number(r.total_vendido)) }]
      }));
  }

  static dashboardValorInventario() {
    // valor total = SUM(cantidad * precio)
    return pool.query(`SELECT COALESCE(SUM(cantidad * precio),0) AS valor_total FROM productos`)
      .then(r => ({ valor_total: Number(r.rows[0].valor_total || 0) }));
  }
}

module.exports = InventarioReportService;
//hola
