const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const bcrypt = require('bcrypt'); 
const transporter = require('../../config/email');
const errorResponse = require('../../helpers/errorResponse');

const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const solicitarReset = async (req, res) => {
  try {
    const { correo } = req.body;
    const errores = [];

    if (!correo) errores.push({ codigo: "FALTA_CORREO", mensaje: "El correo es requerido" });
    else if (!correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo no tiene un formato válido" });

    if (errores.length > 0) return res.status(200).json(errorResponse("ERRORES_VALIDACION", "Errores de validación", errores, 2));

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(200).json(errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3));

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60000); 

    const ok = await RecuperarService.guardarCodigoReset(usuario.id, codigo, expira);
    if (!ok) return res.status(200).json(errorResponse("ERROR_GENERAR_CODIGO", "No se pudo generar el código de recuperación", null, 3));

    await transporter.sendMail({
      from: `"Soporte App" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: "Recuperación de contraseña",
      text: `Tu código de recuperación es: ${codigo}. Válido por 15 minutos.`,
      html: `<p>Hola ${usuario.nombre},</p>
             <p>Tu código de recuperación es: <b>${codigo}</b></p>
             <p>Válido por 15 minutos.</p>`
    });

    res.json({ mensaje: "Código de verificación enviado al correo", codigo: 0 });
  } catch (error) {
    console.error("Error solicitarReset:", error);
    res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al generar código", error.message, 3));
  }
};

const resetConCodigo = async (req, res) => {
  try {
    const { correo, codigo, nuevaPassword } = req.body;
    const errores = [];

    if (!correo) errores.push({ codigo: "FALTA_CORREO", mensaje: "El correo es requerido" });
    else if (!correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo no tiene un formato válido" });

    if (!codigo) errores.push({ codigo: "FALTA_CODIGO", mensaje: "El código es requerido" });
    if (!nuevaPassword) errores.push({ codigo: "FALTA_PASSWORD", mensaje: "La nueva contraseña es requerida" });
    else if (!passwordRegex.test(nuevaPassword)) errores.push({ 
      codigo: "PASSWORD_INVALIDA", 
      mensaje: "La contraseña no cumple los requisitos: mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" 
    });

    if (errores.length > 0) return res.status(200).json(errorResponse("ERRORES_VALIDACION", "Errores de validación", errores, 2));

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(200).json(errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3));

    const valido = await RecuperarService.validarCodigoReset(usuario.id, codigo);
    if (!valido) return res.status(200).json(errorResponse("CODIGO_INVALIDO", "Código inválido o expirado", null, 2));

    const hash = await bcrypt.hash(nuevaPassword, 10);
    await UsuarioService.actualizar(usuario.correo, { passwordHash: hash });
    await RecuperarService.limpiarCodigoReset(usuario.id);

    res.json({ mensaje: "Contraseña restablecida con éxito", codigo: 0 });
  } catch (error) {
    console.error("Error resetConCodigo:", error);
    res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al restablecer contraseña", error.message, 3));
  }
};

module.exports = {
  solicitarReset,
  resetConCodigo,
};
