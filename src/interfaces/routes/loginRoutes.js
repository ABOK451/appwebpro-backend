const express = require('express');
const router = express.Router();
const { verificarSesionActiva } = require('../middlewares/sesionActiva');
const {  loginUsuario,verificarCodigo } = require('../controllers/authController');


router.post("/auth/login", verificarSesionActiva, loginUsuario);
router.post('/auth/verificar-codigo', verificarSesionActiva,verificarCodigo);

module.exports = router;
