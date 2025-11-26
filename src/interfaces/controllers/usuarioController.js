const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt');
const errorResponse = require('../../helpers/errorResponse');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/;
const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Longitudes
const MIN_NOMBRE = 2, MAX_NOMBRE = 50;
const MIN_CORREO = 5, MAX_CORREO = 100;
const MAX_PASSWORD = 100;
const MIN_ROL = 4, MAX_ROL = 10;
const MIN_ESTADO = 4, MAX_ESTADO = 10;

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
    .catch(error => {
      console.error("[LISTAR_USUARIOS] Error:", error);

      if (error.code === 'ECONNREFUSED')
        return res.status(200).json(errorResponse("Error de conexión a la base de datos", null, 7));

      if (error.code === 'ETIMEDOUT')
        return res.status(200).json(errorResponse("Tiempo de espera agotado al listar usuarios", null, 8));

      return res.status(200).json(errorResponse("Error al listar usuarios", error.message, 5));
    });
};

const crearUsuario = (req, res) => {
  let { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;

  correo = correo?.trim();
  nombre = nombre?.trim();
  app = app?.trim();
  apm = apm?.trim();
  telefono = telefono?.trim();
  rol = rol?.trim();
  estado = estado?.trim();

  const errores = [];

  // -------- Validaciones de campos requeridos --------
  if (!correo) errores.push("Correo es obligatorio");
  if (!password) errores.push("Contraseña es obligatoria");
  if (!rol) errores.push("Rol es obligatorio");
  if (!estado) errores.push("Estado es obligatorio");
  if (!nombre) errores.push("Nombre es obligatorio");
  if (!telefono) errores.push("Teléfono es obligatorio");

  // -------- Validaciones de formato --------
  if (correo && !correoRegex.test(correo)) errores.push("El correo no es válido");

  // -------- Longitudes --------
  if (correo && (correo.length < MIN_CORREO || correo.length > MAX_CORREO))
    errores.push(`El correo debe tener entre ${MIN_CORREO} y ${MAX_CORREO} caracteres`);

  if (password && password.length > MAX_PASSWORD)
    errores.push(`La contraseña no puede superar los ${MAX_PASSWORD} caracteres`);

  if (nombre && (nombre.length < MIN_NOMBRE || nombre.length > MAX_NOMBRE))
    errores.push(`El nombre debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (app && (app.length < MIN_NOMBRE || app.length > MAX_NOMBRE))
    errores.push(`El apellido paterno debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (apm && (apm.length < MIN_NOMBRE || apm.length > MAX_NOMBRE))
    errores.push(`El apellido materno debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (rol && (rol.length < MIN_ROL || rol.length > MAX_ROL))
    errores.push(`El rol debe tener entre ${MIN_ROL} y ${MAX_ROL} caracteres`);

  if (estado && (estado.length < MIN_ESTADO || estado.length > MAX_ESTADO))
    errores.push(`El estado debe tener entre ${MIN_ESTADO} y ${MAX_ESTADO} caracteres`);

  // -------- Regex existentes --------
  if (telefono && !validarTelefono(telefono))
    errores.push("El teléfono debe incluir código +52 y 10 dígitos");

  if (password && !passwordRegex.test(password))
    errores.push("La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y símbolo");

  if (nombre && !nombreRegex.test(nombre))
    errores.push("El nombre solo puede contener letras y espacios");
  if (app && !nombreRegex.test(app))
    errores.push("El apellido paterno solo puede contener letras y espacios");
  if (apm && !nombreRegex.test(apm))
    errores.push("El apellido materno solo puede contener letras y espacios");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono })
    .then(nuevoUsuario =>
      res.status(200).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario, codigo: 0 })
    )
    .catch(error => {
      console.error("[CREAR_USUARIO] Error:", error);

      // Violación de clave única
      if (error.code === '23505')
        return res.status(200).json(errorResponse("El correo ya existe, no se puede repetir", null, 2));

      // Error de conexión
      if (error.code === 'ECONNREFUSED')
        return res.status(200).json(errorResponse("Error de conexión a la base de datos", null, 7));

      // Timeout
      if (error.code === 'ETIMEDOUT')
        return res.status(200).json(errorResponse("Tiempo de espera agotado al crear usuario", null, 8));

      // Error sintaxis SQL
      if (error.code === '42601')
        return res.status(200).json(errorResponse("Error en la sintaxis SQL", null, 9));

      return res.status(200).json(errorResponse("Error al crear usuario", error.message, 5));
    });
};

const eliminarUsuario = (req, res) => {
  const { correo } = req.body;
  const errores = [];

  if (!correo) errores.push("El correo es requerido para eliminar un usuario");
  else if (!correoRegex.test(correo)) errores.push("El correo no tiene un formato válido");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  UsuarioService.eliminar({ correo })
    .then(usuarioEliminado => {
      if (!usuarioEliminado)
        return res.status(200).json(errorResponse(`Usuario con correo ${correo} no encontrado`, null, 3));

      res.json({ mensaje: `Usuario ${usuarioEliminado.nombre} eliminado con éxito`, codigo: 0 });
    })
    .catch(error => {
      console.error("[ELIMINAR_USUARIO] Error:", error);

      if (error.code === 'ECONNREFUSED')
        return res.status(200).json(errorResponse("Error de conexión a la base de datos", null, 7));

      if (error.code === 'ETIMEDOUT')
        return res.status(200).json(errorResponse("Tiempo de espera agotado al eliminar usuario", null, 8));

      return res.status(200).json(errorResponse("Error al eliminar usuario", error.message, 5));
    });
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

  if (!correo)
    return res.status(200).json(errorResponse("El correo del usuario a actualizar es requerido", null, 2));

  const errores = [];

  // -------- Longitudes --------
  if (correo && (correo.length < MIN_CORREO || correo.length > MAX_CORREO))
    errores.push(`El correo debe tener entre ${MIN_CORREO} y ${MAX_CORREO} caracteres`);

  if (password && password.length > MAX_PASSWORD)
    errores.push(`La contraseña no puede superar los ${MAX_PASSWORD} caracteres`);

  if (nombre && (nombre.length < MIN_NOMBRE || nombre.length > MAX_NOMBRE))
    errores.push(`El nombre debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (app && (app.length < MIN_NOMBRE || app.length > MAX_NOMBRE))
    errores.push(`El apellido paterno debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (apm && (apm.length < MIN_NOMBRE || apm.length > MAX_NOMBRE))
    errores.push(`El apellido materno debe tener entre ${MIN_NOMBRE} y ${MAX_NOMBRE} caracteres`);

  if (rol && (rol.length < MIN_ROL || rol.length > MAX_ROL))
    errores.push(`El rol debe tener entre ${MIN_ROL} y ${MAX_ROL} caracteres`);

  if (estado && (estado.length < MIN_ESTADO || estado.length > MAX_ESTADO))
    errores.push(`El estado debe tener entre ${MIN_ESTADO} y ${MAX_ESTADO} caracteres`);

  // -------- Regex existentes --------
  if (correo && !correoRegex.test(correo)) errores.push("El correo no es válido");
  if (password && !passwordRegex.test(password)) errores.push("La contraseña no cumple requisitos");
  if (telefono && !validarTelefono(telefono)) errores.push("Teléfono inválido, debe ser +521234567890");

  if (nombre && !nombreRegex.test(nombre)) errores.push("El nombre solo puede contener letras");
  if (app && !nombreRegex.test(app)) errores.push("El apellido paterno solo puede contener letras");
  if (apm && !nombreRegex.test(apm)) errores.push("El apellido materno solo puede contener letras");

  if (errores.length > 0)
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  const datosActualizar = {};
  const hashPromise = password ?
    bcrypt.hash(password, 10).then(hash => { datosActualizar.password = hash; })
    : Promise.resolve();

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
      if (!usuarioActualizado)
        return res.status(200).json(errorResponse(`Usuario con correo ${correo} no encontrado`, null, 3));

      res.json({ mensaje: "Usuario actualizado con éxito", usuario: usuarioActualizado, codigo: 0 });
    })
    .catch(error => {
      console.error("[ACTUALIZAR_USUARIO] Error:", error);

      if (error.code === 'ECONNREFUSED')
        return res.status(200).json(errorResponse("Error de conexión a la base de datos", null, 7));

      if (error.code === 'ETIMEDOUT')
        return res.status(200).json(errorResponse("Tiempo de espera agotado al actualizar usuario", null, 8));

      if (error.code === '23505')
        return res.status(200).json(errorResponse("El correo ya existe, no se puede usar ese correo", null, 2));

      return res.status(200).json(errorResponse("Error al actualizar usuario", error.message, 5));
    });
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario
};
