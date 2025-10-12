const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Paquete = require('../models/Paquete');
const { auth } = require('../middleware/auth');

// Obtener estadísticas generales del sistema (PÚBLICO)
router.get('/generales', async (req, res) => {
  // console.log('🔍 ENDPOINT ESTADISTICAS LLAMADO');
  // console.log('Usuario autenticado:', req.usuario);
  
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

      // Calcular reservas por mes del año actual
      const reservasPorMes = await Reserva.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(new Date().getFullYear(), 0, 1), // Desde enero del año actual
              $lte: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59) // Hasta diciembre del año actual
            }
          }
        },
        {
          $group: {
            _id: { month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            totalIngresos: { $sum: '$tarifa.total' }
          }
        },
        {
          $sort: { '_id.month': 1 }
        }
      ]);

      // console.log('Reservas por mes calculadas:', reservasPorMes);

      // Reporte: habitaciones por hotel
      const hoteles = await Hotel.find({});
      const habitacionesPorHotel = {};
      const salasPorHotel = {};
      const paquetesPorHotel = {};
      for (const hotel of hoteles) {
        // Habitaciones
        const habitacionesCount = await Habitacion.countDocuments({ hotel: hotel._id });
        habitacionesPorHotel[hotel.nombre] = habitacionesCount;
        // Salas
        const salasCount = await Salon.countDocuments({ hotel: hotel._id });
        salasPorHotel[hotel.nombre] = salasCount;
        // Paquetes
        const paquetesCount = await Paquete.countDocuments({ hotel: hotel._id });
        paquetesPorHotel[hotel.nombre] = paquetesCount;
      }

      stats = {
        totalHoteles,
        totalReservas,
        totalClientes,
        ingresosTotales,
        reservasPorMes,
        ocupacionPromedio: 0,
        habitacionesPorHotel,
        salasPorHotel,
        paquetesPorHotel
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

      // Calcular reservas por mes del usuario
      const reservasPorMes = await Reserva.aggregate([
        {
          $match: {
            cliente: userId,
            createdAt: {
              $gte: new Date(new Date().getFullYear(), 0, 1),
              $lte: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
            }
          }
        },
        {
          $group: {
            _id: { month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            totalIngresos: { $sum: '$tarifa.total' }
          }
        },
        {
          $sort: { '_id.month': 1 }
        }
      ]);

      stats = {
        misReservas,
        reservasActivas,
        totalGastado,
        reservasPorMes,
        proximasReservas: await Reserva.find({
          cliente: userId,
          estado: 'confirmada',
          fechaInicio: { $gte: new Date() }
        }).limit(3).sort({ fechaInicio: 1 })
      };
    } else if (userRole === 'admin_hotel') {
      // Estadísticas del administrador de hotel
      const hotel = await Hotel.findOne({ admin: userId });
      if (hotel) {
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
          { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
        ]);

        const totalIngresosHotel = ingresosHotel.length > 0 ? ingresosHotel[0].total : 0;

        // Calcular reservas por mes del hotel
        const reservasPorMes = await Reserva.aggregate([
          {
            $match: {
              $or: [
                { 'habitacion.hotel': hotel._id },
                { 'salon.hotel': hotel._id }
              ],
              createdAt: {
                $gte: new Date(new Date().getFullYear(), 0, 1),
                $lte: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59)
              }
            }
          },
          {
            $group: {
              _id: { month: { $month: '$createdAt' } },
              count: { $sum: 1 },
              totalIngresos: { $sum: '$tarifa.total' }
            }
          },
          {
            $sort: { '_id.month': 1 }
          }
        ]);

        stats = {
          totalReservas: reservasHotel,
          ingresosTotales: totalIngresosHotel,
          nombreHotel: hotel.nombre,
          ocupacionPromedio: hotel.ocupacion || 0,
          reservasPorMes
        };
      } else {
        stats = {
          totalReservas: 0,
          ingresosTotales: 0,
          nombreHotel: 'Hotel no encontrado',
          ocupacionPromedio: 0,
          reservasPorMes: []
        };
      }
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
      filtro.createdAt = {
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
      .sort({ createdAt: -1 })
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

// HU: Reporte de ocupación por rango de fechas
router.get('/ocupacion', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const userId = req.usuario?.id;
    const userRole = req.usuario?.tipo;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    let filtroHoteles = {};
    if (userRole === 'admin_hotel') {
      const hotel = await Hotel.findOne({ admin: userId });
      if (hotel) {
        filtroHoteles._id = hotel._id;
      }
    }

    // Obtener todos los hoteles
    const hoteles = await Hotel.find(filtroHoteles);
    
    const reporteOcupacion = [];
    
    for (const hotel of hoteles) {
      // Obtener total de habitaciones del hotel
      const totalHabitaciones = await Habitacion.countDocuments({ hotel: hotel._id });
      
      // Obtener reservas en el rango de fechas
      const reservasHotel = await Reserva.find({
        hotel: hotel._id,
        $or: [
          {
            fechaInicio: { $gte: inicio, $lte: fin }
          },
          {
            fechaFin: { $gte: inicio, $lte: fin }
          },
          {
            fechaInicio: { $lte: inicio },
            fechaFin: { $gte: fin }
          }
        ],
        estado: { $in: ['confirmada', 'checkin'] }
      });

      // Calcular días del rango
      const diasRango = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
      
      // Calcular ocupación promedio
      const reservasDias = reservasHotel.reduce((total, reserva) => {
        const inicioReserva = new Date(Math.max(reserva.fechaInicio, inicio));
        const finReserva = new Date(Math.min(reserva.fechaFin, fin));
        const diasOcupados = Math.ceil((finReserva - inicioReserva) / (1000 * 60 * 60 * 24));
        return total + Math.max(0, diasOcupados);
      }, 0);

      const ocupacionPromedio = totalHabitaciones > 0 ? 
        ((reservasDias / (totalHabitaciones * diasRango)) * 100).toFixed(2) : 0;

      // Calcular ingresos
      const ingresos = reservasHotel.reduce((total, reserva) => total + (reserva.tarifa?.total || 0), 0);

      reporteOcupacion.push({
        hotel: hotel.nombre,
        totalHabitaciones,
        reservasConfirmadas: reservasHotel.length,
        ocupacionPromedio: parseFloat(ocupacionPromedio),
        ingresosTotales: ingresos,
        diasRango
      });
    }

    res.json({
      success: true,
      reporte: reporteOcupacion,
      periodo: {
        fechaInicio: inicio,
        fechaFin: fin,
        dias: Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de ocupación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// HU: Reporte de eventos y asistentes en salones
router.get('/eventos', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const userId = req.usuario?.id;
    const userRole = req.usuario?.tipo;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    let filtroReservas = {
      salon: { $exists: true, $ne: null },
      fechaInicio: { $gte: inicio },
      fechaFin: { $lte: fin },
      estado: { $in: ['confirmada', 'checkin', 'checkout'] }
    };

    if (userRole === 'admin_hotel') {
      const hotel = await Hotel.findOne({ admin: userId });
      if (hotel) {
        const salones = await Salon.find({ hotel: hotel._id });
        filtroReservas.salon = { $in: salones.map(s => s._id) };
      }
    }

    // Obtener reservas de salones con datos poblados
    const reservasSalones = await Reserva.find(filtroReservas)
      .populate('salon', 'nombre capacidad tipo')
      .populate('hotel', 'nombre')
      .populate('usuario', 'nombre email tipo empresa')
      .sort({ fechaInicio: 1 });

    // Agrupar por salón y hotel
    const reporteEventos = {};
    
    for (const reserva of reservasSalones) {
      if (!reserva.salon || !reserva.hotel) continue;
      
      const hotelNombre = reserva.hotel.nombre;
      const salonNombre = reserva.salon.nombre;
      const key = `${hotelNombre} - ${salonNombre}`;
      
      if (!reporteEventos[key]) {
        reporteEventos[key] = {
          hotel: hotelNombre,
          salon: salonNombre,
          capacidadSalon: reserva.salon.capacidad || 0,
          tipoSalon: reserva.salon.tipo || 'N/A',
          eventos: [],
          totalEventos: 0,
          totalAsistentes: 0,
          ingresosTotales: 0,
          utilizacionPromedio: 0
        };
      }
      
      const evento = {
        codigo: reserva.codigoReserva,
        fecha: reserva.fechaInicio,
        cliente: reserva.usuario?.nombre || reserva.datosHuesped?.nombre || 'N/A',
        empresa: reserva.usuario?.empresa || 'Particular',
        asistentes: reserva.huespedes || 0,
        duracion: Math.ceil((reserva.fechaFin - reserva.fechaInicio) / (1000 * 60 * 60)),
        ingresos: reserva.tarifa?.total || 0
      };
      
      reporteEventos[key].eventos.push(evento);
      reporteEventos[key].totalEventos++;
      reporteEventos[key].totalAsistentes += evento.asistentes;
      reporteEventos[key].ingresosTotales += evento.ingresos;
    }

    // Calcular utilización promedio
    Object.keys(reporteEventos).forEach(key => {
      const salon = reporteEventos[key];
      if (salon.capacidadSalon > 0) {
        salon.utilizacionPromedio = ((salon.totalAsistentes / salon.totalEventos) / salon.capacidadSalon * 100).toFixed(2);
      }
    });

    res.json({
      success: true,
      reporte: Object.values(reporteEventos),
      resumen: {
        totalSalones: Object.keys(reporteEventos).length,
        totalEventos: Object.values(reporteEventos).reduce((sum, salon) => sum + salon.totalEventos, 0),
        totalAsistentes: Object.values(reporteEventos).reduce((sum, salon) => sum + salon.totalAsistentes, 0),
        ingresosEventos: Object.values(reporteEventos).reduce((sum, salon) => sum + salon.ingresosTotales, 0)
      },
      periodo: {
        fechaInicio: inicio,
        fechaFin: fin
      }
    });

  } catch (error) {
    console.error('Error al generar reporte de eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// HU: Monitoreo de desempeño por sede (KPIs)
router.get('/kpis-sedes', auth, async (req, res) => {
  try {
    console.log('🏆 Iniciando endpoint KPIs por sede');
    const { fechaInicio, fechaFin } = req.query;
    const userId = req.usuario?.id;
    const userRole = req.usuario?.tipo;

    console.log('📅 Fechas:', { fechaInicio, fechaFin });
    console.log('👤 Usuario:', { userId, userRole });

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar fechaInicio y fechaFin'
      });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    console.log('📊 Rango procesado:', { inicio, fin });

    let filtroHoteles = {};
    if (userRole === 'admin_hotel') {
      const hotel = await Hotel.findOne({ admin: userId });
      if (hotel) {
        filtroHoteles._id = hotel._id;
      }
    }

    console.log('🏨 Filtro hoteles:', filtroHoteles);
    const hoteles = await Hotel.find(filtroHoteles);
    console.log('📍 Hoteles encontrados:', hoteles.length);
    
    const kpisSedes = [];

    for (const hotel of hoteles) {
      console.log(`🔍 Procesando hotel: ${hotel.nombre}`);
      
      // Métricas básicas
      const totalHabitaciones = await Habitacion.countDocuments({ hotel: hotel._id });
      console.log(`  🛏️ Habitaciones: ${totalHabitaciones}`);
      
      const totalSalones = await Salon.countDocuments({ hotel: hotel._id });
      console.log(`  🏛️ Salones: ${totalSalones}`);

      // Reservas en el periodo
      const reservasHotel = await Reserva.find({
        hotel: hotel._id,
        createdAt: { $gte: inicio, $lte: fin }
      });
      console.log(`  📋 Reservas encontradas: ${reservasHotel.length}`);

      const reservasHabitaciones = reservasHotel.filter(r => r.habitacion);
      const reservasSalones = reservasHotel.filter(r => r.salon);

      // KPIs de ingresos
      const ingresosHabitaciones = reservasHabitaciones.reduce((sum, r) => sum + (r.tarifa?.total || 0), 0);
      const ingresosSalones = reservasSalones.reduce((sum, r) => sum + (r.tarifa?.total || 0), 0);
      const ingresosTotales = ingresosHabitaciones + ingresosSalones;

      // KPIs de ocupación
      const diasPeriodo = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
      const tasaOcupacionHabitaciones = totalHabitaciones > 0 ? 
        (reservasHabitaciones.length / (totalHabitaciones * diasPeriodo) * 100).toFixed(2) : 0;
      
      // KPIs de satisfacción (simulado por ahora)
      const calificacionPromedio = (Math.random() * 2 + 3).toFixed(1); // Entre 3.0 y 5.0

      // KPIs de eficiencia
      const ingresoPromedioPorReserva = reservasHotel.length > 0 ? 
        (ingresosTotales / reservasHotel.length).toFixed(0) : 0;
      
      const revPAR = totalHabitaciones > 0 ? 
        (ingresosHabitaciones / (totalHabitaciones * diasPeriodo)).toFixed(0) : 0; // Revenue Per Available Room

      // Tendencia (comparar con periodo anterior)
      const periodoAnterior = new Date(inicio);
      periodoAnterior.setDate(periodoAnterior.getDate() - diasPeriodo);
      
      const reservasAnteriores = await Reserva.countDocuments({
        hotel: hotel._id,
        createdAt: { $gte: periodoAnterior, $lt: inicio }
      });

      const tendenciaReservas = reservasAnteriores > 0 ? 
        (((reservasHotel.length - reservasAnteriores) / reservasAnteriores) * 100).toFixed(1) : 0;

      kpisSedes.push({
        sede: hotel.nombre,
        ubicacion: hotel.ciudad || 'No especificada',
        
        // Métricas de capacidad
        totalHabitaciones,
        totalSalones,
        
        // Métricas de reservas
        totalReservas: reservasHotel.length,
        reservasHabitaciones: reservasHabitaciones.length,
        reservasSalones: reservasSalones.length,
        
        // Métricas financieras
        ingresosTotales,
        ingresosHabitaciones,
        ingresosSalones,
        ingresoPromedioPorReserva: parseFloat(ingresoPromedioPorReserva),
        revPAR: parseFloat(revPAR),
        
        // Métricas de ocupación
        tasaOcupacionHabitaciones: parseFloat(tasaOcupacionHabitaciones),
        
        // Métricas de satisfacción
        calificacionPromedio: parseFloat(calificacionPromedio),
        
        // Tendencias
        tendenciaReservas: parseFloat(tendenciaReservas),
        
        // Nivel de desempeño (basado en métricas combinadas)
        nivelDesempeño: calcularNivelDesempeño({
          ocupacion: parseFloat(tasaOcupacionHabitaciones),
          ingresos: ingresosTotales,
          calificacion: parseFloat(calificacionPromedio),
          tendencia: parseFloat(tendenciaReservas)
        })
      });
    }

    // Ranking de sedes
    kpisSedes.sort((a, b) => b.ingresosTotales - a.ingresosTotales);
    kpisSedes.forEach((sede, index) => {
      sede.ranking = index + 1;
    });

    res.json({
      success: true,
      kpis: kpisSedes,
      resumen: {
        totalSedes: kpisSedes.length,
        ingresosTotalesGlobal: kpisSedes.reduce((sum, sede) => sum + sede.ingresosTotales, 0),
        ocupacionPromedioGlobal: kpisSedes.length > 0 ? 
          (kpisSedes.reduce((sum, sede) => sum + sede.tasaOcupacionHabitaciones, 0) / kpisSedes.length).toFixed(2) : 0,
        mejorSede: kpisSedes[0]?.sede || 'N/A',
        peorSede: kpisSedes[kpisSedes.length - 1]?.sede || 'N/A'
      },
      periodo: {
        fechaInicio: inicio,
        fechaFin: fin,
        dias: diasPeriodo
      }
    });

  } catch (error) {
    console.error('Error al generar KPIs de sedes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Función auxiliar para calcular nivel de desempeño
function calcularNivelDesempeño({ ocupacion, ingresos, calificacion, tendencia }) {
  let score = 0;
  
  // Peso por ocupación (40%)
  if (ocupacion >= 80) score += 40;
  else if (ocupacion >= 60) score += 30;
  else if (ocupacion >= 40) score += 20;
  else if (ocupacion >= 20) score += 10;
  
  // Peso por calificación (30%)
  if (calificacion >= 4.5) score += 30;
  else if (calificacion >= 4.0) score += 25;
  else if (calificacion >= 3.5) score += 20;
  else if (calificacion >= 3.0) score += 15;
  
  // Peso por tendencia (20%)
  if (tendencia >= 20) score += 20;
  else if (tendencia >= 10) score += 15;
  else if (tendencia >= 0) score += 10;
  else if (tendencia >= -10) score += 5;
  
  // Peso por ingresos (10%)
  if (ingresos >= 1000000) score += 10;
  else if (ingresos >= 500000) score += 8;
  else if (ingresos >= 100000) score += 6;
  else if (ingresos >= 50000) score += 4;
  
  if (score >= 85) return 'Excelente';
  else if (score >= 70) return 'Bueno';
  else if (score >= 50) return 'Regular';
  else return 'Necesita Mejora';
}

module.exports = router;