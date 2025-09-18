const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

// Actualizar inventario manualmente
router.put('/', inventarioController.actualizarInventario);

module.exports = router;
