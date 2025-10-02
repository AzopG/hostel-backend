const express = require('express');
const router = express.Router();
const paqueteAdminController = require('../controllers/paqueteAdminController');
const { auth, requireRole } = require('../middleware/auth');

/**
 * RUTAS PARA GESTIÓN ADMINISTRATIVA DE PAQUETES
 * Solo para admins de hotel y admin central
 */

// Listar todos los hoteles (para admin_hotel que gestiona toda la red)
// GET /api/admin/paquetes/hoteles
router.get('/hoteles',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.listarTodosLosHoteles
);

// Listar paquetes de todos los hoteles (para admin_hotel)
// GET /api/admin/paquetes/todos
router.get('/todos',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.listarTodosPaquetes
);

// Listar todos los paquetes de un hotel específico
// GET /api/admin/paquetes/hotel/:hotelId
router.get('/hotel/:hotelId',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.listarPaquetesHotel
);

// Obtener opciones para crear un paquete (salones y habitaciones disponibles)
// GET /api/admin/paquetes/opciones/:hotelId
router.get('/opciones/:hotelId',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.obtenerOpcionesPaquete
);

// Crear nuevo paquete corporativo
// POST /api/admin/paquetes
router.post('/',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.crearPaquete
);

// Cambiar estado del paquete (activar/desactivar)
// PATCH /api/admin/paquetes/:paqueteId/estado
router.patch('/:paqueteId/estado',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.cambiarEstadoPaquete
);

// Actualizar paquete existente
// PUT /api/admin/paquetes/:paqueteId
router.put('/:paqueteId',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.actualizarPaquete
);

// Eliminar paquete (desactivar o eliminar definitivamente)
// DELETE /api/admin/paquetes/:paqueteId
router.delete('/:paqueteId',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.eliminarPaquete
);

// Obtener detalles de un paquete específico (DEBE IR AL FINAL)
// GET /api/admin/paquetes/:paqueteId
router.get('/:paqueteId',
  auth,
  requireRole('admin_hotel', 'admin_central'),
  paqueteAdminController.obtenerPaquete
);

module.exports = router;