const jwt = require('jsonwebtoken');

const verificarToken = (rolesPermitidos = []) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ error: 'Token inválido' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = payload;

      // Verificar roles si se proporcionan
      if (rolesPermitidos.length && !rolesPermitidos.includes(payload.rol)) {
        return res.status(403).json({ error: 'No tienes permisos para acceder a este recurso' });
      }

      next();
    } catch (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
  };
};

module.exports = { verificarToken };