const express = require("express");
const router = express.Router();
const { extenderSesion } = require('../middlewares/sesionActiva');
const BitacoraController = require('../controllers/inventarioController');

router.post('/bitacora/crear', extenderSesion, BitacoraController.crear);
router.get('/bitacora/listar', extenderSesion, BitacoraController.listar);
router.put('/bitacora/actualizar', extenderSesion, BitacoraController.actualizar);
router.delete('/bitacora/eliminar', extenderSesion, BitacoraController.eliminar);

module.exports = router;
