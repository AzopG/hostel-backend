const express = require('express');
const router = express.Router();
const Paquete = require('../models/Paquete');
const paqueteController = require('../controllers/paqueteController');
const { auth } = require('../middleware/auth');

/**
 * HU18: RUTAS PARA PAQUETES CORPORATIVOS
 */

// CA1: Obtener opciones de paquete corporativo disponible
// POST /api/paquetes/:hotelId/iniciar
router.post('/:hotelId/iniciar', 
  auth,
  paqueteController.iniciarPaqueteCorporativo
);

// CA2 & CA3: Validar disponibilidad conjunta de todos los componentes
// POST /api/paquetes/validar-disponibilidad
router.post('/validar-disponibilidad',
  auth,
  paqueteController.validarDisponibilidadPaquete
);

// CA4: Confirmar paquete corporativo y generar código único
// POST /api/paquetes/confirmar
router.post('/confirmar',
  auth,
  paqueteController.confirmarPaqueteCorporativo
);

// RUTAS ANTIGUAS (mantener compatibilidad)
// Consultar paquetes empresariales
router.get('/', async (req, res) => {
  const paquetes = await Paquete.find();
  res.json(paquetes);
});

// Crear paquete
router.post('/', async (req, res) => {
  const paquete = new Paquete(req.body);
  await paquete.save();
  res.status(201).json(paquete);
});

module.exports = router;