const express = require("express");
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');

router.get("/admin", verificarToken(["admin"]), (req, res) => {
  res.json({ mensaje: "Hola Admin", usuario: req.usuario });
});

router.get("/user", verificarToken(["user", "admin"]), (req, res) => {
  res.json({ mensaje: "Hola Usuario", usuario: req.usuario });
});

module.exports = router;
