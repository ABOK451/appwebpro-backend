const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService'); 
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const transporter = require('../../config/email'); // si usas correo


const loginUsuario = async (req, res) => {
  try {
    const { correo, password } = req.body;
    if (!correo || !password) 
      return res.status(400).json({ error: "Correo y contraseña son requeridos" });

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    console.log("Password en DB:", usuario.password);
    console.log("Password recibido:", password);

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    

    if (!passwordCorrecto) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 5 * 60000); // 5 minutos válido

    
    await RecuperarService.guardarCodigoReset(usuario.id, codigo, expira);

    
    await transporter.sendMail({
      from: `"Soporte App" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "Código de verificación 2FA",
      text: `Tu código de autenticación es: ${codigo}. Válido por 5 minutos.`,
      html: `<p>Hola ${usuario.nombre},</p>
             <p>Tu código de autenticación es: <b>${codigo}</b></p>
             <p>Válido por 5 minutos.</p>`
    });

    
    res.json({ mensaje: "Código de verificación enviado" });

  } catch (error) {
    res.status(500).json({ error: `Error al iniciar sesión: ${error.message}` });
  }
};


const verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;
    if (!correo || !codigo) 
      return res.status(400).json({ error: "Correo y código son requeridos" });

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    const valido = await RecuperarService.validarCodigoReset(usuario.id, codigo);
    if (!valido) return res.status(400).json({ error: "Código inválido o expirado" });

    
    await RecuperarService.limpiarCodigoReset(usuario.id);

    
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      mensaje: "Autenticación exitosa",
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        nombre: usuario.nombre
      }
    });

  } catch (error) {
    res.status(500).json({ error: `Error al verificar código: ${error.message}` });
  }
};

module.exports = {
  loginUsuario,
  verificarCodigo
};
