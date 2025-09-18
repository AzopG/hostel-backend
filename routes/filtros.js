const express = require('express');
const router = express.Router();
const filtrosController = require('../controllers/filtrosController');

// Filtros avanzados para habitaciones y salones
router.get('/', filtrosController.filtrosAvanzados);

module.exports = router;
