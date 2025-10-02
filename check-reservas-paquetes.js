const mongoose = require('mongoose');
require('dotenv').config();

async function checkReservations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const ReservaPaquete = require('./models/ReservaPaquete');
    
    const count = await ReservaPaquete.countDocuments();
    console.log('📦 Total reservas de paquetes:', count);
    
    const reservas = await ReservaPaquete.find().populate('hotel', 'nombre').limit(5);
    console.log('📋 Últimas 5 reservas:');
    reservas.forEach(r => {
      console.log(`- ${r.numeroReserva} | ${r.estado} | Hotel: ${r.hotel?.nombre || 'N/A'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkReservations();