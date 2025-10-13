const pool = require('../infrastructure/db');
const Bitacora = require('../domain/bitacora');
const InventarioReportService = require('../application/inventarioReporteService'); // ✅ IMPORTACIÓN

class BitacoraService {

// Registrar movimiento en bitácora
static registrar({ id_producto, tipo_movimiento, cantidad, descripcion }) {
   {
    id_producto,
    tipo_movimiento,
    cantidad,
    descripcion
  };

  return pool.query(
    `SELECT codigo, cantidad AS stock_actual FROM productos WHERE codigo = $1`,
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
    } else {
      throw new Error("El tipo de movimiento debe ser 'entrada' o 'salida'");
    }


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

      return pool.query(
        `UPDATE productos
         SET cantidad = $1
         WHERE codigo = $2
         RETURNING *`,
        [nuevoStock, codigo_producto]
      )
      .then(updateRes => {
        return bitacoraRes.rows[0];
      });
    });
  })
  .catch(error => {
    throw error;
  });
}







  static listar() {
  return pool.query(`
    SELECT 
      b.id,
      b.codigo_producto,
      b.tipo_movimiento,
      b.cantidad,
      b.descripcion,
      b.id_usuario,
      b.fecha,
      p.nombre AS producto_nombre
    FROM bitacora b
    LEFT JOIN productos p ON b.codigo_producto = p.codigo
    ORDER BY b.fecha DESC
  `)
  .then(res => res.rows.map(row => new Bitacora(
    row.id,
    row.codigo_producto,
    row.tipo_movimiento,
    row.cantidad,
    row.descripcion,
    row.id_usuario,
    row.fecha
  )));
}


  // Servicio actualizado
static actualizar({ id, tipo_movimiento, cantidad, descripcion }) {
  // 1️⃣ Obtener datos anteriores
  return pool.query(
    `SELECT id_producto, tipo_movimiento, cantidad
     FROM bitacora
     WHERE id = $1`,
    [id]
  )
  .then(res => {
    const registroAnterior = res.rows[0];
    if (!registroAnterior) return null;

    const { id_producto, tipo_movimiento: tipoAntes, cantidad: cantidadAntes } = registroAnterior;

    const nuevaCantidad = cantidad !== undefined ? cantidad : cantidadAntes;
    const nuevoTipo = tipo_movimiento || tipoAntes;

    let diferencia = 0;

    if (tipoAntes === "salida" && nuevoTipo === "salida") {
      diferencia = cantidadAntes - nuevaCantidad;  // salida corregida
    } else if (tipoAntes === "entrada" && nuevoTipo === "entrada") {
      diferencia = nuevaCantidad - cantidadAntes;  // entrada corregida
    }

    return pool.query(
      `UPDATE productos
       SET cantidad = cantidad + $1
       WHERE id = $2
       RETURNING *`,
      [diferencia, id_producto]
    )
    .then(() => {
      return pool.query(
        `UPDATE bitacora
         SET tipo_movimiento = $1,
             cantidad = $2,
             descripcion = $3
         WHERE id = $4
         RETURNING *`,
        [nuevoTipo, nuevaCantidad, descripcion || null, id]
      ).then(r => r.rows[0]);
    });
  })
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
