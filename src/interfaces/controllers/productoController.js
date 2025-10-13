const errorResponse = require('../../helpers/errorResponse');
const ProductoService = require('../../application/productoService');

const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.,-]+$/;
const regexDescripcion = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.,;:()'"-]+$/;

// Crear producto
const crearProducto = (req, res) => {
  const {
    nombre, codigo, descripcion, cantidad, stock,
    precio, proveedor, id_categoria, categoria_nombre, imagen
  } = req.body;

  const errores = [];

  // --- VALIDACIONES DE DATOS ---
  if (!nombre || !codigo)
    errores.push("El nombre y el código son obligatorios.");

  if (nombre && !regexNombre.test(nombre))
    errores.push("El nombre no debe contener caracteres especiales.");

  if (descripcion && !regexDescripcion.test(descripcion))
    errores.push("La descripción contiene caracteres no permitidos.");

  if (cantidad == null)
    errores.push("La cantidad no debe ser nula.");

  if (precio == null)
    errores.push("El precio no debe ser nulo.");

  if (stock == null)
    errores.push("El stock no debe ser nulo.");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("VALIDACION_FALLIDA", "Errores de validación", errores, 2));

  // Validar existencia de categoría antes del insert
  ProductoService.validarCategoria(id_categoria)
    .then(categoria => {
      if (!categoria)
        throw { codigo: "CATEGORIA_NO_EXISTE", message: `No existe la categoría con ID ${id_categoria}` };

      // Verificar que coincida el nombre de la categoría
      if (categoria_nombre && categoria_nombre !== categoria.nombre)
        throw { codigo: "CATEGORIA_INCORRECTA", message: `El nombre de la categoría no coincide con el ID (${categoria.nombre})` };

      // Crear producto
      return ProductoService.crear({
        nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen
      });
    })
    .then(producto => {
      res.json({ codigo: 0, mensaje: "Producto creado correctamente", producto });
    })
    .catch(error => {
      console.error("Error al crear producto:", error);

      if (error.codigo === "CODIGO_DUPLICADO") {
        return res.status(200).json(errorResponse("CODIGO_DUPLICADO", "Ya existe un producto con ese código.", null, 2));
      }

      if (error.codigo === "CATEGORIA_NO_EXISTE") {
        return res.status(200).json(errorResponse("CATEGORIA_NO_EXISTE", error.message, null, 2));
      }

      if (error.codigo === "CATEGORIA_INCORRECTA") {
        return res.status(200).json(errorResponse("CATEGORIA_INCORRECTA", error.message, null, 2));
      }

      if (error.codigo === "VALIDACION_FALLIDA") {
        return res.status(200).json(errorResponse("VALIDACION_FALLIDA", "Errores de validación", error.message, 2));
      }

      return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al crear producto", error.message, 3));
    });
};

// Listar productos
const listarProductos = (req, res) => {
  ProductoService.listar()
    .then(productos => {
      res.json({ codigo: 0, mensaje: "Listado de productos", productos });
    })
    .catch(error => {
      console.error("Error al listar productos:", error);
      res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al listar productos", error.message, 3));
    });
};


// Actualizar producto por código
const actualizarProducto = (req, res) => {
  const { codigo } = req.params;
  const { nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen } = req.body;

  ProductoService.actualizar(codigo, { nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen })
    .then(producto => res.json({ codigo: 0, mensaje: "Producto actualizado correctamente", producto }))
    .catch(error => {
      console.error("Error al actualizar producto:", error);
      if (error.codigo === "PRODUCTO_NO_EXISTE") {
        return res.status(200).json(errorResponse("PRODUCTO_NO_EXISTE", error.message, null, 2));
      }
      return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al actualizar producto", error.message, 3));
    });
};

// Eliminar producto por código
const eliminarProducto = (req, res) => {
  const { codigo } = req.params;

  ProductoService.eliminar(codigo)
    .then(producto => res.json({ codigo: 0, mensaje: "Producto eliminado correctamente", producto }))
    .catch(error => {
      console.error("Error al eliminar producto:", error);
      if (error.codigo === "PRODUCTO_NO_EXISTE") {
        return res.status(200).json(errorResponse("PRODUCTO_NO_EXISTE", error.message, null, 2));
      }
      return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al eliminar producto", error.message, 3));
    });
};

module.exports = {
  crearProducto,
  listarProductos,
  actualizarProducto,
  eliminarProducto,
};
