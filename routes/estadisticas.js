const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const { auth } = require('../middleware/auth');

// Obtener estadísticas generales del sistema (PÚBLICO)
router.get('/generales', async (req, res) => {
  console.log('🔍 ENDPOINT ESTADISTICAS LLAMADO');
  console.log('Usuario autenticado:', req.usuario);
  
  try {
    const userId = req.usuario?.id;
    const userRole = req.usuario?.tipo;

    let stats = {};

    // Si no hay usuario autenticado, devolver estadísticas globales
    if (!userRole) {
      const totalHoteles = await Hotel.countDocuments();
      const totalReservas = await Reserva.countDocuments();
      const totalClientes = await Usuario.countDocuments({ tipo: 'cliente' });
      const ingresosResult = await Reserva.aggregate([
        { $match: { estado: 'confirmada' } },
        { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
      ]);
      const ingresosTotales = ingresosResult.length > 0 ? ingresosResult[0].total : 0;
      stats = {
        totalHoteles,
        totalReservas,
        totalClientes,
        ingresosTotales,
        reservasPorMes: [],
        ocupacionPromedio: 0
      };
    } else if (userRole === 'cliente' || userRole === 'empresa') {
      // Estadísticas del usuario
      const misReservas = await Reserva.countDocuments({ cliente: userId });
      const reservasActivas = await Reserva.countDocuments({ 
        cliente: userId, 
        estado: { $in: ['confirmada', 'pendiente'] }
      });
      const gastoTotal = await Reserva.aggregate([
        { $match: { cliente: userId, estado: 'confirmada' } },
        { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
      ]);
      const totalGastado = gastoTotal.length > 0 ? gastoTotal[0].total : 0;
      stats = {
        misReservas,
        reservasActivas,
        totalGastado,
        proximasReservas: await Reserva.find({
          cliente: userId,
          estado: 'confirmada',
          fechaInicio: { $gte: new Date() }
        }).limit(3).sort({ fechaInicio: 1 })
      };
    }

    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Aplicar middleware de autenticación SOLO a rutas protegidas
router.use(auth);

// Función auxiliar para calcular ocupación promedio
async function calcularOcupacionPromedio() {
  try {
    const hoteles = await Hotel.find({ activo: true });
    if (hoteles.length === 0) return 0;
    
    const ocupacionTotal = hoteles.reduce((sum, hotel) => sum + (hotel.ocupacion || 0), 0);
    return Math.round(ocupacionTotal / hoteles.length);
  } catch (error) {
    console.error('Error calculando ocupación promedio:', error);
    return 0;
  }
}

// Obtener estadísticas de reservas por rango de fechas
router.get('/reservas', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const userId = req.usuario?.id;
    const userRole = req.usuario?.tipo; // Corregido: usar 'tipo' en lugar de 'rol'

    let filtro = {};
    
    if (fechaInicio && fechaFin) {
      filtro.fechaCreacion = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }

    if (userRole === 'admin_hotel') {
      const hotel = await Hotel.findOne({ admin: userId });
      if (hotel) {
        filtro.$or = [
          { 'habitacion.hotel': hotel._id },
          { 'salon.hotel': hotel._id }
        ];
      }
    } else if (userRole === 'cliente' || userRole === 'empresa') {
      filtro.cliente = userId;
    }

    const reservas = await Reserva.find(filtro)
      .sort({ fechaCreacion: -1 })
      .limit(100);

    const estadisticasReservas = await Reserva.aggregate([
      { $match: filtro },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 },
          totalMonto: { $sum: '$precioTotal' }
        }
      }
    ]);

    res.json({
      success: true,
      reservas,
      estadisticas: estadisticasReservas
    });

  } catch (error) {
    console.error('Error al obtener estadísticas de reservas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

module.exports = router;