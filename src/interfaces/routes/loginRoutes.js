const express = require('express');
const router = express.Router();
const {  loginUsuario,generarSecret2FA } = require('../controllers/authController');



router.post('/auth/login', loginUsuario);




module.exports = router;
