const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reporteController');
const { extenderSesion } = require('../middlewares/sesionActiva');

router.post('/reporte/inventario', extenderSesion,ReportController.inventarioActual);
router.post('/reporte/mas-vendidos', extenderSesion,ReportController.masVendidos);
router.post('/reporte/bajo-stock',extenderSesion, ReportController.bajoStock);
router.post('/reporte/movimientos-periodo', extenderSesion,ReportController.movimientosPeriodo);

router.post('/reporte/export', extenderSesion,ReportController.exportReport);

router.post('/reporte/dashboard/mas-vendidos', extenderSesion,ReportController.dashboardMasVendidos);
router.post('/reporte/dashboard/valor-inventario',extenderSesion, ReportController.dashboardValorInventario);

router.post('/reporte/recalculate/all',extenderSesion, ReportController.recalculateAll);
router.post('/reporte/recalculate/by-codigo',extenderSesion, ReportController.recalculateByCodigo);

module.exports = router;
