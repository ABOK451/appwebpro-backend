const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');
const transporter = require('../../config/email'); 
require('dotenv').config();

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const nombreRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

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
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });
    }
    if (!nombreRegex.test(nombre)) {
      return res.status(400).json({ error: "El nombre solo puede contener letras (con acentos permitidos) y espacios, sin números ni caracteres especiales" });
    }
    if (app && !nombreRegex.test(app)) {
      return res.status(400).json({ error: "El apellido paterno solo puede contener letras (con acentos permitidos), sin números ni caracteres especiales" });
    }
    if (apm && !nombreRegex.test(apm)) {
      return res.status(400).json({ error: "El apellido materno solo puede contener letras (con acentos permitidos), sin números ni caracteres especiales" });
    }

    const hash = await bcrypt.hash(password, 10);
    const nuevoUsuario = await UsuarioService.crear({ correo, password: hash, rol, estado, nombre, app, apm, telefono });
    res.status(201).json({ mensaje: "Usuario creado con éxito", usuario: nuevoUsuario });
    
  } catch (error) {
    // Captura el error de clave duplicada de PostgreSQL
    if (error.code === '23505' && error.detail && error.detail.includes('correo')) {
      return res.status(400).json({ error: "El correo ya existe, no se puede repetir" });
    }

    res.status(400).json({ error: `Error al crear usuario: ${error.message}` });
  }
};


const eliminarUsuario = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido para eliminar un usuario" });

    const usuarioEliminado = await UsuarioService.eliminar({ correo });
    if (!usuarioEliminado) return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });

    res.json({ mensaje: `Usuario ${usuarioEliminado.nombre} eliminado con éxito` });
  } catch (error) {
    res.status(500).json({ error: `Error al eliminar usuario: ${error.message}` });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { correo, password, telefono, nombre, app, apm } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo del usuario a actualizar es requerido" });

    if (telefono && !/^\+\d{1,3}\d{10}$/.test(telefono)) {
      return res.status(400).json({ error: "El teléfono debe incluir código de país y 10 dígitos" });
    }
    if (password && !passwordRegex.test(password)) {
      return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });
    }
    if (nombre && !nombreRegex.test(nombre)) {
      return res.status(400).json({ error: "El nombre no debe contener números ni caracteres especiales" });
    }
    if (app && !nombreRegex.test(app)) {
      return res.status(400).json({ error: "El apellido paterno no debe contener números ni caracteres especiales" });
    }
    if (apm && !nombreRegex.test(apm)) {
      return res.status(400).json({ error: "El apellido materno no debe contener números ni caracteres especiales" });
    }

    const datosActualizar = { ...req.body };
    if (password) datosActualizar.password = await bcrypt.hash(password, 10);

    const usuarioActualizado = await UsuarioService.actualizar(correo, datosActualizar);
    if (!usuarioActualizado) return res.status(404).json({ error: `Usuario con correo ${correo} no encontrado` });

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

const solicitarReset = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido" });

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60000); // 15 minutos

    const usuarioActualizado = await UsuarioService.actualizar(correo, { reset_code: codigo, reset_expires: expira });
    if (!usuarioActualizado) return res.status(500).json({ error: "No se pudo actualizar el código de recuperación" });

    await transporter.sendMail({
      from: `"Soporte App" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "Recuperación de contraseña",
      text: `Tu código de recuperación es: ${codigo}. Válido por 15 minutos.`,
      html: `<p>Hola ${usuario.nombre},</p>
            <p>Tu código de recuperación es: <b>${codigo}</b></p>
            <p>Válido por 15 minutos.</p>`
    });

    res.json({ mensaje: "Código de verificación enviado al correo" });
  } catch (error) {
    console.error("Error solicitarReset:", error);
    res.status(500).json({ error: `Error al generar código: ${error.message}` });
  }
};

const resetConCodigo = async (req, res) => {
  try {
    const { correo, codigo, nuevaPassword } = req.body;
    if (!correo || !codigo || !nuevaPassword) {
      return res.status(400).json({ error: "Correo, código y nueva contraseña son requeridos" });
    }

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    if (
      !usuario.reset_code ||
      usuario.reset_code.toString().trim() !== codigo.toString().trim() ||
      new Date() > new Date(usuario.reset_expires)
    ) {
      return res.status(400).json({ error: "Código inválido o expirado" });
    }

    if (!passwordRegex.test(nuevaPassword)) {
      return res.status(400).json({ error: "La contraseña no cumple los requisitos de seguridad: La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });
    }

    const hash = await bcrypt.hash(nuevaPassword, 10);

    const usuarioActualizado = await UsuarioService.actualizar(correo, {
      passwordHash: hash,    
      reset_code: null,
      reset_expires: null
    });

    if (!usuarioActualizado) {
      return res.status(500).json({ error: "No se pudo actualizar la contraseña" });
    }

    res.json({ mensaje: "Contraseña restablecida con éxito" });
  } catch (error) {
    console.error("Error resetConCodigo:", error);
    res.status(500).json({ error: `Error al restablecer contraseña: ${error.message}` });
  }
};

module.exports = {
  listarUsuarios,
  mostrarFormulario,
  crearUsuario,
  eliminarUsuario,
  actualizarUsuario,
  loginUsuario,
  solicitarReset,
  resetConCodigo
};
