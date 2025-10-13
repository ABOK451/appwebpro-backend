const pool = require('../infrastructure/db');
const Bitacora = require('../domain/bitacora');
const InventarioReportService = require('../application/inventarioReporteService'); // ✅ IMPORTACIÓN

class BitacoraService {

  // Registrar movimiento en bitácora
  static registrar({ id_producto, tipo_movimiento, cantidad, descripcion }) {
  return pool.query(
    `SELECT codigo, cantidad AS stock_actual FROM productos WHERE id = $1`,
    [id_producto]
  )
  .then(productoRes => {
    if (productoRes.rows.length === 0) {
      throw new Error("El producto no existe");
    }

    const { codigo: codigo_producto, stock_actual } = productoRes.rows[0];
    let nuevoStock = stock_actual;

    if (tipo_movimiento === 'entrada') {
      nuevoStock = stock_actual + cantidad;
    } else if (tipo_movimiento === 'salida') {
      if (cantidad > stock_actual) {
        throw new Error("No hay suficiente stock para realizar la salida");
      }
      nuevoStock = stock_actual - cantidad;
    }

    // 1. Insertar en bitácora usando solo codigo_producto
    return pool.query(
      `INSERT INTO bitacora (codigo_producto, tipo_movimiento, cantidad, descripcion, fecha)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        codigo_producto,
        tipo_movimiento,
        cantidad,
        descripcion || null
      ]
    )
    .then(bitacoraRes => {
      // 2. Actualizar cantidad/stock en productos
      return pool.query(
        `UPDATE productos
         SET cantidad = $1
         WHERE codigo = $2
         RETURNING *`,
        [nuevoStock, codigo_producto]
      )
      .then(() => bitacoraRes.rows[0]);
    });
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
