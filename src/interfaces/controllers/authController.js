const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const AuthService = require('../../application/authService');
const { obtenerUbicacionIP } = require('../../infrastructure/utils/geolocation');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const transporter = require('../../config/email');
const { loginAttempt, isBlocked } = require("../middlewares/loginAttempts");
const errorResponse = require('../../helpers/errorResponse');
const dns = require('dns');

const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const codigoRegex = /^\d+$/;

const hayInternet = () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => resolve(!err));
  });
};

const loginUsuario = async (req, res) => {
  try {
    const { correo, password } = req.body;
    const errores = [];
    

    if (!correo) errores.push({ codigo: "FALTA_CORREO", mensaje: "Correo es requerido" });
    if (!password) errores.push({ codigo: "FALTA_PASSWORD", mensaje: "Contraseña es requerida" });

    if (correo && typeof correo !== 'string') errores.push({ codigo: "TIPO_INVALIDO_CORREO", mensaje: "Correo debe ser texto" });
    if (password && typeof password !== 'string') errores.push({ codigo: "TIPO_INVALIDO_PASSWORD", mensaje: "Contraseña debe ser texto" });

    if (correo && correo.trim() === "") errores.push({ codigo: "VACIO_CORREO", mensaje: "Correo no puede estar vacío" });
    if (password && password.trim() === "") errores.push({ codigo: "VACIO_PASSWORD", mensaje: "Contraseña no puede estar vacía" });

    // Validaciones de formato
    if (correo && !correoRegex.test(correo)) errores.push({ codigo: "CORREO_INVALIDO", mensaje: "El correo debe tener un formato válido, ejemplo: usuario@dominio.com" });
    if (password && !passwordRegex.test(password)) errores.push({ codigo: "PASSWORD_INVALIDA", mensaje: "La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });

    if (errores.length > 0) return res.status(200).json(errorResponse("ERRORES_VALIDACION", "Errores de validación", errores, 2));

    const usuario = await UsuarioService.buscarPorCorreo(correo);
    if (!usuario) return res.status(200).json(errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3));

    if (await isBlocked(usuario.id)) {
      return res.status(200).json(errorResponse("CUENTA_BLOQUEADA", `Cuenta bloqueada hasta ${usuario.blocked_until}`, null, 3));
    }

    const passwordCorrecto = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecto) {
      await loginAttempt(usuario);
      return res.status(200).json(errorResponse("CONTRASENA_INCORRECTA", "Contraseña incorrecta", null, 2));
    }

    await UsuarioService.actualizarLogin(usuario.id, { failed_attempts: 0, blocked_until: null });

    const ipParaPrueba = req.ip === "::1" ? "8.8.8.8" : req.ip;
    const ubicacion = await obtenerUbicacionIP(ipParaPrueba);

    if (ubicacion && ubicacion.lat && ubicacion.lng) {
      await AuthService.guardarUbicacion(usuario.id, ubicacion.lat, ubicacion.lng);
    } else {
      console.warn("No se pudo obtener ubicación para el usuario:", usuario.correo);
    }


    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 5 * 60000);
    await RecuperarService.guardarCodigoReset(usuario.id, codigo, expira);

    const internet = await hayInternet();

    if (internet) {
      await transporter.sendMail({
        from: `"Soporte App" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: "Código de verificación 2FA",
        text: `Tu código de autenticación es: ${codigo}. Válido por 5 minutos.`,
        html: `<p>Hola ${usuario.nombre},</p>
               <p>Tu código de autenticación es: <b>${codigo}</b></p>
               <p>Válido por 5 minutos.</p>`
      });
      return res.json({ mensaje: "Código de verificación enviado", codigo: 0 });
    } else {
      console.log(`[OFFLINE MODE] Código OTP para ${correo}: ${codigo}`);
      return res.json({
        mensaje: "Código de verificación generado en modo offline",
        otp: codigo,
        codigo: 0
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(200).json(errorResponse("ERROR_SERVIDOR", "Error al iniciar sesión", error.message, 3));
  }
};

const verificarCodigo = async (req, res) => {
  try {
    const { correo, codigo } = req.body;
    let errores = [];

    // --- Validaciones ---
    if (!correo) {
      errores.push(errorResponse("FALTA_CORREO", "El correo es requerido", null, 2).error);
    } else {
      const correoSanitizado = (correo || "").trim().toLowerCase();
      if (!correoRegex.test(correoSanitizado)) {
        errores.push(errorResponse("CORREO_INVALIDO", "El correo no tiene un formato válido", null, 2).error);
      }
    }

    if (!codigo) {
      errores.push(errorResponse("FALTA_CODIGO", "El código es requerido", null, 2).error);
    } else if (!codigoRegex.test(codigo)) {
      errores.push(errorResponse("CODIGO_INVALIDO", "El código debe ser numérico", null, 2).error);
    }

    // Si hubo errores de validación, responder de inmediato
    if (errores.length > 0) {
      return res.status(200).json({
        codigo: 2,
        errores
      });
    }

    // Sanitizar correo ya validado
    const correoSanitizado = correo.trim().toLowerCase();

    // Buscar usuario
    const usuario = await UsuarioService.buscarPorCorreo(correoSanitizado);
    if (!usuario) {
      return res.status(200).json(
        errorResponse("NO_ENCONTRADO", "Usuario no encontrado", null, 3)
      );
    }

    // Validar código OTP
    const valido = await RecuperarService.validarCodigoReset(usuario.id, codigo);
    if (!valido) {
      return res.status(200).json(
        errorResponse("CODIGO_INVALIDO", "Código inválido o expirado", null, 2)
      );
    }

    // Limpiar código usado
    await RecuperarService.limpiarCodigoReset(usuario.id);

    // Generar token
    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    const expiracionToken = new Date(Date.now() + 5 * 60000);
    await UsuarioService.guardarToken(usuario.id, token, expiracionToken);

    return res.json({
      mensaje: "Autenticación exitosa",
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
        nombre: usuario.nombre
      },
      codigo: 0
    });

  } catch (error) {
    console.error("Error verificarCodigo:", error);
    return res.status(200).json(
      errorResponse("ERROR_SERVIDOR", `Error al verificar código: ${error.message}`, null, 3)
    );
  }
};


module.exports = {
  loginUsuario,
  verificarCodigo
};
