const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await UsuarioService.listar();
    res.json({ mensaje: "Usuarios listados con éxito", usuarios });
  } catch (error) {
    res.status(500).json({ error: `Error al listar usuarios: ${error.message}` });
  }
};

const mostrarFormulario = (req, res) => {
  res.json({
    mensaje: "Para crear un usuario, envía un POST a /usuarios/nuevo con nombre, correo, password, rol, estado, teléfono"
  });
};

const crearUsuario = async (req, res) => {
  try {
    const { correo, password, rol, estado, nombre, app, apm, telefono } = req.body;

    if (!correo || !password || !rol || !estado || !nombre || !telefono) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: "El correo no es válido" });
    }
    if (!/^\+\d{1,3}\d{10}$/.test(telefono)) {
      return res.status(400).json({ error: "El teléfono debe incluir código de país y 10 dígitos, ejemplo +521234567890" });
    }
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial" });
    }

    const nuevoUsuario = await UsuarioService.crear({ correo, password, rol, estado, nombre, app, apm, telefono });
    res.status(201).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario });
  } catch (error) {
    res.status(400).json({ error: `Error al crear usuario: ${error.message}` });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido para eliminar un usuario" });

    const usuarioEliminado = await UsuarioService.eliminar({ correo });
    if (!usuarioEliminado) {
      return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });
    }

    res.json({ mensaje: `Usuario con correo ${usuarioEliminado.correo} eliminado con éxito` });
  } catch (error) {
    res.status(500).json({ error: `Error al eliminar usuario: ${error.message}` });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo del usuario a actualizar es requerido" });

    const datos = req.body;

    // Validaciones opcionales al actualizar
    if (datos.telefono && !/^\+\d{1,3}\d{10}$/.test(datos.telefono)) {
      return res.status(400).json({ error: "El teléfono debe incluir código de país y 10 dígitos" });
    }
    if (datos.password && !passwordRegex.test(datos.password)) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial" });
    }

    const usuarioActualizado = await UsuarioService.actualizar(correo, datos);
    if (!usuarioActualizado) {
      return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });
    }

    res.json({ mensaje: "Usuario actualizado con éxito", usuario: usuarioActualizado });
  } catch (error) {
    res.status(500).json({ error: `Error al actualizar usuario: ${error.message}` });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) return res.status(400).json({ error: "Correo y contraseña son requeridos" });

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecto) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET || 'mi_secreto_jwt',
      { expiresIn: '1h' }
    );

    res.json({
      mensaje: "Login exitoso",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: `Error al iniciar sesión: ${error.message}` });
  }
};

const recuperarPassword = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido para recuperar contraseña" });

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo },
      process.env.JWT_SECRET || 'mi_secreto_jwt',
      { expiresIn: '15m' }
    );

    res.json({ mensaje: "Token de recuperación generado con éxito", token });
  } catch (error) {
    res.status(500).json({ error: `Error al generar token de recuperación: ${error.message}` });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, correo, nuevaPassword } = req.body;
    if (!token || !correo || !nuevaPassword) 
      return res.status(400).json({ error: "Token, correo y nueva contraseña son requeridos" });

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(nuevaPassword)) {
      return res.status(400).json({ 
        error: "La nueva contraseña debe tener mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_jwt');

    if (decoded.correo !== correo) {
      return res.status(401).json({ error: "El token no coincide con el correo proporcionado" });
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(nuevaPassword, saltRounds);
    await UsuarioService.actualizar(correo, { passwordHash: hash });

    res.json({ mensaje: "Contraseña restablecida con éxito" });
  } catch (error) {
    res.status(400).json({ error: `Error al restablecer contraseña: ${error.message}` });
  }
};



module.exports = {
  listarUsuarios,
  mostrarFormulario,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario,
  loginUsuario,
  recuperarPassword,
  resetPassword
};
