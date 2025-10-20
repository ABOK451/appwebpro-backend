const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const bcrypt = require('bcrypt'); 
const dns = require('dns');
const transporter = require('../../config/email');
const errorResponse = require('../../helpers/errorResponse');

const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const hayInternet = () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => resolve(!err));
  });
};

const solicitarReset = (req, res) => {
  const { correo } = req.body;
  const errores = [];

  if (!correo) errores.push({ mensaje: "El correo es requerido" });
  else if (!correoRegex.test(correo)) errores.push({ mensaje: "El correo no tiene un formato válido" });

  if (errores.length > 0) {
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));
  }

  UsuarioService.buscarPorCorreo(correo)
    .then(usuario => {
      if (!usuario) return res.status(200).json(errorResponse("Usuario no encontrado", null, 3));

      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const expira = new Date(Date.now() + 5 * 60000); // 5 minutos

      return RecuperarService.guardarCodigoReset(usuario.id, codigo, expira)
        .then(ok => {
          if (!ok) return res.status(200).json(errorResponse("No se pudo generar el código de recuperación", null, 3));

          return hayInternet().then(internet => {
            if (internet) {
              return transporter.sendMail({
                from: `"Soporte App" <${process.env.EMAIL_USER}>`,
                to: correo,
                subject: "Recuperación de contraseña",
                text: `Tu código de recuperación es: ${codigo}. Válido por 5 minutos.`,
                html: `<p>Hola ${usuario.nombre},</p>
                       <p>Tu código de recuperación es: <b>${codigo}</b></p>
                       <p>Válido por 5 minutos.</p>`
              }).then(() => res.json({ mensaje: "Código de verificación enviado al correo", codigo: 0 }));
            } else {
              console.log(`[OFFLINE MODE] Código OTP para ${correo}: ${codigo}`);
              return res.json({ mensaje: "Código de verificación generado en modo offline", otp: codigo, codigo: 0 });
            }
          });
        });
    })
    .catch(error => {
      console.error("Error solicitarReset:", error);
      res.status(200).json(errorResponse("Error al generar código", error.message, 3));
    });
};

const resetConCodigo = (req, res) => {
  const { correo, codigo, nuevaPassword } = req.body;
  const correoSanitizado = (correo || "").toString().trim().toLowerCase();
  const codigoRegex = /^\d{6}$/;
  const errores = [];

  if (!correo) errores.push({ mensaje: "El correo es requerido" });
  else if (!correoRegex.test(correoSanitizado)) errores.push({ mensaje: "El correo no tiene un formato válido" });

  if (!codigo && codigo !== 0) errores.push({ mensaje: "El código es requerido" });
  else if (codigo && !codigoRegex.test(String(codigo).trim())) errores.push({ mensaje: "El código debe ser numérico y de 6 dígitos" });

  if (!nuevaPassword) errores.push({ mensaje: "La nueva contraseña es requerida" });
  else if (!passwordRegex.test(nuevaPassword)) errores.push({
    mensaje: "La contraseña no cumple los requisitos: mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial"
  });

  if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  UsuarioService.buscarPorCorreo(correoSanitizado)
    .then(usuario => {
      if (!usuario) return res.status(200).json(errorResponse("Usuario no encontrado", null, 3));

      return RecuperarService.validarCodigoReset(usuario.id, String(codigo).trim())
        .then(valido => {
          if (!valido) return res.status(200).json(errorResponse("Código inválido o expirado", null, 2));

          return bcrypt.hash(nuevaPassword, 10)
            .then(hash => UsuarioService.actualizar(usuario.correo, { passwordHash: hash }))
            .then(() => RecuperarService.limpiarCodigoReset(usuario.id))
            .then(() => res.json({ mensaje: "Contraseña restablecida con éxito", codigo: 0 }));
        });
    })
    .catch(error => {
      console.error("Error resetConCodigo:", error);
      return res.status(200).json(errorResponse("Error al restablecer contraseña", error.message, 3));
    });
};

module.exports = {
  solicitarReset,
  resetConCodigo,
};
