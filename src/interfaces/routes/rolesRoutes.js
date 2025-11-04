const express = require("express");
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const errorResponse = require('../../helpers/errorResponse');

router.get("/admin", verificarToken(["admin"]), (req, res) => {
  if (!req.usuario) {
    return res.status(200).json(errorResponse("ACCESO_DENEGADO", "No tienes permisos para acceder a este recurso", null, 2));
  }
  res.json({ mensaje: "Hola Admin", usuario: req.usuario, codigo: 0 });
});

router.get("/user", verificarToken(["user", "admin"]), (req, res) => {
  if (!req.usuario) {
    return res.status(200).json(errorResponse("ACCESO_DENEGADO", "No tienes permisos para acceder a este recurso", null, 2));
  }
  res.json({ mensaje: "Hola Usuario", usuario: req.usuario, codigo: 0 });
});

module.exports = router;
