const UsuarioService = require('../../application/usuarioService');
const RecuperarService = require('../../application/recuperarService');
const AuthService = require('../../application/authService');
const { obtenerUbicacionIP } = require('../../infrastructure/utils/geolocation');
const bcrypt = require('bcrypt');
const pool = require('../../infrastructure/db');
const jwt = require('jsonwebtoken');
const transporter = require('../../config/email');
const { loginAttempt, isBlocked } = require("../middlewares/loginAttempts");
const errorResponse = require('../../helpers/errorResponse');
const dns = require('dns');

const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const codigoRegex = /^\d+$/;

const hayInternet = () => new Promise(resolve => dns.lookup('google.com', err => resolve(!err)));

const loginUsuario = (req, res) => {
  const { correo, password } = req.body;
  const errores = [];

  console.log(`[LOGIN] Intento de login recibido para correo: ${correo}`);
  console.log(`[LOGIN] Contraseña recibida (tipo: ${typeof password}):`, password ? `[longitud: ${password.length}, inicia con: "${password.slice(0, 3)}..."]` : password);

  if (!correo) errores.push({ campo: "correo", mensaje: "Correo es requerido" });
  if (!password) errores.push({ campo: "password", mensaje: "Contraseña es requerida" });

  if (correo && typeof correo !== 'string') errores.push({ campo: "correo", mensaje: "Correo debe ser texto" });
  if (password && typeof password !== 'string') errores.push({ campo: "password", mensaje: "Contraseña debe ser texto" });

  if (correo && correo.trim() === "") errores.push({ campo: "correo", mensaje: "Correo no puede estar vacío" });
  if (password && password.trim() === "") errores.push({ campo: "password", mensaje: "Contraseña no puede estar vacía" });

  if (correo && !correoRegex.test(correo)) errores.push({ campo: "correo", mensaje: "El correo debe tener un formato válido" });
  if (password && !passwordRegex.test(password)) errores.push({ campo: "password", mensaje: "Contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial" });

  if (errores.length > 0) {
    console.log(`[LOGIN] Validación fallida para ${correo}:`, errores);
    return res.status(200).json(errorResponse("Errores de validación", errores, 2));
  }

  console.log(`[LOGIN] Validación exitosa para ${correo}. Buscando usuario en DB...`);

  UsuarioService.buscarPorCorreo(correo)
    .then(usuario => {
      if (!usuario) {
        console.log(`[LOGIN] Usuario no encontrado: ${correo}`);
        return res.status(200).json(errorResponse("Usuario no encontrado", null, 3));
      }

      console.log(`[LOGIN] Usuario encontrado: ${usuario.id} - ${usuario.nombre}. Verificando bloqueo...`);
      return isBlocked(usuario.id)
        .then(bloqueado => {
          if (bloqueado) {
            console.log(`[LOGIN] Cuenta bloqueada para usuario ${usuario.id} hasta ${usuario.blocked_until}`);
            return res.status(200).json(errorResponse(`Cuenta bloqueada hasta ${usuario.blocked_until}`, null, 3));
          }

          console.log(`[LOGIN] Verificando contraseña para usuario ${usuario.id}...`);
          console.log(`[LOGIN] Contraseña en texto plano (usuario) → [longitud: ${password.length}, inicia con: "${password.slice(0, 3)}..."]`);
          console.log(`[LOGIN] Contraseña almacenada (hash o texto) → ${usuario.password.slice(0, 15)}...`);

          // 🔍 Detectar si la contraseña guardada no está hasheada
          if (!usuario.password.startsWith("$2b$")) {
            console.log(`[LOGIN] ⚠️ Contraseña no hasheada detectada para usuario ${usuario.id}`);

            if (usuario.password === password) {
              console.log(`[LOGIN] Contraseña coincide en texto plano. Hasheando y actualizando en DB...`);
              const hash = bcrypt.hashSync(password, 10);

              return UsuarioService.actualizarLogin(usuario.id, { password: hash })
                .then(() => {
                  console.log(`[LOGIN] Contraseña actualizada correctamente en la base de datos para usuario ${usuario.id}`);
                  // Comparar nuevamente usando el hash recién generado
                  return bcrypt.compare(password, hash);
                })
                .then(passwordCorrecto => {
                  console.log(`[LOGIN] Resultado comparación post-hash: ${passwordCorrecto}`);
                  return manejarResultadoPassword(passwordCorrecto, usuario, req, res);
                })
                .catch(error => {
                  console.error(`[LOGIN] Error al actualizar contraseña para usuario ${usuario.id}:`, error);
                  return res.status(200).json(errorResponse("Error al actualizar contraseña", error.message, 3));
                });
            } else {
              console.log(`[LOGIN] ❌ Contraseña en texto plano no coincide. Fallo de autenticación.`);
              return loginAttempt(usuario).then(() =>
                res.status(200).json(errorResponse("Contraseña incorrecta", null, 2))
              );
            }
          }

          // Si ya está hasheada, comparar normalmente
          return bcrypt.compare(password, usuario.password)
            .then(passwordCorrecto => {
              console.log(`[LOGIN] Resultado comparación bcrypt: ${passwordCorrecto}`);
              return manejarResultadoPassword(passwordCorrecto, usuario, req, res);
            });
        });
    })
    .catch(error => {
      console.error(`[LOGIN] Error loginUsuario para ${correo}:`, error);
      return res.status(200).json(errorResponse("Error al iniciar sesión", error.message, 3));
    });
};

