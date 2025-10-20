const BitacoraService = require('../../application/inventarioService');
const errorResponse = require('../../helpers/errorResponse');

const BitacoraController = {

  crear(req, res) {
  const { id_producto, tipo_movimiento, cantidad, descripcion } = req.body;
  const errores = [];

  if (!id_producto) errores.push({ campo: "id_producto", mensaje: "El campo id_producto es obligatorio" });
  if (id_producto && typeof id_producto !== 'string')
    errores.push({ campo: "id_producto", mensaje: "id_producto debe ser un texto válido (código de producto)" });

  if (!tipo_movimiento) errores.push({ campo: "tipo_movimiento", mensaje: "El campo tipo_movimiento es obligatorio" });
  if (tipo_movimiento && !['entrada', 'salida'].includes(tipo_movimiento))
    errores.push({ campo: "tipo_movimiento", mensaje: "tipo_movimiento debe ser 'entrada' o 'salida'" });

  if (cantidad === undefined || cantidad === null)
    errores.push({ campo: "cantidad", mensaje: "El campo cantidad es obligatorio" });

  if (cantidad !== undefined && (isNaN(cantidad) || Number(cantidad) <= 0))
    errores.push({ campo: "cantidad", mensaje: "cantidad debe ser un número entero positivo" });

  if (descripcion) {
    if (typeof descripcion !== 'string')
      errores.push({ campo: "descripcion", mensaje: "descripcion debe ser un texto" });
    else {
      const regexDescripcion = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.,;:()¿?!¡\s-]+$/;
      if (!regexDescripcion.test(descripcion))
        errores.push({ campo: "descripcion", mensaje: "descripcion contiene caracteres no permitidos" });
    }
  }

  if (errores.length > 0) 
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  ProductoService.obtenerPorId(id_producto)
    .then(producto => {
      if (!producto) {
        throw { msg: "Producto no encontrado", code: 3 };
      }

      const stockTotal = producto.stock;
      let stockActual = producto.cantidad;

      if (tipo_movimiento === 'salida') {
        if (cantidad > stockActual) {
          throw { msg: "No hay suficiente stock para esta salida", code: 2 };
        }

        stockActual -= Number(cantidad);

        return ProductoService.actualizarCantidad(id_producto, stockActual)
          .then(() => ({ producto, stockActual, stockTotal }));
      }

      return { producto, stockActual, stockTotal };
    })
    .then(({ producto, stockActual, stockTotal }) => {

      const limiteBajo = Math.ceil(stockTotal * 0.1);
      if (stockActual <= limiteBajo) {
        console.log(`⚠️ Alerta: Stock bajo para ${producto.nombre} (${stockActual}/${stockTotal})`);

        const transporter = require('../../config/email');
        const mailOptions = {
          from: 'tu_correo@gmail.com',
          to: 'destinatario@correo.com',
          subject: `⚠ Stock bajo: ${producto.nombre}`,
          text: `El producto ${producto.nombre} tiene solo ${stockActual} unidades disponibles (stock máximo ${stockTotal}).`
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("❌ Error enviando correo:", error);
          } else {
            console.log("✅ Correo enviado:", info.response);
          }
        });

      }

      return BitacoraService.registrar({
        id_producto,
        tipo_movimiento,
        cantidad: Number(cantidad),
        descripcion
      });
    })
    .then(data => {
      res.json({ codigo: 0, mensaje: "Registro agregado a bitácora", data });
    })
    .catch(err => {
      console.error(err);
      const codigo = err.code || 3;
      res.status(200).json(errorResponse(err.msg || "Error al registrar en bitácora", err.message || null, codigo));
    });
},


  listar(req, res) {
    BitacoraService.listar()
      .then(data => res.json({ codigo: 0, mensaje: "Listado de bitácora", data }))
      .catch(err => res.status(200).json(errorResponse("Error al listar bitácora", err.message, 3)));
  },

  actualizar(req, res) {
    const { id, tipo_movimiento, cantidad, descripcion } = req.body;
    const errores = [];

    if (!id) errores.push({ campo: "id", mensaje: "El campo id es obligatorio" });
    if (id !== undefined && (isNaN(id) || Number(id) <= 0)) errores.push({ campo: "id", mensaje: "id debe ser un número entero positivo" });

    if (tipo_movimiento && !['entrada', 'salida'].includes(tipo_movimiento))
      errores.push({ campo: "tipo_movimiento", mensaje: "tipo_movimiento debe ser 'entrada' o 'salida'" });

    if (cantidad !== undefined && (isNaN(cantidad) || Number(cantidad) <= 0))
      errores.push({ campo: "cantidad", mensaje: "cantidad debe ser un número entero positivo" });

    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string') errores.push({ campo: "descripcion", mensaje: "descripcion debe ser un texto" });
      else {
        const regexDescripcion = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.,;:()¿?!¡\s-]+$/;
        if (!regexDescripcion.test(descripcion))
          errores.push({ campo: "descripcion", mensaje: "descripcion contiene caracteres no permitidos" });
      }
    }

    if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

    BitacoraService.actualizar({ 
      id: Number(id), 
      tipo_movimiento, 
      cantidad: cantidad ? Number(cantidad) : undefined, 
      descripcion 
    })
      .then(data => {
        if (!data) return res.status(200).json(errorResponse("Registro no encontrado", null, 2));
        res.json({ codigo: 0, mensaje: "Registro actualizado", data });
      })
      .catch(err => res.status(200).json(errorResponse("Error al actualizar bitácora", err.message, 3)));
  },

  eliminar(req, res) {
    const { id } = req.body;
    const errores = [];

    if (!id) errores.push({ campo: "id", mensaje: "El campo id es obligatorio" });
    if (id !== undefined && (isNaN(id) || Number(id) <= 0)) errores.push({ campo: "id", mensaje: "id debe ser un número entero positivo" });

    if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

    BitacoraService.eliminar({ id: Number(id) })
      .then(data => {
        if (!data) return res.status(200).json(errorResponse("Registro no encontrado", null, 2));
        res.json({ 
          codigo: 0, 
          mensaje: "Registro eliminado", 
          data: {
            id: data.id,
            codigo_producto: data.codigo_producto,
            tipo_movimiento: data.tipo_movimiento,
            cantidad: data.cantidad,
            descripcion: data.descripcion,
            id_usuario: data.id_usuario,
            fecha: data.fecha
          }
        });
      })
      .catch(err => res.status(200).json(errorResponse("Error al eliminar registro", err.message, 3)));
  }

};

module.exports = BitacoraController;
