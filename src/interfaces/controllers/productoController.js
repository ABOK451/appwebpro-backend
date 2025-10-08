const errorResponse = require('../../helpers/errorResponse');
const ProductoService = require('../../application/productoService');

// Crear producto
const crearProducto = (req, res) => {
  const { nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen } = req.body;

  if (!nombre || !codigo)
    return res.status(200).json(errorResponse("DATOS_INCOMPLETOS", "Faltan datos obligatorios", null, 2));

  ProductoService.crear({ nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen })
    .then(producto => res.json({ codigo: 0, mensaje: "Producto creado correctamente", producto }))
    .catch(error => {
      console.error("Error al crear producto:", error);
      if (error.codigo === "CODIGO_DUPLICADO") {
        return res.status(200).json(errorResponse("CODIGO_DUPLICADO", error.message, null, 2));
      }
      return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al crear producto", error.message, 3));
    });
};

// Listar productos
const listarProductos = (req, res) => {
  ProductoService.listar()
    .then(productos => res.json({ codigo: 0, mensaje: "Listado de productos", productos }))
    .catch(error => res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al listar productos", error.message, 3)));
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
