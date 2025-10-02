const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const { auth } = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(auth);

// Obtener estadísticas generales del sistema
router.get('/generales', async (req, res) => {
  try {
    const userId = req.usuario?.id;
    const userRole = req.usuario?.rol;

    let stats = {};

    if (userRole === 'admin_central') {
      // Estadísticas completas para admin central
      const totalHoteles = await Hotel.countDocuments({ activo: true });
      const totalReservas = await Reserva.countDocuments();
      const totalClientes = await Usuario.countDocuments({ rol: 'cliente' });
      
      // Calcular ingresos totales (suma de precios de reservas confirmadas)
      const ingresosResult = await Reserva.aggregate([
        { $match: { estado: 'confirmada' } },
        { $group: { _id: null, total: { $sum: '$precioTotal' } } }
      ]);
      const ingresosTotales = ingresosResult.length > 0 ? ingresosResult[0].total : 0;

      // Reservas por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const reservasPorMes = await Reserva.aggregate([
        { $match: { fechaCreacion: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { 
              year: { $year: '$fechaCreacion' }, 
              month: { $month: '$fechaCreacion' } 
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      stats = {
        totalHoteles,
        totalReservas,
        totalClientes,
        ingresosTotales,
        reservasPorMes,
        ocupacionPromedio: await calcularOcupacionPromedio()
      };

    } else if (userRole === 'admin_hotel') {
      // Estadísticas específicas del hotel del admin
      const hotel = await Hotel.findOne({ admin: userId });
      if (!hotel) {
        return res.status(404).json({ success: false, message: 'Hotel no encontrado' });
      }

      const reservasHotel = await Reserva.countDocuments({ 
        $or: [
          { 'habitacion.hotel': hotel._id },
          { 'salon.hotel': hotel._id }
        ]
      });

      const ingresosHotel = await Reserva.aggregate([
        { 
          $match: { 
            estado: 'confirmada',
            $or: [
              { 'habitacion.hotel': hotel._id },
              { 'salon.hotel': hotel._id }
            ]
          }
        },
        { $group: { _id: null, total: { $sum: '$precioTotal' } } }
      ]);
      const ingresosTotales = ingresosHotel.length > 0 ? ingresosHotel[0].total : 0;

      // Habitaciones del hotel
      const habitacionesTotal = hotel.habitaciones ? hotel.habitaciones.length : 0;
      
      stats = {
        totalHoteles: 1,
        totalReservas: reservasHotel,
        totalHabitaciones: habitacionesTotal,
        ingresosTotales,
        ocupacionActual: hotel.ocupacion || 0,
        nombreHotel: hotel.nombre
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
        { $group: { _id: null, total: { $sum: '$precioTotal' } } }
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
    const userRole = req.usuario?.rol;

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