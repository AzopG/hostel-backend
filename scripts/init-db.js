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

    // Limpiar colecciones existentes (opcional, comentar si no quieres borrar datos)
    // await Usuario.deleteMany({});
    // await Hotel.deleteMany({});
    // await Habitacion.deleteMany({});
    // await Salon.deleteMany({});
    // await Paquete.deleteMany({});
    // console.log('🧹 Colecciones limpiadas');

    // 1. Crear usuario administrador central
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminCentral = new Usuario({
      nombre: 'Administrador Central',
      email: 'admin@hotelchain.com',
      password: adminPassword,
      tipo: 'admin_central'
    });
    await adminCentral.save();
    console.log('👑 Admin central creado');

    // 2. Crear algunos hoteles de ejemplo
    const hotel1 = new Hotel({
      nombre: 'Hotel Plaza Central',
      ciudad: 'Madrid',
      direccion: 'Calle Gran Vía 123',
      telefono: '+34 911 222 333'
    });
    await hotel1.save();

    const hotel2 = new Hotel({
      nombre: 'Hotel Mar y Sol',
      ciudad: 'Barcelona',
      direccion: 'Paseo de Gracia 456',
      telefono: '+34 933 444 555'
    });
    await hotel2.save();

    const hotel3 = new Hotel({
      nombre: 'Hotel Montaña Verde',
      ciudad: 'Bilbao',
      direccion: 'Avenida Principal 789',
      telefono: '+34 944 666 777'
    });
    await hotel3.save();
    console.log('🏨 Hoteles creados');

    // 3. Crear habitaciones para cada hotel
    const habitacionesHotel1 = [];
    for (let i = 101; i <= 120; i++) {
      const habitacion = new Habitacion({
        hotel: hotel1._id,
        numero: i.toString(),
        tipo: i <= 110 ? 'estándar' : 'suite',
        capacidad: i <= 110 ? 2 : 4,
        servicios: i <= 110 ? ['WiFi', 'Aire acondicionado'] : ['WiFi', 'Aire acondicionado', 'Minibar', 'Jacuzzi']
      });
      await habitacion.save();
      habitacionesHotel1.push(habitacion._id);
    }

    const habitacionesHotel2 = [];
    for (let i = 201; i <= 215; i++) {
      const habitacion = new Habitacion({
        hotel: hotel2._id,
        numero: i.toString(),
        tipo: i <= 210 ? 'doble' : 'suite',
        capacidad: i <= 210 ? 2 : 6,
        servicios: ['WiFi', 'Aire acondicionado', 'Vista al mar']
      });
      await habitacion.save();
      habitacionesHotel2.push(habitacion._id);
    }

    const habitacionesHotel3 = [];
    for (let i = 301; i <= 310; i++) {
      const habitacion = new Habitacion({
        hotel: hotel3._id,
        numero: i.toString(),
        tipo: 'estándar',
        capacidad: 3,
        servicios: ['WiFi', 'Calefacción', 'Vista a la montaña']
      });
      await habitacion.save();
      habitacionesHotel3.push(habitacion._id);
    }

    // Actualizar hoteles con sus habitaciones
    hotel1.habitaciones = habitacionesHotel1;
    hotel2.habitaciones = habitacionesHotel2;
    hotel3.habitaciones = habitacionesHotel3;
    await hotel1.save();
    await hotel2.save();
    await hotel3.save();
    console.log('🛏️ Habitaciones creadas y asignadas');

    // 4. Crear salones para eventos
    const salon1 = new Salon({
      hotel: hotel1._id,
      nombre: 'Salón Principal',
      capacidad: 100,
      equipamiento: ['Audio profesional', 'Proyector', 'Escenario', 'Catering']
    });
    await salon1.save();

    const salon2 = new Salon({
      hotel: hotel1._id,
      nombre: 'Sala de Juntas',
      capacidad: 20,
      equipamiento: ['Mesa de conferencias', 'Proyector', 'WiFi premium']
    });
    await salon2.save();

    const salon3 = new Salon({
      hotel: hotel2._id,
      nombre: 'Salón Mediterráneo',
      capacidad: 150,
      equipamiento: ['Audio profesional', 'Iluminación LED', 'Catering', 'Terraza']
    });
    await salon3.save();

    const salon4 = new Salon({
      hotel: hotel3._id,
      nombre: 'Sala Natura',
      capacidad: 50,
      equipamiento: ['Proyector', 'Vista panorámica', 'Catering básico']
    });
    await salon4.save();

    // Actualizar hoteles con sus salones
    hotel1.salones = [salon1._id, salon2._id];
    hotel2.salones = [salon3._id];
    hotel3.salones = [salon4._id];
    await hotel1.save();
    await hotel2.save();
    await hotel3.save();
    console.log('🎪 Salones creados y asignados');

    // 5. Crear algunos paquetes
    const paqueteBasico = new Paquete({
      nombre: 'Paquete Básico Empresarial',
      descripcion: 'Incluye salon, catering básico y alojamiento para 20 personas',
      hoteles: [hotel1._id, hotel2._id, hotel3._id],
      habitacionesIncluidas: 10,
      salonesIncluidos: 1,
      servicios: ['Catering básico', 'Proyector', 'WiFi premium'],
      precio: 2500
    });
    await paqueteBasico.save();

    const paquetePremium = new Paquete({
      nombre: 'Paquete Premium Empresarial',
      descripcion: 'Incluye salon principal, catering gourmet, alojamiento y transporte',
      hoteles: [hotel1._id, hotel2._id],
      habitacionesIncluidas: 25,
      salonesIncluidos: 1,
      servicios: ['Catering gourmet', 'Audio profesional', 'Transporte', 'Decoración'],
      precio: 5000
    });
    await paquetePremium.save();
    console.log('📦 Paquetes creados');

    // 6. Crear usuarios de prueba
    const clientePassword = await bcrypt.hash('cliente123', 10);
    const cliente = new Usuario({
      nombre: 'Juan Pérez',
      email: 'cliente@email.com',
      password: clientePassword,
      tipo: 'cliente'
    });
    await cliente.save();

    const empresaPassword = await bcrypt.hash('empresa123', 10);
    const empresa = new Usuario({
      nombre: 'María García',
      email: 'maria@empresa.com',
      password: empresaPassword,
      tipo: 'empresa',
      empresa: 'TechCorp SA'
    });
    await empresa.save();

    const adminHotelPassword = await bcrypt.hash('hotel123', 10);
    const adminHotel = new Usuario({
      nombre: 'Carlos Ruiz',
      email: 'admin@hotelplaza.com',
      password: adminHotelPassword,
      tipo: 'admin_hotel'
    });
    await adminHotel.save();
    console.log('👥 Usuarios de prueba creados');

    console.log('\n✅ Base de datos inicializada correctamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Admin Central: admin@hotelchain.com / admin123');
    console.log('🔐 Cliente: cliente@email.com / cliente123');
    console.log('🔐 Empresa: maria@empresa.com / empresa123');
    console.log('🔐 Admin Hotel: admin@hotelplaza.com / hotel123');
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