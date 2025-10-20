const InventarioReportService = require('../../application/inventarioReporteService');
const errorResponse = require('../../helpers/errorResponse');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const moment = require('moment');

function sendPdfBuffer(res, buffer, filename = 'reporte.pdf') {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function sendExcelBuffer(res, buffer, filename = 'reporte.xlsx') {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

const ReportController = {

  inventarioActual(req, res) {
    InventarioReportService.reporteInventarioActual()
      .then(data => res.json({ codigo: 0, mensaje: 'Inventario actual', data }))
      .catch(err => res.status(200).json(errorResponse('Error al generar inventario actual', err.message, 5)));
  },

  masVendidos(req, res) {
    const { fecha_inicio, fecha_fin, limit } = req.body || {};
    InventarioReportService.reporteMasVendidos({ fecha_inicio, fecha_fin, limit })
      .then(data => res.json({ codigo: 0, mensaje: 'Productos más vendidos', data }))
      .catch(err => res.status(200).json(errorResponse('Error al generar reporte de más vendidos', err.message, 5)));
  },

  bajoStock(req, res) {
    const { threshold } = req.body || {};
    InventarioReportService.reporteBajoStock({ threshold })
      .then(data => res.json({ codigo: 0, mensaje: 'Productos con bajo stock', data }))
      .catch(err => res.status(200).json(errorResponse('Error al generar reporte bajo stock', err.message, 5)));
  },

  movimientosPeriodo(req, res) {
    const { fecha_inicio, fecha_fin, codigo_producto } = req.body || {};
    InventarioReportService.reporteMovimientosPeriodo({ fecha_inicio, fecha_fin, codigo_producto })
      .then(data => res.json({ codigo: 0, mensaje: 'Movimientos por periodo', data }))
      .catch(err => res.status(200).json(errorResponse('Error al generar movimientos por periodo', err.message, 5)));
  },

  exportReport(req, res) {
    const { reportType, params = {}, format = 'pdf' } = req.body || {};
    InventarioReportService.fetchReportData(reportType, params)
      .then(rows => {
        const now = moment().format('YYYYMMDD_HHmm');

        if (format === 'pdf') {
          const doc = new PDFDocument({ margin: 30 });
          const buffers = [];
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            sendPdfBuffer(res, pdfData, `${reportType}_${now}.pdf`);
          });

          doc.fontSize(18).text(`Reporte: ${reportType}`, { align: 'center' });
          doc.moveDown();
          doc.fontSize(10);

          if (!rows || rows.length === 0) {
            doc.text('No hay datos para este reporte');
            doc.end();
            return;
          }

          const keys = Object.keys(rows[0]);
          doc.text(keys.join(' | '));
          doc.moveDown(0.2);
          rows.forEach(r => {
            const line = keys.map(k => (r[k] === null || r[k] === undefined ? '' : String(r[k]))).join(' | ');
            doc.text(line);
          });

          doc.end();

        } else if (format === 'excel') {
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('Reporte');

          if (!rows || rows.length === 0) {
            sheet.addRow(['No hay datos']);
          } else {
            const keys = Object.keys(rows[0]);
            sheet.addRow(keys);
            rows.forEach(r => sheet.addRow(keys.map(k => r[k])));
          }

          workbook.xlsx.writeBuffer()
            .then(buffer => sendExcelBuffer(res, buffer, `${reportType}_${now}.xlsx`))
            .catch(err => res.status(200).json(errorResponse('Error al generar Excel', err.message, 5)));

        } else {
          return res.status(200).json(errorResponse('Formato de exportación inválido', `format=${format}`, 2));
        }
      })
      .catch(err => res.status(200).json(errorResponse('Error al obtener datos para exportar', err.message, 5)));
  },

  dashboardMasVendidos(req, res) {
    const { fecha_inicio, fecha_fin, limit } = req.body || {};
    InventarioReportService.dashboardMasVendidos({ periodo: { fecha_inicio, fecha_fin }, limit })
      .then(data => res.json({ codigo: 0, data }))
      .catch(err => res.status(200).json(errorResponse('Error al obtener datos dashboard', err.message, 5)));
  },

  dashboardValorInventario(req, res) {
    InventarioReportService.dashboardValorInventario()
      .then(data => res.json({ codigo: 0, data }))
      .catch(err => res.status(200).json(errorResponse('Error al obtener valor del inventario', err.message, 5)));
  },

  recalculateAll(req, res) {
    InventarioReportService.recalculateAllStocks()
      .then(updated => res.json({ codigo: 0, mensaje: 'Stocks recalculados', updated }))
      .catch(err => res.status(200).json(errorResponse('Error al recalcular stocks', err.message, 5)));
  },

  recalculateByCodigo(req, res) {
    const { codigo } = req.body || {};
    if (!codigo) return res.status(200).json(errorResponse('Falta el campo codigo', null, 2));
    InventarioReportService.recalculateStockByCodigo(codigo)
      .then(p => res.json({ codigo: 0, mensaje: 'Stock recalculado', producto: p }))
      .catch(err => res.status(200).json(errorResponse('Error al recalcular stock', err.message, 5)));
  }

};

module.exports = ReportController;
