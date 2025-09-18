const express = require('express');
const router = express.Router();
const disponibilidadController = require('../controllers/disponibilidadController');

// Consulta de disponibilidad de habitaciones y salones
router.get('/', disponibilidadController.disponibilidad);

module.exports = router;
