const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const bcrypt = require('bcrypt'); 
const transporter = require('../../config/email');

// Regex para validar contraseñas seguras
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const solicitarReset = async (req, res) => {
  try {
    const { correo } = req.body;
    if (!correo) return res.status(400).json({ error: "El correo es requerido" });

    // Buscar usuario en tabla usuarios
    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });

    // Generar código
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60000); // 15 minutos

    // Guardar en usuario_login
    const ok = await RecuperarService.guardarCodigoReset(usuario.id, codigo, expira);
    if (!ok) return res.status(500).json({ error: "No se pudo generar el código de recuperación" });

    // Enviar correo
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

    // Validar código en usuario_login
    const valido = await RecuperarService.validarCodigoReset(usuario.id, codigo);
    if (!valido) {
      return res.status(400).json({ error: "Código inválido o expirado" });
    }

    // Validar seguridad de la contraseña
    if (!passwordRegex.test(nuevaPassword)) {
      return res.status(400).json({ 
        error: "La contraseña no cumple los requisitos de seguridad: mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" 
      });
    }

    // Hashear y actualizar contraseña
    const hash = await bcrypt.hash(nuevaPassword, 10);
    await UsuarioService.actualizar(usuario.correo, { passwordHash: hash });

    // Limpiar código de recuperación
    await RecuperarService.limpiarCodigoReset(usuario.id);

    res.json({ mensaje: "Contraseña restablecida con éxito" });
  } catch (error) {
    console.error("Error resetConCodigo:", error);
    res.status(500).json({ error: `Error al restablecer contraseña: ${error.message}` });
  }
};

module.exports = {
  solicitarReset,
  resetConCodigo,
};
