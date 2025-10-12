const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');
const Reserva = require('./models/Reserva');

(async () => {
  await connectDB();
  console.log('Probando agregado directamente...');
  
  const resultado = await Reserva.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(2025, 0, 1),
          $lte: new Date(2025, 11, 31, 23, 59, 59)
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
  
  console.log('Resultado del agregado:', JSON.stringify(resultado, null, 2));
  mongoose.disconnect();
})();