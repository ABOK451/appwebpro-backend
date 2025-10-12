const pool = require('../infrastructure/db');
const Bitacora = require('../domain/bitacora');
const InventarioReportService = require('../application/inventarioReporteService'); // ✅ IMPORTACIÓN

class BitacoraService {

  // Registrar movimiento en bitácora
  static registrar({ id_producto, tipo_movimiento, cantidad, descripcion }) {
    return pool.query(
      `INSERT INTO bitacora (id_producto, tipo_movimiento, cantidad, descripcion, fecha)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id_producto, tipo_movimiento, cantidad, descripcion || null]
    )
    .then(async (res) => {
      const registro = res.rows[0];

      try {
        // ✅ Obtener el código del producto
        const producto = await pool.query(
          `SELECT codigo FROM productos WHERE id = $1`,
          [id_producto]
        );

        if (producto.rows.length > 0) {
          const codigo_producto = producto.rows[0].codigo;

          // ✅ Recalcular stock automáticamente
          await InventarioReportService.recalculateStockByCodigo(codigo_producto);
        } else {
          console.warn(`Producto con id ${id_producto} no encontrado, no se recalculó stock`);
        }
      } catch (err) {
        console.error('Error al recalcular stock:', err);
      }

      return registro;
    });
  }

  // Listar toda la bitácora
  static listar() {
    return pool.query(`
      SELECT b.*, p.nombre AS producto_nombre, p.codigo
      FROM bitacora b
      LEFT JOIN productos p ON b.id_producto = p.id
      ORDER BY b.fecha DESC
    `)
    .then(res => res.rows.map(row => new Bitacora(
      row.id_producto,
      row.tipo_movimiento,
      row.cantidad,
      row.descripcion,
      row.fecha
    )));
  }

  // Actualizar un registro de bitácora (por body)
  static actualizar({ id, tipo_movimiento, cantidad, descripcion }) {
    return pool.query(
      `UPDATE bitacora
       SET tipo_movimiento = $1,
           cantidad = $2,
           descripcion = $3
       WHERE id = $4
       RETURNING *`,
      [tipo_movimiento, cantidad, descripcion || null, id]
    )
    .then(res => res.rows[0]);
  }

  // Eliminar registro
  static eliminar({ id }) {
    return pool.query(
      `DELETE FROM bitacora WHERE id = $1 RETURNING *`,
      [id]
    )
    .then(res => res.rows[0]);
  }
}

module.exports = BitacoraService;
