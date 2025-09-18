const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');

// Reporte de ocupación
router.get('/ocupacion', reporteController.reporteOcupacion);

// Reporte de eventos
router.get('/eventos', reporteController.reporteEventos);

// Reporte de paquetes
router.get('/paquetes', reporteController.reportePaquetes);

module.exports = router;
