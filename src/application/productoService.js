const pool = require('../infrastructure/db');
const Producto = require('../domain/producto');

class ProductoService {

  // Crear producto
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
            imagen || null,
          ]
        );
      })
      .then(resultado => {
        const nuevo = resultado.rows[0];
        return new Producto(
          nuevo.codigo,
          nuevo.nombre,
          nuevo.descripcion,
          nuevo.cantidad,
          nuevo.stock,
          nuevo.precio,
          nuevo.proveedor,
          nuevo.id_categoria,
          nuevo.imagen,
          nuevo.fecha_ingreso
        );
      });
  }

  // Listar todos los productos con su categoría
  static listar() {
    return pool.query(`
      SELECT 
        p.*, 
        c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id
      ORDER BY p.fecha_ingreso DESC
    `)
    .then(resultado =>
      resultado.rows.map(p =>
        new Producto(
          p.codigo,
          p.nombre,
          p.descripcion,
          p.cantidad,
          p.stock,
          p.precio,
          p.proveedor,
          p.id_categoria,
          p.imagen,
          p.fecha_ingreso,
          p.categoria_nombre
        )
      )
    );
  }

  // Actualizar producto por código
  static actualizar(codigo, { nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen }) {
    return pool.query("SELECT * FROM productos WHERE codigo = $1", [codigo])
      .then(resultado => {
        if (resultado.rows.length === 0) {
          const error = new Error("Producto no encontrado");
          error.codigo = "PRODUCTO_NO_EXISTE";
          throw error;
        }

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
            nombre.trim(),
            descripcion || null,
            cantidad,
            stock,
            precio,
            proveedor || null,
            id_categoria || null,
            imagen || null,
            codigo
          ]
        );
      })
      .then(resultado => {
        const actualizado = resultado.rows[0];
        return new Producto(
          actualizado.codigo,
          actualizado.nombre,
          actualizado.descripcion,
          actualizado.cantidad,
          actualizado.stock,
          actualizado.precio,
          actualizado.proveedor,
          actualizado.id_categoria,
          actualizado.imagen,
          actualizado.fecha_ingreso
        );
      });
  }

  // Eliminar producto por código
  static eliminar(codigo) {
    return pool.query("SELECT * FROM productos WHERE codigo = $1", [codigo])
      .then(resultado => {
        if (resultado.rows.length === 0) {
          const error = new Error("Producto no encontrado");
          error.codigo = "PRODUCTO_NO_EXISTE";
          throw error;
        }
        return pool.query("DELETE FROM productos WHERE codigo = $1 RETURNING *", [codigo]);
      })
      .then(resultado => {
        const eliminado = resultado.rows[0];
        return new Producto(
          eliminado.codigo,
          eliminado.nombre,
          eliminado.descripcion,
          eliminado.cantidad,
          eliminado.stock,
          eliminado.precio,
          eliminado.proveedor,
          eliminado.id_categoria,
          eliminado.imagen,
          eliminado.fecha_ingreso
        );
      });
  }
}

module.exports = ProductoService;
