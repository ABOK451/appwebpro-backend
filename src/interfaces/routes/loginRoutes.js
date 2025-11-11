const express = require('express');
const router = express.Router();
const { verificarSesionActiva } = require('../middlewares/sesionActiva');
const {  loginUsuario,verificarCodigo, logout } = require('../controllers/authController');


router.post("/auth/login",  loginUsuario);
router.post('/auth/verificar-codigo', verificarSesionActiva,verificarCodigo);
router.post('/auth/logout', logout);

module.exports = router;
