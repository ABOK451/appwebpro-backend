const errorResponse = require('../../helpers/errorResponse');
const ProductoService = require('../../application/productoService');

const regexCodigo = /^[A-Za-z0-9_-]+$/;
const regexNombre = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.,-]+$/;
const regexDescripcion = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.,;:()'"-]+$/;
const regexProveedor = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s.,-]+$/;

// ---------------------------------------------------------------------
// CREAR PRODUCTO
// ---------------------------------------------------------------------
const crearProducto = (req, res) => {
  const {
    nombre, codigo, descripcion, cantidad, stock,
    precio, proveedor, id_categoria, categoria_nombre, imagen
  } = req.body;

  const errores = [];

  if (!nombre) errores.push({ campo: "nombre", mensaje: "El nombre es obligatorio." });
  if (!codigo) errores.push({ campo: "codigo", mensaje: "El código es obligatorio." });
  if (codigo && !regexCodigo.test(codigo)) errores.push({ campo: "codigo", mensaje: "El código no debe contener caracteres especiales." });
  if (nombre && !regexNombre.test(nombre)) errores.push({ campo: "nombre", mensaje: "El nombre contiene caracteres no permitidos." });
  if (descripcion && !regexDescripcion.test(descripcion)) errores.push({ campo: "descripcion", mensaje: "La descripción contiene caracteres no permitidos." });
  if (cantidad == null || isNaN(cantidad) || Number(cantidad) < 0) errores.push({ campo: "cantidad", mensaje: "La cantidad debe ser un número igual o mayor a 0." });
  if (stock == null || isNaN(stock) || Number(stock) < 0) errores.push({ campo: "stock", mensaje: "El stock debe ser un número igual o mayor a 0." });
  if (precio == null || isNaN(precio) || Number(precio) < 0) errores.push({ campo: "precio", mensaje: "El precio debe ser un número válido y mayor o igual a 0." });
  if (!proveedor) errores.push({ campo: "proveedor", mensaje: "El proveedor es obligatorio." });
  if (proveedor && !regexProveedor.test(proveedor)) errores.push({ campo: "proveedor", mensaje: "El proveedor contiene caracteres no permitidos." });
  if (!id_categoria) errores.push({ campo: "id_categoria", mensaje: "El id_categoria es obligatorio." });

  if (errores.length > 0) 
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  ProductoService.validarCategoria(id_categoria)
    .then(categoria => {
      if (!categoria) throw { mensaje: `No existe la categoría con ID ${id_categoria}` };
      if (categoria_nombre && categoria_nombre !== categoria.nombre)
        throw { mensaje: `El nombre de la categoría no coincide con el ID (${categoria.nombre})` };

      return ProductoService.crear({
        nombre, codigo, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen
      });
    })
    .then(producto => res.json({ codigo: 0, mensaje: "Producto creado correctamente", producto }))
    .catch(error => {
      if (Array.isArray(error.detalle))
        return res.status(200).json(errorResponse("Errores de validación", error.detalle, 2));

      const msg = error.mensaje || "Error al crear producto";
      res.status(200).json(errorResponse(msg, null, 3));
    });
};

// ---------------------------------------------------------------------
// LISTAR PRODUCTOS
// ---------------------------------------------------------------------
const listarProductos = (req, res) => {
  ProductoService.listar()
    .then(productos => {
      res.status(200).json({
        codigo: 0,
        mensaje: "Listado de productos",
        productos,
      });
    })
    .catch(error => {
      console.error(error);
      res.status(500).json({
        codigo: 1,
        mensaje: "Error al listar productos",
      });
    });
};

const listarPorCampo = (req, res) => {
  const { nombre, categoria, proveedor } = req.body;

  if (!nombre && !categoria && !proveedor) {
    return res.status(400).json({
      codigo: 2,
      error: { mensaje: "Debe enviar al menos un campo para filtrar", detalle: null }
    });
  }

  ProductoService.listarPorCampos({ nombre, categoria, proveedor })
    .then(productos => {
      res.json({
        codigo: 0,
        mensaje: "Productos filtrados correctamente",
        productos
      });
    })
    .catch(error => {
      res.status(500).json({
        codigo: 3,
        error: { mensaje: "Error al filtrar productos", detalle: error.message }
      });
    });
};




// ---------------------------------------------------------------------
// ACTUALIZAR PRODUCTO
// ---------------------------------------------------------------------
const actualizarProducto = (req, res) => {
  const { codigo, nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen } = req.body;
  const errores = [];

  if (!codigo) errores.push("El código es obligatorio.");
  if (codigo && !regexCodigo.test(codigo)) errores.push("El código no debe contener caracteres especiales.");
  if (nombre && !regexNombre.test(nombre)) errores.push("El nombre contiene caracteres no permitidos.");
  if (descripcion && !regexDescripcion.test(descripcion)) errores.push("La descripción contiene caracteres no permitidos.");
  if (cantidad == null) errores.push("La cantidad no debe ser nula.");
  if (stock == null) errores.push("El stock no debe ser nulo.");
  if (precio == null) errores.push("El precio no debe ser nulo.");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  ProductoService.actualizar(codigo, { nombre, descripcion, cantidad, stock, precio, proveedor, id_categoria, imagen })
    .then(({ producto, alertaBajoStock }) => {
      res.json({
        codigo: 0,
        mensaje: "Producto actualizado correctamente",
        producto,
        alertaBajoStock
      });
    })
    .catch(error => {
      const msg = error.mensaje || "Error al actualizar producto";
      res.status(200).json(errorResponse(msg, null, 3));
    });
};

// ---------------------------------------------------------------------
// ELIMINAR PRODUCTO
// ---------------------------------------------------------------------
const eliminarProducto = (req, res) => {
  const { codigo } = req.body;
  const errores = [];

  if (!codigo) errores.push("El código es obligatorio.");
  if (codigo && !regexCodigo.test(codigo)) errores.push("El código no debe contener caracteres especiales.");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  ProductoService.eliminar(codigo)
    .then(producto => res.json({ codigo: 0, mensaje: "Producto eliminado correctamente", producto }))
    .catch(error => {
      const msg = error.mensaje || "Error al eliminar producto";
      res.status(200).json(errorResponse(msg, null, 3));
    });
};

module.exports = {
  crearProducto,
  listarProductos,
  actualizarProducto,
  eliminarProducto,
  listarPorCampo
};
