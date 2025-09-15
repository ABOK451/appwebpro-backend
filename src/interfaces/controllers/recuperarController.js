const UsuarioService = require('../../application/usuarioService');
const bcrypt = require('bcrypt'); 
const transporter = require('../../config/email');


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
  solicitarReset,
  resetConCodigo,
};
