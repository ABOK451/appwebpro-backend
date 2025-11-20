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

const listarUsuarios = (req, res) => {
  UsuarioService.listar()
    .then(usuarios => {
      res.json({
        mensaje: "Usuarios listados con éxito",
        codigo: 0,
        token: req.tokenExtendido || null,
        tiempo_restante_min: req.tiempoRestanteMin || null,
        usuarios
      });
    })
    .catch(error => res.status(200).json(
      errorResponse("Error al listar usuarios", error.message, 5) // 5 = error servidor
    ));
};

const crearUsuario = (req, res) => {
  let { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;

  correo = correo?.trim();
  nombre = nombre?.trim();
  app = app?.trim();
  apm = apm?.trim();
  telefono = telefono?.trim();

  const errores = [];

  if (!correo) errores.push("Correo es obligatorio");
  if (!password) errores.push("Contraseña es obligatoria");
  if (!rol) errores.push("Rol es obligatorio");
  if (!estado) errores.push("Estado es obligatorio");
  if (!nombre) errores.push("Nombre es obligatorio");
  if (!telefono) errores.push("Teléfono es obligatorio");

  if (correo && !correoRegex.test(correo)) errores.push("El correo no es válido");
  if (telefono && !validarTelefono(telefono)) errores.push("El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890");
  if (password && !passwordRegex.test(password)) errores.push("La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial");
  if (nombre && !nombreRegex.test(nombre)) errores.push("El nombre solo puede contener letras y espacios");
  if (app && !nombreRegex.test(app)) errores.push("El apellido paterno solo puede contener letras y espacios");
  if (apm && !nombreRegex.test(apm)) errores.push("El apellido materno solo puede contener letras y espacios");

  if (rol && typeof rol !== 'string') errores.push("El rol solo puede contener texto");
  if (estado && typeof estado !== 'string') errores.push("El estado solo puede contener texto");

  if (errores.length > 0) {
    return res.status(200).json(errorResponse("Errores de validación", errores, 2)); // 2 = validación
  }

  UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono })
  .then(nuevoUsuario => res.status(200).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario, codigo: 0 }))
  .catch(error => {
    if (error.code === '23505' && error.detail?.includes('correo')) {
      return res.status(200).json(errorResponse("El correo ya existe, no se puede repetir", null, 2));
    }
    res.status(200).json(errorResponse("Error al crear usuario", error.message, 5));
  });

};

const eliminarUsuario = (req, res) => {
  const { correo } = req.body;
  const errores = [];

  if (!correo) errores.push("El correo es requerido para eliminar un usuario");
  else if (!correoRegex.test(correo)) errores.push("El correo no tiene un formato válido");

  if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  UsuarioService.eliminar({ correo })
    .then(usuarioEliminado => {
      if (!usuarioEliminado) return res.status(200).json(errorResponse(`Usuario con correo ${correo} no encontrado`, null, 3));
      res.json({ mensaje: `Usuario ${usuarioEliminado.nombre} eliminado con éxito`, codigo: 0 });
    })
    .catch(error => res.status(200).json(errorResponse("Error al eliminar usuario", error.message, 5)));
};

const actualizarUsuario = (req, res) => {
  let { correo, password, telefono, nombre, app, apm, rol, estado } = req.body;

  correo = correo?.trim();
  nombre = nombre?.trim();
  app = app?.trim();
  apm = apm?.trim();
  telefono = telefono?.trim();
  rol = rol?.trim();
  estado = estado?.trim();

  if (!correo) return res.status(200).json(errorResponse("El correo del usuario a actualizar es requerido", null, 2));

  const errores = [];

  if (correo && !correoRegex.test(correo)) errores.push("El correo no es válido");
  if (password && !passwordRegex.test(password)) errores.push("La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial");
  if (nombre && !nombreRegex.test(nombre)) errores.push("El nombre solo puede contener letras y espacios");
  if (app && !nombreRegex.test(app)) errores.push("El apellido paterno solo puede contener letras y espacios");
  if (apm && !nombreRegex.test(apm)) errores.push("El apellido materno solo puede contener letras y espacios");
  if (telefono && !validarTelefono(telefono)) errores.push("El teléfono debe incluir código de país y exactamente 10 dígitos, ej: +521234567890");
  if (rol && typeof rol !== 'string') errores.push("El rol solo puede contener texto");
  if (estado && typeof estado !== 'string') errores.push("El estado solo puede contener texto");

  if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  const datosActualizar = {};
  const hashPromise = password ? bcrypt.hash(password, 10).then(hash => { datosActualizar.password = hash; }) : Promise.resolve();

  hashPromise
    .then(() => {
      if (nombre) datosActualizar.nombre = nombre;
      if (app) datosActualizar.app = app;
      if (apm) datosActualizar.apm = apm;
      if (telefono) datosActualizar.telefono = telefono;
      if (rol) datosActualizar.rol = rol;
      if (estado) datosActualizar.estado = estado;

      return UsuarioService.actualizar(correo, datosActualizar);
    })
    .then(usuarioActualizado => {
      if (!usuarioActualizado) return res.status(200).json(errorResponse(`Usuario con correo ${correo} no encontrado`, null, 3));
      res.json({ mensaje: "Usuario actualizado con éxito", usuario: usuarioActualizado, codigo: 0 });
    })
    .catch(error => res.status(200).json(errorResponse("Error al actualizar usuario", error.message, 5)));
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario
};
