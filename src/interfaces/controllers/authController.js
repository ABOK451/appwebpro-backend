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

  if (!correo) errores.push({ campo: "correo", mensaje: "Correo es requerido" });
  if (!password) errores.push({ campo: "password", mensaje: "Contraseña es requerida" });
  if (correo && typeof correo !== 'string') errores.push({ campo: "correo", mensaje: "Correo debe ser texto" });
  if (password && typeof password !== 'string') errores.push({ campo: "password", mensaje: "Contraseña debe ser texto" });

  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  console.log(`[LOGIN] Intento de login recibido para correo: ${correo}`);
  console.log(`[LOGIN] Contraseña recibida (tipo: ${typeof password}): [longitud: ${password.length}, inicia con: "${password.slice(0, 3)}..."]`);

  UsuarioService.buscarPorCorreo(correo)
    .then(usuario => {
      if (!usuario) {
        console.log(`[LOGIN] Usuario no encontrado: ${correo}`);
        return res.status(401).json({ mensaje: "Credenciales inválidas" });
      }

      console.log(`[LOGIN] Usuario encontrado: ${usuario.id} - ${usuario.nombre}. Verificando bloqueo...`);
      console.log(`[LOGIN] Verificando contraseña para usuario ${usuario.id}...`);

      // 🔍 Detectar si la contraseña en BD no está hasheada
      if (!usuario.password.startsWith("$2b$")) {
        console.log(`[LOGIN] Contraseña no hasheada detectada para usuario ${usuario.id}`);

        if (usuario.password === password) {
          console.log(`[LOGIN] Contraseña coincide en texto plano. Hasheando y corrigiendo en DB...`);
          const hash = bcrypt.hashSync(password, 10);

          return UsuarioService.actualizarLogin(usuario.id, { password: hash })
            .then(() => {
              console.log(`[LOGIN] Contraseña actualizada correctamente para usuario ${usuario.id}`);
              // Continuar flujo con la comparación normal
              return bcrypt.compare(password, hash);
            })
            .then(passwordCorrecto => manejarResultadoPassword(passwordCorrecto, usuario, req, res))
            .catch(error => {
              console.error(`[LOGIN] Error al actualizar contraseña para usuario ${usuario.id}: ${error.message}`);
              return res.status(500).json({ mensaje: "Error interno al actualizar la contraseña" });
            });
        } else {
          console.log(`[LOGIN] Contraseña en texto plano no coincide. Falla de autenticación.`);
          return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }
      }

      // Comparación normal si ya está hasheada
      return bcrypt.compare(password, usuario.password)
        .then(passwordCorrecto => manejarResultadoPassword(passwordCorrecto, usuario, req, res))
        .catch(error => {
          console.error(`[LOGIN] Error al comparar contraseñas: ${error.message}`);
          return res.status(500).json({ mensaje: "Error interno al verificar contraseña" });
        });
    })
    .catch(error => {
      console.error(`[LOGIN] Error al buscar usuario: ${error.message}`);
      return res.status(500).json({ mensaje: "Error interno del servidor" });
    });
};

// 🧩 Función auxiliar para manejar el resultado del bcrypt
function manejarResultadoPassword(passwordCorrecto, usuario, req, res) {
  console.log(`[LOGIN] Resultado comparación bcrypt: ${passwordCorrecto}`);

  if (!passwordCorrecto) {
    console.log(`[LOGIN] Contraseña incorrecta para usuario ${usuario.id}`);
    return res.status(401).json({ mensaje: "Credenciales inválidas" });
  }

  console.log(`[LOGIN] Contraseña correcta. Reseteando intentos fallidos para usuario ${usuario.id}`);

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[LOGIN] Obteniendo ubicación por IP: ${ip}`);

  return obtenerUbicacionIP(ip)
    .then(ubicacion => {
      if (!ubicacion || ubicacion.bogon) {
        console.log(`No se pudo obtener ubicación de ipinfo: ${JSON.stringify(ubicacion)}`);
      } else {
        console.log(`[LOGIN] Ubicación detectada: ${ubicacion.ciudad}, ${ubicacion.region}, ${ubicacion.pais}`);
      }

      console.log(`[LOGIN] Generando token JWT para usuario ${usuario.id}`);
      const token = jwt.sign(
        { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      return res.status(200).json({
        mensaje: "Inicio de sesión exitoso",
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol
        },
        ubicacion: ubicacion || "No disponible"
      });
    })
    .catch(err => {
      console.error(`[LOGIN] Error al obtener ubicación: ${err.message}`);
      return res.status(200).json({
        mensaje: "Inicio de sesión exitoso (sin ubicación)",
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol
        }
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
