const express = require('express');
const router = express.Router();
const asistenteController = require('../controllers/asistenteController');
const { auth } = require('../middleware/auth');

/**
 * HU19: RUTAS PARA GESTIÓN DE ASISTENTES
 */

// Obtener lista de asistentes de una reserva
// GET /api/asistentes/:reservaId
router.get('/:reservaId', 
  auth,
  asistenteController.obtenerAsistentes
);

// CA1: Agregar un nuevo asistente a la lista
// POST /api/asistentes/:reservaId
router.post('/:reservaId',
  auth,
  asistenteController.agregarAsistente
);

// CA2: Editar datos de un asistente existente
// PUT /api/asistentes/:reservaId/:asistenteId
router.put('/:reservaId/:asistenteId',
  auth,
  asistenteController.editarAsistente
);

// CA3: Eliminar un asistente de la lista
// DELETE /api/asistentes/:reservaId/:asistenteId
router.delete('/:reservaId/:asistenteId',
  auth,
  asistenteController.eliminarAsistente
);

// Confirmar asistencia de un asistente
// PATCH /api/asistentes/:reservaId/:asistenteId/confirmar
router.patch('/:reservaId/:asistenteId/confirmar',
  auth,
  asistenteController.confirmarAsistencia
);

// Importar múltiples asistentes
// POST /api/asistentes/:reservaId/importar
router.post('/:reservaId/importar',
  auth,
  asistenteController.importarAsistentes
);

module.exports = router;
