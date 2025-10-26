const pool = require('../infrastructure/db');
const Producto = require('../domain/producto');
const InventarioReportService = require('../application/inventarioReporteService');
const { formatDate } = require('../infrastructure/utils/dateUtils'); // ✅ utils de fecha
const { LOW_STOCK_THRESHOLD } = require('../config/constants'); // ✅ constante de bajo stock

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

        // Formatear fecha
        nuevo.fecha_ingreso = formatDate(nuevo.fecha_ingreso);

        // Agregar alerta de bajo stock
        const alertaBajoStock = nuevo.stock <= LOW_STOCK_THRESHOLD;

        return { producto: nuevo, alertaBajoStock };
      });
  }

  static listar() {
    return pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      ORDER BY p.fecha_ingreso DESC
    `)
      .then(r => r.rows.map(p => ({ ...p, fecha_ingreso: formatDate(p.fecha_ingreso) })));
  }

  static listarPorCampo(campo, valor) {
    let query;
    switch (campo) {
      case 'nombre': query = "WHERE LOWER(p.nombre) LIKE LOWER($1)"; break;
      case 'categoria': query = "WHERE LOWER(c.nombre) LIKE LOWER($1)"; break;
      case 'proveedor': query = "WHERE LOWER(p.proveedor) LIKE LOWER($1)"; break;
      default: return Promise.resolve([]);
    }
    return pool.query(`
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      ${query}`, [`%${valor}%`]
    ).then(r => r.rows.map(p => ({ ...p, fecha_ingreso: formatDate(p.fecha_ingreso) })));
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

          // Formatear fecha
          actualizado.fecha_ingreso = formatDate(actualizado.fecha_ingreso);

          // Verificar diferencia en cantidad o stock
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
}

module.exports = ProductoService;
