const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI);

const Hotel = require('./models/Hotel');
const Reserva = require('./models/Reserva');
const Usuario = require('./models/Usuario');

async function testEstadisticasEndpoint() {
  console.log('🧪 Probando endpoint de estadísticas generales...');
  
  try {
    // Simular el cálculo que hace el endpoint para admin_central
    const totalHoteles = await Hotel.countDocuments();
    console.log('🏨 Total hoteles:', totalHoteles);
    
    const totalReservas = await Reserva.countDocuments();
    console.log('📅 Total reservas:', totalReservas);
    
    const totalClientes = await Usuario.countDocuments({ tipo: 'cliente' });
    console.log('👥 Total clientes:', totalClientes);
    
    // Calcular ingresos totales
    const ingresosResult = await Reserva.aggregate([
      { $match: { estado: 'confirmada' } },
      { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
    ]);
    const ingresosTotales = ingresosResult.length > 0 ? ingresosResult[0].total : 0;
    console.log('💰 Ingresos totales:', ingresosTotales);
    
    const stats = {
      totalHoteles,
      totalReservas,
      totalClientes,
      ingresosTotales,
      reservasPorMes: [],
      ocupacionPromedio: 0
    };
    
    console.log('\n📊 Estadísticas finales que debería devolver el endpoint:');
    console.log(JSON.stringify(stats, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testEstadisticasEndpoint();