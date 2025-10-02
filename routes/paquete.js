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

// RUTAS PÚBLICAS PARA EMPRESAS
// Listar paquetes disponibles para empresas
router.get('/disponibles', async (req, res) => {
  try {
    console.log('🔍 Buscando paquetes disponibles...');
    
    // Buscar TODOS los paquetes primero para debugging
    const todosPaquetes = await Paquete.find({});
    console.log(`📦 Total paquetes en BD: ${todosPaquetes.length}`);
    
    // Mostrar estados de los paquetes
    if (todosPaquetes.length > 0) {
      todosPaquetes.forEach(p => {
        console.log(`- Paquete: ${p.nombre}, Estado: ${p.estado}, Publicado: ${p.publicado}`);
      });
    }
    
    // Buscar paquetes activos y publicados (criterio correcto)
    const paquetes = await Paquete.find({ 
      estado: 'activo', 
      publicado: true 
    })
      .populate('hotel', 'nombre ciudad direccion telefono')
      .populate('salones.salonId', 'nombre capacidad');
    
    console.log(`✅ Paquetes activos y publicados: ${paquetes.length}`);
    
    // Si no hay paquetes activos, devolver todos para que el admin los pueda ver
    if (paquetes.length === 0) {
      console.log('⚠️ No hay paquetes activos, devolviendo todos...');
      const todosPaquetesPopulados = await Paquete.find({})
        .populate('hotel', 'nombre ciudad direccion telefono')
        .populate('salones.salonId', 'nombre capacidad');
      
      return res.json({
        success: true,
        paquetes: todosPaquetesPopulados,
        mensaje: 'No hay paquetes activos, mostrando todos'
      });
    }
    
    res.json({
      success: true,
      paquetes: paquetes
    });
  } catch (error) {
    console.error('Error al obtener paquetes disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener paquetes disponibles'
    });
  }
});

// Obtener detalles de un paquete específico para empresas
router.get('/disponibles/:id', async (req, res) => {
  try {
    console.log(`🔍 Buscando paquete ID: ${req.params.id}`);
    
    const paquete = await Paquete.findById(req.params.id)
      .populate('hotel', 'nombre ciudad direccion telefono email')
      .populate('salones.salonId', 'nombre capacidad precio descripcion');
    
    if (!paquete) {
      console.log(`❌ Paquete no encontrado: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Paquete no encontrado'
      });
    }
    
    console.log(`✅ Paquete encontrado: ${paquete.nombre}`);
    
    res.json({
      success: true,
      paquete: paquete
    });
  } catch (error) {
    console.error('Error al obtener paquete:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalles del paquete'
    });
  }
});

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