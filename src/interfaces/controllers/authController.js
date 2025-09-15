const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');

const { loginAttempt, isBlocked } = require("../middlewares/loginAttempts");


const loginUsuario = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) 
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });

    // Buscar usuario
    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    // Verificar bloqueo usando middleware
    if (await isBlocked(usuario.id)) {
      return res.status(403).json({ error: `Cuenta bloqueada hasta ${usuario.blocked_until}` });
    }

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecto) {
      await loginAttempt(usuario); // Incrementa intentos y bloquea si es necesario
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    await UsuarioService.actualizarLogin(usuario.id, { failed_attempts: 0, blocked_until: null });


    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respuesta exitosa
    res.json({ 
      mensaje: "Inicio de sesión exitoso", 
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        nombre: usuario.nombre,
        app: usuario.app,
        apm: usuario.apm,
        telefono: usuario.telefono,
        estado: usuario.estado
      },
      token
    });

  } catch (error) {
    res.status(500).json({ error: `Error al iniciar sesión: ${error.message}` });
  }
};




module.exports = {
  loginUsuario
};
