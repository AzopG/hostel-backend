const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

const Reserva = require('./models/Reserva');

async function verificarReservas() {
  console.log('🔍 Verificando estado de las reservas...');
  
  try {
    const todasReservas = await Reserva.find();
    console.log(`📊 Total reservas en BD: ${todasReservas.length}`);
    
    const reservasConfirmadas = await Reserva.find({ estado: 'confirmada' });
    console.log(`✅ Reservas confirmadas: ${reservasConfirmadas.length}`);
    
    if (todasReservas.length > 0) {
      console.log('\n📋 Todas las reservas:');
      todasReservas.forEach((reserva, index) => {
        console.log(`${index + 1}. Estado: ${reserva.estado}, Precio: $${reserva.tarifa?.total || 'N/A'}`);
      });
    }
    
    if (reservasConfirmadas.length > 0) {
      console.log('\n💰 Cálculo de ingresos:');
      const ingresosResult = await Reserva.aggregate([
        { $match: { estado: 'confirmada' } },
        { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
      ]);
      console.log('Resultado agregación:', ingresosResult);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarReservas();