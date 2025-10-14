const express = require('express');
const router = express.Router();
const BitacoraController = require('../controllers/inventarioController');

router.post('/bitacora/crear', BitacoraController.crear);
router.get('/bitacora/listar', BitacoraController.listar);
router.put('/bitacora/actualizar', BitacoraController.actualizar);
router.delete('/bitacora/eliminar', BitacoraController.eliminar);

module.exports = router;
