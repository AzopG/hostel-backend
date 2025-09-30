const express = require('express');
const router = express.Router();
const salonController = require('../controllers/salonController');
const { auth } = require('../middleware/auth');

// HU14 - CA1, CA2, CA4: Búsqueda de salones disponibles por capacidad y fechas
// GET /api/salon/buscar?hotelId=X&capacidadMinima=Y&fechaInicio=Z&fechaFin=W&ordenarPor=capacidad_asc
router.get('/buscar', salonController.buscarSalonesDisponibles);

// Listar todos los salones de un hotel
// GET /api/salon/hotel/:hotelId
router.get('/hotel/:hotelId', salonController.listarSalonesHotel);

// HU14 - CA3: Verificar disponibilidad específica de un salón
// GET /api/salon/:id/disponibilidad?fechaInicio=X&fechaFin=Y
router.get('/:id/disponibilidad', salonController.verificarDisponibilidadSalon);

// Obtener detalles de un salón específico
// GET /api/salon/:id (DEBE IR AL FINAL)
router.get('/:id', salonController.obtenerSalonDetalle);

// Crear nuevo salón (requiere autenticación de administrador)
// POST /api/salon
router.post('/', auth, salonController.crearSalon);

// Actualizar salón (requiere autenticación de administrador)
// PUT /api/salon/:id
router.put('/:id', auth, salonController.actualizarSalon);

module.exports = router;