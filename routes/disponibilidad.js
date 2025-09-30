const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidadController');

// Consulta de disponibilidad de habitaciones y salones
router.get('/', disponibilidadController.disponibilidad);

// HU04 - Obtener lista de ciudades disponibles
router.get('/ciudades', disponibilidadController.getCiudades);

// HU04 - Obtener disponibilidad por ciudad y rango de fechas
router.get('/ciudad/:ciudad', disponibilidadController.getDisponibilidadPorCiudad);

module.exports = router;
