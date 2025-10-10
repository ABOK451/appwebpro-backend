const BitacoraService = require('../../application/inventarioService');
const errorResponse = require('../../helpers/errorResponse');

const BitacoraController = {

  // Crear registro
  crear(req, res) {
    const { id_producto, tipo_movimiento, cantidad, descripcion } = req.body;
    const errores = [];

    // Validaciones de formato y obligatoriedad
    if (id_producto === undefined || id_producto === null) {
      errores.push({ campo: "id_producto", mensaje: "El campo id_producto es obligatorio" });
    } else if (isNaN(id_producto) || Number(id_producto) <= 0) {
      errores.push({ campo: "id_producto", mensaje: "id_producto debe ser un número entero positivo" });
    }

    if (!tipo_movimiento) {
      errores.push({ campo: "tipo_movimiento", mensaje: "El campo tipo_movimiento es obligatorio" });
    } else if (!['entrada', 'salida'].includes(tipo_movimiento)) {
      errores.push({ campo: "tipo_movimiento", mensaje: "tipo_movimiento debe ser 'entrada' o 'salida'" });
    }

    if (cantidad === undefined || cantidad === null) {
      errores.push({ campo: "cantidad", mensaje: "El campo cantidad es obligatorio" });
    } else if (isNaN(cantidad) || Number(cantidad) <= 0) {
      errores.push({ campo: "cantidad", mensaje: "cantidad debe ser un número entero positivo" });
    }

    if (descripcion && typeof descripcion !== 'string') {
      errores.push({ campo: "descripcion", mensaje: "descripcion debe ser un texto" });
    }

    if (errores.length > 0) {
      return res.status(400).json(
        errorResponse("VALIDACION_DATOS", "Errores en los campos enviados", errores)
      );
    }

    BitacoraService.registrar({ 
      id_producto: Number(id_producto), 
      tipo_movimiento, 
      cantidad: Number(cantidad), 
      descripcion 
    })
      .then(data => res.status(201).json({ mensaje: "Registro agregado a bitácora", data }))
      .catch(err => res.status(500).json(
        errorResponse("ERROR_INTERNO", "Error al registrar en bitácora", err.message)
      ));
  },

  // Listar todos
  listar(req, res) {
    BitacoraService.listar()
      .then(data => res.status(200).json(data))
      .catch(err => res.status(500).json(
        errorResponse("ERROR_INTERNO", "Error al listar bitácora", err.message)
      ));
  },

  // Actualizar
  actualizar(req, res) {
    const { id, tipo_movimiento, cantidad, descripcion } = req.body;
    const errores = [];

    if (!id) {
      errores.push({ campo: "id", mensaje: "El campo id es obligatorio" });
    } else if (isNaN(id) || Number(id) <= 0) {
      errores.push({ campo: "id", mensaje: "id debe ser un número entero positivo" });
    }

    if (tipo_movimiento && !['entrada', 'salida'].includes(tipo_movimiento)) {
      errores.push({ campo: "tipo_movimiento", mensaje: "tipo_movimiento debe ser 'entrada' o 'salida'" });
    }

    if (cantidad !== undefined && (isNaN(cantidad) || Number(cantidad) <= 0)) {
      errores.push({ campo: "cantidad", mensaje: "cantidad debe ser un número entero positivo" });
    }

    if (descripcion !== undefined && typeof descripcion !== 'string') {
      errores.push({ campo: "descripcion", mensaje: "descripcion debe ser un texto" });
    }

    if (errores.length > 0) {
      return res.status(400).json(
        errorResponse("VALIDACION_DATOS", "Errores en los campos enviados", errores)
      );
    }

    BitacoraService.actualizar({ 
      id: Number(id), 
      tipo_movimiento, 
      cantidad: cantidad ? Number(cantidad) : undefined, 
      descripcion 
    })
      .then(data => {
        if (!data) {
          return res.status(404).json(
            errorResponse("NO_ENCONTRADO", "Registro no encontrado")
          );
        }
        res.status(200).json({ mensaje: "Registro actualizado", data });
      })
      .catch(err => res.status(500).json(
        errorResponse("ERROR_INTERNO", "Error al actualizar bitácora", err.message)
      ));
  },

  // Eliminar
  eliminar(req, res) {
    const { id } = req.body;
    const errores = [];

    if (!id) {
      errores.push({ campo: "id", mensaje: "El campo id es obligatorio" });
    } else if (isNaN(id) || Number(id) <= 0) {
      errores.push({ campo: "id", mensaje: "id debe ser un número entero positivo" });
    }

    if (errores.length > 0) {
      return res.status(400).json(
        errorResponse("VALIDACION_DATOS", "Errores en los campos enviados", errores)
      );
    }

    BitacoraService.eliminar({ id: Number(id) })
      .then(data => {
        if (!data) {
          return res.status(404).json(
            errorResponse("NO_ENCONTRADO", "Registro no encontrado")
          );
        }
        res.status(200).json({ mensaje: "Registro eliminado", data });
      })
      .catch(err => res.status(500).json(
        errorResponse("ERROR_INTERNO", "Error al eliminar registro", err.message)
      ));
  }

};

module.exports = BitacoraController;
