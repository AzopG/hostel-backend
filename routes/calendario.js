const express = require('express');
const router = express.Router();
const calendarioController = require('../controllers/calendarioController');

// Calendario de disponibilidad y reservas por hotel y mes
router.get('/', calendarioController.calendario);

module.exports = router;
