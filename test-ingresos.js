console.log('🧪 Probando estadísticas con nuevo cálculo de ingresos...');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Reserva = require('./models/Reserva');
  
  console.log('\n📊 Verificando cálculo de ingresos...');
  
  // Probar agregación con tarifa.total
  const ingresosResult = await Reserva.aggregate([
    { $match: { estado: 'confirmada' } },
    { $group: { _id: null, total: { $sum: '$tarifa.total' } } }
  ]);
  
  const ingresosTotales = ingresosResult.length > 0 ? ingresosResult[0].total : 0;
  console.log('💰 Ingresos totales calculados:', ingresosTotales);
  
  // Verificar cuántas reservas confirmadas hay
  const totalConfirmadas = await Reserva.countDocuments({ estado: 'confirmada' });
  console.log('✅ Reservas confirmadas:', totalConfirmadas);
  
  // Mostrar detalle de cada reserva confirmada
  const reservasConfirmadas = await Reserva.find({ estado: 'confirmada' }).select('tarifa.total fechaInicio fechaFin');
  console.log('\n📋 Detalle de reservas confirmadas:');
  reservasConfirmadas.forEach((reserva, index) => {
    console.log(`Reserva ${index + 1}: $${reserva.tarifa?.total || 0} - ${reserva.fechaInicio} a ${reserva.fechaFin}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});