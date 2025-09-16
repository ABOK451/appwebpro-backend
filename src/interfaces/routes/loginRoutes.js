const express = require('express');
const router = express.Router();
const {  loginUsuario,verificarCodigo } = require('../controllers/authController');



router.post('/auth/login', loginUsuario);
router.post('/auth/verificar-codigo', verificarCodigo);

module.exports = router;
