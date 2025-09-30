const express = require('express');
const router = express.Router();
const filtrosController = require('../controllers/filtrosController');

// HU05 - Filtrar habitaciones por fechas y número de huéspedes
router.get('/habitaciones', filtrosController.filtrarHabitaciones);

// Filtros avanzados para habitaciones y salones
router.get('/', filtrosController.filtrosAvanzados);

module.exports = router;
