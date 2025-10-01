const express = require('express');
const router = express.Router();
const salonController = require('../controllers/salonController');
const { auth } = require('../middleware/auth');

// HU14 - CA1, CA2, CA4: Búsqueda de salones disponibles por capacidad y fechas
// GET /api/salones/buscar?hotelId=X&capacidadMinima=Y&fechaInicio=Z&fechaFin=W&ordenarPor=capacidad_asc
router.get('/buscar', salonController.buscarSalonesDisponibles);

// Listar todos los salones de un hotel
// GET /api/salones/hotel/:hotelId
router.get('/hotel/:hotelId', salonController.listarSalonesHotel);

// HU16 - CA2: Verificar disponibilidad detallada de un salón en fechas específicas
// GET /api/salones/:id/disponibilidad-detallada?fechaInicio=X&fechaFin=Y
router.get('/:id/disponibilidad-detallada', salonController.verificarDisponibilidadDetallada);

// HU14 - CA3: Verificar disponibilidad específica de un salón
// GET /api/salones/:id/disponibilidad?fechaInicio=X&fechaFin=Y
router.get('/:id/disponibilidad', salonController.verificarDisponibilidadSalon);

// HU16 - CA1: Obtener detalle completo de un salón (capacidad, equipamiento, layouts, fotos, tarifas)
// GET /api/salones/:id (DEBE IR AL FINAL para no interceptar otras rutas)
router.get('/:id', salonController.obtenerDetalleSalon);

// Crear nuevo salón (requiere autenticación de administrador)
// POST /api/salon
router.post('/', auth, salonController.crearSalon);

// Actualizar salón (requiere autenticación de administrador)
// PUT /api/salon/:id
router.put('/:id', auth, salonController.actualizarSalon);

module.exports = router;