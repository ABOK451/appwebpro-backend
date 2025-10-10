const pool = require('../infrastructure/db');
const Bitacora = require('../domain/bitacora');

class BitacoraService {

  // Registrar movimiento en bitácora
  static registrar({ id_producto, tipo_movimiento, cantidad, descripcion }) {
    return pool.query(
      `INSERT INTO bitacora (id_producto, tipo_movimiento, cantidad, descripcion, fecha)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id_producto, tipo_movimiento, cantidad, descripcion || null]
    )
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
    return pool.query(`DELETE FROM bitacora WHERE id = $1 RETURNING *`, [id])
      .then(res => res.rows[0]);
  }
}

module.exports = BitacoraService;