// 🔧 Manejador cuando ya se sabe si la contraseña fue correcta
function manejarResultadoPassword(passwordCorrecto, usuario, req, res) {
  if (!passwordCorrecto) {
    console.log(`[LOGIN] ❌ Contraseña incorrecta para usuario ${usuario.id}`);
    return loginAttempt(usuario).then(() =>
      res.status(200).json(errorResponse("Contraseña incorrecta", null, 2))
    );
  }

  console.log(`[LOGIN] ✅ Contraseña correcta. Reseteando intentos fallidos para usuario ${usuario.id}`);
  return UsuarioService.actualizarLogin(usuario.id, { failed_attempts: 0, blocked_until: null })
    .then(() => {
      const ipParaPrueba = req.ip === "::1" ? "8.8.8.8" : req.ip;
      console.log(`[LOGIN] Obteniendo ubicación por IP: ${ipParaPrueba}`);

      return obtenerUbicacionIP(ipParaPrueba)
        .then(ubicacion => {
          if (ubicacion?.lat && ubicacion?.lng) {
            console.log(`[LOGIN] Ubicación obtenida: lat=${ubicacion.lat}, lng=${ubicacion.lng}. Guardando...`);
            return AuthService.guardarUbicacion(usuario.id, ubicacion.lat, ubicacion.lng);
          } else {
            console.log(`[LOGIN] No se obtuvo ubicación para ${usuario.id}`);
          }
        })
        .then(() => {
          const codigo = Math.floor(100000 + Math.random() * 900000).toString();
          const expira = new Date(Date.now() + 5 * 60000);
          console.log(`[LOGIN] Generando código 2FA para usuario ${usuario.id}: ${codigo} (expira: ${expira})`);

          return RecuperarService.guardarCodigoReset(usuario.id, codigo, expira)
            .then(() => hayInternet().then(internet => {
              if (internet) {
                console.log(`[LOGIN] Enviando correo 2FA a ${usuario.correo}`);
                return transporter.sendMail({
                  from: `"Soporte App" <${process.env.EMAIL_USER}>`,
                  to: usuario.correo,
                  subject: "Código de verificación 2FA",
                  text: `Tu código de autenticación es: ${codigo}. Válido por 5 minutos.`,
                  html: `<p>Hola ${usuario.nombre},</p>
                         <p>Tu código de autenticación es: <b>${codigo}</b></p>
                         <p>Válido por 5 minutos.</p>`
                }).then(() => {
                  console.log(`[LOGIN] Correo 2FA enviado correctamente a ${usuario.correo}`);
                  res.json({ mensaje: "Código de verificación enviado", codigo: 0 });
                });
              } else {
                console.log(`[OFFLINE MODE] Código OTP para ${usuario.correo}: ${codigo}`);
                return res.json({ mensaje: "Código de verificación generado en modo offline", otp: codigo, codigo: 0 });
              }
            }));
        });
    });
}


const verificarCodigo = (req, res) => {
  const { correo, codigo } = req.body;
  const errores = [];

  if (!correo) errores.push({ campo: "correo", mensaje: "El correo es requerido" });
  else if (!correoRegex.test((correo || "").trim().toLowerCase()))
    errores.push({ campo: "correo", mensaje: "El correo no tiene un formato válido" });

  if (!codigo) errores.push({ campo: "codigo", mensaje: "El código es requerido" });
  else if (!codigoRegex.test(codigo)) errores.push({ campo: "codigo", mensaje: "El código debe ser numérico" });

  if (errores.length > 0) return res.status(200).json(errorResponse("Errores de validación", errores, 2));

  const correoSanitizado = correo.trim().toLowerCase();

  UsuarioService.buscarPorCorreo(correoSanitizado)
    .then(usuario => {
      if (!usuario) return res.status(200).json(errorResponse("Usuario no encontrado", null, 3));

      return RecuperarService.validarCodigoReset(usuario.id, codigo)
        .then(valido => {
          if (!valido) return res.status(200).json(errorResponse("Código inválido o expirado", null, 2));

          return RecuperarService.limpiarCodigoReset(usuario.id)
            .then(() => pool.connect())
            .then(async client => {
              try {
                await client.query('BEGIN');
                const resLogin = await client.query(`SELECT * FROM usuario_login WHERE usuario_id = $1 FOR UPDATE`, [usuario.id]);
                const ahora = new Date();
                let token, tiempo_restante_min;

                if (resLogin.rows.length > 0) {
                  const login = resLogin.rows[0];
                  if (login.sesion_activa && login.fin_sesion && login.fin_sesion > ahora) {
                    token = login.token;
                    tiempo_restante_min = Math.ceil((new Date(login.fin_sesion) - ahora) / 60000);
                  } else {
                    token = jwt.sign({ id: usuario.id, correo: usuario.correo, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
                    const expiracionToken = new Date(Date.now() + 5 * 60000);
                    tiempo_restante_min = 5;
                    await client.query(
                      `UPDATE usuario_login SET token = $1, token_expires = $2, sesion_activa = TRUE, inicio_sesion = NOW(), fin_sesion = $3 WHERE usuario_id = $4`,
                      [token, expiracionToken, expiracionToken, usuario.id]
                    );
                  }
                }

                await client.query('COMMIT');

                return res.json({
                  mensaje: "Autenticación exitosa",
                  token,
                  tiempo_restante_min,
                  usuario: { id: usuario.id, correo: usuario.correo, rol: usuario.rol, nombre: usuario.nombre },
                  codigo: 0
                });
              } catch (err) {
                await client.query('ROLLBACK');
                throw err;
              } finally {
                client.release();
              }
            });
        });
    })
    .catch(error => {
      console.error("Error verificarCodigo:", error);
      return res.status(200).json(errorResponse("Error al verificar código", error.message, 3));
    });
};

module.exports = {
  loginUsuario,
  verificarCodigo
};
