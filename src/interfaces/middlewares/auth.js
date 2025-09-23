const jwt = require('jsonwebtoken');
const errorResponse = require('../../helpers/errorResponse');

const verificarToken = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) 
      return res.status(200).json(errorResponse("TOKEN_NO_PROPORCIONADO", "Token no proporcionado", null, 1));

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) 
      return res.status(200).json(errorResponse("TOKEN_INVALIDO", "Token inválido", null, 1));

    try {
      let payload = jwt.verify(token, process.env.JWT_SECRET);

      if (rolesPermitidos.length && !rolesPermitidos.includes(payload.rol)) {
        return res.status(200).json(errorResponse("PERMISO_DENEGADO", "No tienes permisos para acceder a este recurso", null, 2));
      }

      const ahora = Math.floor(Date.now() / 1000);
      const tiempoRestante = payload.exp - ahora;
      const extension = 3 * 60; 

      if (tiempoRestante <= 5 * 60) { 
        const nuevoToken = jwt.sign(
          { id: payload.id, correo: payload.correo, rol: payload.rol },
          process.env.JWT_SECRET,
          { expiresIn: `${tiempoRestante + extension}s` }
        );
        res.setHeader('x-refresh-token', nuevoToken);
      }

      req.usuario = payload;
      next();
    } catch (err) {
      return res.status(200).json(errorResponse("TOKEN_INVALIDO_O_EXPIRADO", "Token inválido o expirado", err.message, 3));
    }
  };
};

module.exports = { verificarToken };
