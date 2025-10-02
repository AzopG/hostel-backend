const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const Usuario = require('../models/Usuario');
const Hotel = require('../models/Hotel');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Paquete = require('../models/Paquete');

const connectDB = require('../config/db');

const initializeDatabase = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('🔌 Conectado a MongoDB');
    // Crear solo el usuario admin hotel
    const adminHotelPassword = await bcrypt.hash('hotel123', 10);
    const adminHotel = new Usuario({
      nombre: 'Admin Hotel',
      email: 'admin@hotel.com',
      password: adminHotelPassword,
      tipo: 'admin_hotel'
    });
    await adminHotel.save();
    console.log('� Usuario admin hotel creado');

    console.log('\n✅ Base de datos inicializada correctamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Admin Hotel: admin@hotel.com / hotel123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    process.exit(1);
  }
};

// Ejecutar inicialización si el archivo se ejecuta directamente
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;