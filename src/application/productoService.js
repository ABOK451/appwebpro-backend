const pool = require('../infrastructure/db');
const Producto = require('../domain/producto');
const InventarioReportService = require('../application/inventarioReporteService');
const { formatDate } = require('../infrastructure/utils/dateUtils');
const { LOW_STOCK_THRESHOLD } = require('../config/constants');

class ProductoService {
  static validarCategoria(id_categoria) {
    if (!id_categoria) return Promise.resolve(null);
    return pool.query("SELECT * FROM categorias WHERE id = $1", [id_categoria])
      .then(res => res.rows.length > 0 ? res.rows[0] : null);
  }

  static crear({ nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen }) {
    return pool.query("SELECT * FROM productos WHERE codigo = $1", [codigo])
      .then(existente => {
        if (existente.rows.length > 0) {
          const error = new Error("Ya existe un producto con ese código");
          error.codigo = "CODIGO_DUPLICADO";
          throw error;
        }

        return pool.query(
          `INSERT INTO productos 
            (nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen, fecha_ingreso)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           RETURNING *`,
          [
            nombre.trim(),
            codigo.trim(),
            descripcion || null,
            cantidad,
            stock || 0,
            precio,
            proveedor || null,
            id_categoria || null,
            imagen || null
          ]
        );
      })
      .then(async resultado => {
        const nuevo = resultado.rows[0];

        await pool.query(
          `INSERT INTO bitacora (codigo_producto, tipo_movimiento, cantidad, descripcion)
           VALUES ($1, 'registro_inicial', $2, 'Registro inicial del producto')`,
          [nuevo.codigo, nuevo.cantidad]
        );

        try {
          await InventarioReportService.recalculateStockByCodigo(nuevo.codigo);
        } catch (err) {
          console.error('Error al recalcular stock:', err);
        }

        nuevo.fecha_ingreso = formatDate(nuevo.fecha_ingreso);

        const alertaBajoStock = nuevo.stock <= LOW_STOCK_THRESHOLD;

        return { producto: nuevo, alertaBajoStock };
      });
  }

  static listar(filtros = {}) {
      const { nombre, categoria, proveedor, codigo } = filtros;
      const condiciones = [];
      const valores = [];

      if (nombre) {
        valores.push(`%${nombre.toLowerCase()}%`);
        condiciones.push(`LOWER(p.nombre) LIKE $${valores.length}`);
      }

      if (categoria) {
        valores.push(`%${categoria.toLowerCase()}%`);
        condiciones.push(`LOWER(c.nombre) LIKE $${valores.length}`);
      }

      if (proveedor) {
        valores.push(`%${proveedor.toLowerCase()}%`);
        condiciones.push(`LOWER(p.proveedor) LIKE $${valores.length}`);
      }

      if (codigo) {
        valores.push(codigo);
        condiciones.push(`p.codigo = $${valores.length} OR p.id = $${valores.length}`);
      }

      let query = `
        SELECT p.*, c.nombre AS categoria_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id
      `;

      if (condiciones.length > 0) {
        query += " WHERE " + condiciones.join(" AND ");
      }

      query += " ORDER BY p.fecha_ingreso DESC";

      return pool.query(query, valores)
        .then(r => r.rows.map(p => ({ ...p, fecha_ingreso: formatDate(p.fecha_ingreso) })));
}


  static actualizar(codigo, datos) {
    return pool.query("SELECT * FROM productos WHERE codigo = $1", [codigo])
      .then(r => {
        if (r.rows.length === 0) {
          const error = new Error("Producto no encontrado");
          error.codigo = "PRODUCTO_NO_EXISTE";
          throw error;
        }

        const productoAnterior = r.rows[0];

        return pool.query(
          `UPDATE productos SET
            nombre = $1,
            descripcion = $2,
            cantidad = $3,
            stock = $4,
            precio = $5,
            proveedor = $6,
            id_categoria = $7,
            imagen = $8
           WHERE codigo = $9
           RETURNING *`,
          [
            datos.nombre.trim(),
            datos.descripcion || null,
            datos.cantidad,
            datos.stock,
            datos.precio,
            datos.proveedor || null,
            datos.id_categoria || null,
            datos.imagen || null,
            codigo
          ]
        ).then(resultadoActualizado => {
          const actualizado = resultadoActualizado.rows[0];

          actualizado.fecha_ingreso = formatDate(actualizado.fecha_ingreso);

          const diferencia = actualizado.cantidad - productoAnterior.cantidad;
          if (diferencia !== 0) {
            const tipo = diferencia > 0 ? 'entrada' : 'salida';
            return pool.query(
              `INSERT INTO bitacora (codigo_producto, tipo_movimiento, cantidad, descripcion)
               VALUES ($1, $2, $3, 'Actualización de producto')`,
              [codigo, tipo, Math.abs(diferencia)]
            ).then(() => actualizado);
          }

          return actualizado;
        });
      })
      .then(actualizado => {
        const alertaBajoStock = actualizado.stock <= LOW_STOCK_THRESHOLD;
        return { producto: actualizado, alertaBajoStock };
      });
  }

  static eliminar(codigo) {
    return pool.query("SELECT * FROM productos WHERE codigo = $1", [codigo])
      .then(r => {
        if (r.rows.length === 0) {
          const error = new Error("Producto no encontrado");
          error.codigo = "PRODUCTO_NO_EXISTE";
          throw error;
        }

        const producto = r.rows[0];

        return pool.query("DELETE FROM productos WHERE codigo = $1 RETURNING *", [codigo])
          .then(resultadoDelete => {
            return pool.query(
              `INSERT INTO bitacora (codigo_producto, tipo_movimiento, cantidad, descripcion)
               VALUES ($1, 'salida', $2, 'Producto eliminado del inventario')`,
              [producto.codigo, producto.cantidad]
            ).then(() => resultadoDelete.rows[0]);
          });
      });
  }

  static obtenerPorId(id_producto) {
  return pool.query("SELECT * FROM productos WHERE codigo = $1", [id_producto])
    .then(r => r.rows.length > 0 ? r.rows[0] : null);
}

static actualizarCantidad(id_producto, nuevaCantidad) {
  return pool.query(
    `UPDATE productos 
     SET cantidad = $1
     WHERE codigo = $2
     RETURNING *`,
    [nuevaCantidad, id_producto]
  ).then(r => r.rows[0]);
}


}

module.exports = ProductoService;
