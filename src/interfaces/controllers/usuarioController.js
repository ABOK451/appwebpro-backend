const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt');
const errorResponse = require('../../helpers/errorResponse');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/;
const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validarTelefono = (telefono) => {
  if (!telefono) return false;
  telefono = telefono.trim().replace(/\s+/g, '');
  return /^\+52\d{10}$/.test(telefono);
};


const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.listar();
    res.json({ mensaje: "Usuarios listados con éxito", usuarios, codigo: 0 });
  } catch (error) {
    res.status(200).json(errorResponse("ERROR_LISTAR", "Error al listar usuarios", error.message, 3));
  }
};

const crearUsuario = async (req, res) => {
  try {
    let { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;

    nombre = nombre ? nombre.trim() : nombre;
    app = app ? app.trim() : app;
    apm = apm ? apm.trim() : apm;
    correo = correo ? correo.trim() : correo;
    telefono = telefono ? telefono.trim() : telefono;

    const errores = [];

    if (!correo) errores.push({ codigo: "FALTA_CORREO", mensaje: "Correo es obligatorio" });
    if (!password) errores.push({ codigo: "FALTA_PASSWORD", mensaje: "Contraseña es obligatoria" });
    if (!rol) errores.push({ codigo: "FALTA_ROL", mensaje: "Rol es obligatorio" });
    if (!estado) errores.push({ codigo: "FALTA_ESTADO", mensaje: "Estado es obligatorio" });
    if (!nombre) errores.push({ codigo: "FALTA_NOMBRE", mensaje: "Nombre es obligatorio" });
    if (!telefono) errores.push({ codigo: "FALTA_TELEFONO", mensaje: "Teléfono es obligatorio" });

    if (correo && !correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo no es válido" });
    if (telefono && !validarTelefono(telefono)) errores.push({ codigo: "TELEFONO_INVALIDO", mensaje: "El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890" });
    if (password && !passwordRegex.test(password)) errores.push({ codigo: "PASSWORD_INVALIDA", mensaje: "La contraseña debe tener mínimo 8 caracteres, incluir al menos una mayúscula, una minúscula, un número y un carácter especial" });
    if (nombre && !nombreRegex.test(nombre)) errores.push({ codigo: "NOMBRE_INVALIDO", mensaje: "El nombre solo puede contener letras y espacios entre nombres" });
    if (app && !nombreRegex.test(app)) errores.push({ codigo: "APP_INVALIDO", mensaje: "El apellido paterno solo puede contener letras y espacios" });
    if (apm && !nombreRegex.test(apm)) errores.push({ codigo: "APM_INVALIDO", mensaje: "El apellido materno solo puede contener letras y espacios" });

    if (rol && typeof rol !== 'string') errores.push({ codigo: "ROL_INVALIDO", mensaje: "El rol solo puede contener texto" });
    if (estado && typeof estado !== 'string') errores.push({ codigo: "ESTADO_INVALIDO", mensaje: "El estado solo puede contener texto" });

    if (errores.length > 0) {
      return res.status(200).json(errorResponse("ERRORES_VALIDACION", "Errores de validación", errores, 2));
    }

    const nuevoUsuario = await UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono });
    res.status(200).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario, codigo: 0 });
  } catch (error) {
    if (error.code === '23505' && error.detail && error.detail.includes('correo')) {
      return res.status(200).json(errorResponse("CORREO_DUPLICADO", "El correo ya existe, no se puede repetir", null, 2));
    }
    res.status(200).json(errorResponse("ERROR_CREAR", "Error al crear usuario", error.message, 3));
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { correo } = req.body;
    const errores = [];

    if (!correo) errores.push({ codigo: "FALTA_CORREO", mensaje: "El correo es requerido para eliminar un usuario" });
    else if (!correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo no tiene un formato válido" });

    if (errores.length > 0) {
      return res.status(200).json(errorResponse("ERRORES_VALIDACION", "Errores de validación", errores, 2));
    }

    const usuarioEliminado = await UsuarioService.eliminar({ correo });
    if (!usuarioEliminado) {
      return res.status(200).json(errorResponse("NO_ENCONTRADO", `Usuario con correo ${correo} no encontrado`, null, 3));
    }

    res.json({ mensaje: `Usuario ${usuarioEliminado.nombre} eliminado con éxito`, codigo: 0 });

  } catch (error) {
    res.status(200).json(errorResponse("ERROR_ELIMINAR", "Error al eliminar usuario", error.message, 3));
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    let { correo, password, telefono, nombre, app, apm, rol, estado } = req.body;

    correo = correo ? correo.trim() : correo;
    telefono = telefono ? telefono.trim() : telefono;
    nombre = nombre ? nombre.trim() : nombre;
    app = app ? app.trim() : app;
    apm = apm ? apm.trim() : apm;
    rol = rol ? rol.trim() : rol;
    estado = estado ? estado.trim() : estado;

    if (!correo) {
      return res.status(200).json(errorResponse(
        "FALTA_CORREO",
        "El correo del usuario a actualizar es requerido",
        null,
        2
      ));
    }

    const errores = [];

    if (correo && !correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo no es válido" });
    if (password && !passwordRegex.test(password)) errores.push({ codigo: "PASSWORD_INVALIDA", mensaje: "La contraseña debe tener mínimo 8 caracteres, incluir al menos una mayúscula, una minúscula, un número y un carácter especial" });
    if (nombre && !nombreRegex.test(nombre)) errores.push({ codigo: "NOMBRE_INVALIDO", mensaje: "El nombre solo puede contener letras y espacios" });
    if (app && !nombreRegex.test(app)) errores.push({ codigo: "APP_INVALIDO", mensaje: "El apellido paterno solo puede contener letras y espacios" });
    if (apm && !nombreRegex.test(apm)) errores.push({ codigo: "APM_INVALIDO", mensaje: "El apellido materno solo puede contener letras y espacios" });
    if (telefono && !validarTelefono(telefono)) errores.push({ codigo: "TELEFONO_INVALIDO", mensaje: "El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890" });

    if (rol && typeof rol !== 'string') errores.push({ codigo: "ROL_INVALIDO", mensaje: "El rol solo puede contener texto" });
    if (estado && typeof estado !== 'string') errores.push({ codigo: "ESTADO_INVALIDO", mensaje: "El estado solo puede contener texto" });

    if (errores.length > 0) {
      return res.status(200).json(errorResponse(
        "ERRORES_VALIDACION",
        "Errores de validación",
        errores,
        2
      ));
    }

    const datosActualizar = {};

    if (password) datosActualizar.password = await bcrypt.hash(password, 10);
    if (nombre) datosActualizar.nombre = nombre;
    if (app) datosActualizar.app = app;
    if (apm) datosActualizar.apm = apm;
    if (telefono) datosActualizar.telefono = telefono;
    if (rol) datosActualizar.rol = rol;
    if (estado) datosActualizar.estado = estado;

    const usuarioActualizado = await UsuarioService.actualizar(correo, datosActualizar);
    if (!usuarioActualizado) {
      return res.status(200).json(errorResponse(
        "NO_ENCONTRADO",
        `Usuario con correo ${correo} no encontrado`,
        null,
        3
      ));
    }

    res.json({ mensaje: "Usuario actualizado con éxito", usuario: usuarioActualizado, codigo: 0 });

  } catch (error) {
    res.status(200).json(errorResponse("ERROR_ACTUALIZAR", "Error al actualizar usuario", error.message, 3));
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario
};
