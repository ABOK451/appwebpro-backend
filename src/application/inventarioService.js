const pool = require('../infrastructure/db');
const Bitacora = require('../domain/bitacora');
const InventarioReportService = require('../application/inventarioReporteService'); // ✅ IMPORTACIÓN

class BitacoraService {

  // Registrar movimiento en bitácora
  static registrar({ id_producto, tipo_movimiento, cantidad, descripcion }) {
  // 1. Consultar el código del producto a partir del id
  return pool.query(
    `SELECT codigo FROM productos WHERE id = $1`,
    [id_producto]
  )
  .then(productoRes => {
    if (productoRes.rows.length === 0) {
      throw new Error("El producto no existe");
    }

    const codigo_producto = productoRes.rows[0].codigo;

    // 2. Insertar en bitácora usando id_producto y codigo_producto
    return pool.query(
      `INSERT INTO bitacora (id_producto, codigo_producto, tipo_movimiento, cantidad, descripcion, fecha)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        id_producto,
        codigo_producto,
        tipo_movimiento,
        cantidad,
        descripcion || null
      ]
    );
  })
  .then(res => res.rows[0]);
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
