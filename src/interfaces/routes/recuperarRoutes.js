const express = require("express");
const router = express.Router();
const { solicitarReset, resetConCodigo } = require('../controllers/recuperarController');


router.post('/recuperar/solicitar-reset', solicitarReset);
router.post('/recuperar/reset-con-codigo', resetConCodigo);


module.exports = router;