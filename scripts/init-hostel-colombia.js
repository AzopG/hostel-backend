const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const Usuario = require('../models/Usuario');
const Hotel = require('../models/Hotel');
const Habitacion = require('../models/Habitacion');
const Salon = require('../models/Salon');
const Paquete = require('../models/Paquete');
const Reserva = require('../models/Reserva');
const Evento = require('../models/Evento');

const connectDB = require('../config/db');

const initializeHostelColombia = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('🔌 Conectado a MongoDB - Inicializando Hostel Colombia');

    // Limpiar colecciones existentes
    await Usuario.deleteMany({});
    await Hotel.deleteMany({});
    await Habitacion.deleteMany({});
    await Salon.deleteMany({});
    await Paquete.deleteMany({});
    await Reserva.deleteMany({});
    await Evento.deleteMany({});
    console.log('🧹 Colecciones limpiadas');

    // 1. Crear usuario administrador central de Hostel
    const adminPassword = await bcrypt.hash('hostel2025', 10);
    const adminCentral = new Usuario({
      nombre: 'Administrador Central Hostel',
      email: 'admin@hostel.co',
      password: adminPassword,
      tipo: 'admin_central'
    });
    await adminCentral.save();
    console.log('👑 Admin central Hostel creado');

    // 2. Crear hoteles Hostel en las 5 ciudades principales de Colombia
    const hotelBogota = new Hotel({
      nombre: 'Hostel Bogotá Centro',
      ciudad: 'Bogotá',
      direccion: 'Zona Rosa, Calle 82 #12-15',
      telefono: '+57 1 234 5678'
    });
    await hotelBogota.save();

    const hotelMedellin = new Hotel({
      nombre: 'Hostel Medellín El Poblado',
      ciudad: 'Medellín',
      direccion: 'El Poblado, Carrera 35 #7-108',
      telefono: '+57 4 456 7890'
    });
    await hotelMedellin.save();

    const hotelCali = new Hotel({
      nombre: 'Hostel Cali Zona Norte',
      ciudad: 'Cali',
      direccion: 'Zona Norte, Avenida 6N #25-43',
      telefono: '+57 2 789 0123'
    });
    await hotelCali.save();

    const hotelCartagena = new Hotel({
      nombre: 'Hostel Cartagena Centro Histórico',
      ciudad: 'Cartagena',
      direccion: 'Centro Histórico, Calle del Arsenal',
      telefono: '+57 5 345 6789'
    });
    await hotelCartagena.save();

    const hotelBarranquilla = new Hotel({
      nombre: 'Hostel Barranquilla Norte',
      ciudad: 'Barranquilla',
      direccion: 'Zona Norte, Carrera 52 #76-45',
      telefono: '+57 5 678 9012'
    });
    await hotelBarranquilla.save();
    console.log('🏨 Hoteles Hostel creados en 5 ciudades colombianas');

    // 3. Crear habitaciones para cada hotel (diferentes tipos y capacidades)
    const hoteles = [hotelBogota, hotelMedellin, hotelCali, hotelCartagena, hotelBarranquilla];
    const tiposHabitacion = ['estándar', 'doble', 'suite', 'presidencial'];
    
    for (let i = 0; i < hoteles.length; i++) {
      const hotel = hoteles[i];
      const habitaciones = [];
      
      // Habitaciones estándar (1-2 huéspedes)
      for (let room = 101; room <= 120; room++) {
        const habitacion = new Habitacion({
          hotel: hotel._id,
          numero: room.toString(),
          tipo: 'estándar',
          capacidad: 2,
          servicios: ['WiFi', 'Aire acondicionado', 'TV', 'Baño privado'],
          disponible: true
        });
        await habitacion.save();
        habitaciones.push(habitacion._id);
      }

      // Habitaciones dobles (2-4 huéspedes)
      for (let room = 201; room <= 215; room++) {
        const habitacion = new Habitacion({
          hotel: hotel._id,
          numero: room.toString(),
          tipo: 'doble',
          capacidad: 4,
          servicios: ['WiFi', 'Aire acondicionado', 'TV', 'Minibar', 'Baño privado'],
          disponible: true
        });
        await habitacion.save();
        habitaciones.push(habitacion._id);
      }

      // Suites (4-6 huéspedes)
      for (let room = 301; room <= 310; room++) {
        const habitacion = new Habitacion({
          hotel: hotel._id,
          numero: room.toString(),
          tipo: 'suite',
          capacidad: 6,
          servicios: ['WiFi', 'Aire acondicionado', 'TV 55"', 'Minibar', 'Jacuzzi', 'Sala de estar'],
          disponible: true
        });
        await habitacion.save();
        habitaciones.push(habitacion._id);
      }

      // Habitaciones presidenciales (6-8 huéspedes)
      for (let room = 401; room <= 405; room++) {
        const habitacion = new Habitacion({
          hotel: hotel._id,
          numero: room.toString(),
          tipo: 'presidencial',
          capacidad: 8,
          servicios: ['WiFi', 'Aire acondicionado', 'TV 65"', 'Minibar premium', 'Jacuzzi', 'Sala de estar', 'Cocina', 'Terraza'],
          disponible: true
        });
        await habitacion.save();
        habitaciones.push(habitacion._id);
      }

      hotel.habitaciones = habitaciones;
      await hotel.save();
    }
    console.log('🛏️ Habitaciones creadas para todos los hoteles');

    // 4. Crear salones con diferentes capacidades para eventos empresariales
    const capacidadesSalones = [
      { nombre: 'Salón Pequeño', capacidad: 50 },
      { nombre: 'Salón Mediano', capacidad: 100 },
      { nombre: 'Salón Grande', capacidad: 150 },
      { nombre: 'Salón Principal', capacidad: 300 }
    ];

    for (let hotel of hoteles) {
      const salones = [];
      
      for (let salonData of capacidadesSalones) {
        const salon = new Salon({
          hotel: hotel._id,
          nombre: `${salonData.nombre} - ${hotel.ciudad}`,
          capacidad: salonData.capacidad,
          equipamiento: [
            'Audio profesional',
            'Proyector HD',
            'Sistema de iluminación',
            'WiFi empresarial',
            'Aire acondicionado',
            'Catering disponible',
            'Sonido ambiental',
            'Pantalla LED'
          ],
          disponible: true
        });
        await salon.save();
        salones.push(salon._id);
      }

      hotel.salones = salones;
      await hotel.save();
    }
    console.log('🎪 Salones empresariales creados para todos los hoteles');

    // 5. Crear paquetes empresariales específicos para Colombia
    const paqueteBasico = new Paquete({
      nombre: 'Paquete Empresarial Básico Colombia',
      descripcion: 'Perfecto para reuniones de hasta 50 personas. Incluye salón, equipamiento básico y alojamiento.',
      hoteles: [hotelBogota._id, hotelMedellin._id, hotelCali._id, hotelCartagena._id, hotelBarranquilla._id],
      habitacionesIncluidas: 20,
      salonesIncluidos: 1,
      servicios: [
        'Salón hasta 50 personas',
        'Proyector y audio',
        'WiFi empresarial',
        'Coffee break mañana y tarde',
        'Alojamiento en habitaciones dobles',
        'Desayuno incluido'
      ],
      precio: 2500000 // Pesos colombianos
    });
    await paqueteBasico.save();

    const paqueteMedio = new Paquete({
      nombre: 'Paquete Empresarial Mediano Colombia',
      descripcion: 'Ideal para eventos de hasta 100 personas. Incluye salón, catering y servicios premium.',
      hoteles: [hotelBogota._id, hotelMedellin._id, hotelCali._id, hotelCartagena._id, hotelBarranquilla._id],
      habitacionesIncluidas: 40,
      salonesIncluidos: 1,
      servicios: [
        'Salón hasta 100 personas',
        'Equipamiento audiovisual completo',
        'WiFi empresarial premium',
        'Almuerzo empresarial',
        'Coffee breaks',
        'Alojamiento en suites',
        'Desayuno y cena incluidos',
        'Servicio de transporte'
      ],
      precio: 5000000 // Pesos colombianos
    });
    await paqueteMedio.save();

    const paquetePremium = new Paquete({
      nombre: 'Paquete Empresarial Premium Colombia',
      descripcion: 'Solución completa para grandes eventos hasta 300 personas. Servicio integral de lujo.',
      hoteles: [hotelBogota._id, hotelMedellin._id, hotelCali._id],
      habitacionesIncluidas: 80,
      salonesIncluidos: 2,
      servicios: [
        'Salón principal hasta 300 personas',
        'Salón adicional para reuniones',
        'Equipamiento audiovisual premium',
        'Catering gourmet completo',
        'Servicio de traducción simultánea',
        'Alojamiento en habitaciones presidenciales',
        'Todas las comidas incluidas',
        'Transporte ejecutivo',
        'Coordinador de eventos dedicado',
        'Decoración personalizada'
      ],
      precio: 12000000 // Pesos colombianos
    });
    await paquetePremium.save();
    console.log('📦 Paquetes empresariales Colombia creados');

    // 6. Crear usuarios de prueba con datos colombianos
    const clientePassword = await bcrypt.hash('cliente123', 10);
    const cliente = new Usuario({
      nombre: 'Carlos Rodríguez',
      email: 'carlos@email.co',
      password: clientePassword,
      tipo: 'cliente'
    });
    await cliente.save();

    const empresaPassword = await bcrypt.hash('innovatech123', 10);
    const empresa = new Usuario({
      nombre: 'Ana María Gómez',
      email: 'ana@innovatech.co',
      password: empresaPassword,
      tipo: 'empresa',
      empresa: 'Innovatech Colombia SAS'
    });
    await empresa.save();

    // Admins para cada hotel
    const adminHotels = [];
    const ciudades = ['Bogotá', 'Medellín', 'Cali', 'Cartagena', 'Barranquilla'];
    
    for (let i = 0; i < ciudades.length; i++) {
      const adminPassword = await bcrypt.hash(`admin${ciudades[i].toLowerCase()}123`, 10);
      const adminHotel = new Usuario({
        nombre: `Admin Hostel ${ciudades[i]}`,
        email: `admin.${ciudades[i].toLowerCase()}@hostel.co`,
        password: adminPassword,
        tipo: 'admin_hotel'
      });
      await adminHotel.save();
      adminHotels.push(adminHotel);
    }
    console.log('👥 Usuarios de prueba creados');

    // 7. Crear algunas reservas de ejemplo (incluyendo el escenario de Innovatech)
    const reservaInnovatech = new Reserva({
      usuario: empresa._id,
      hotel: hotelMedellin._id,
      paquete: paqueteMedio._id,
      fechaInicio: new Date('2025-06-12'),
      fechaFin: new Date('2025-06-15'),
      asistentes: ['Ana María Gómez', 'Carlos Méndez', 'Luis Torres', '+ 117 asistentes más'],
      estado: 'confirmada'
    });
    await reservaInnovatech.save();

    const eventoInnovatech = new Evento({
      nombre: 'Seminario Innovatech 2025',
      empresa: empresa._id,
      hotel: hotelMedellin._id,
      salon: hotelMedellin.salones[2], // Salón Grande (150 personas)
      fecha: new Date('2025-06-13'),
      asistentes: Array.from({length: 120}, (_, i) => `Asistente ${i + 1}`),
      paquete: paqueteMedio._id
    });
    await eventoInnovatech.save();
    console.log('📅 Reservas y eventos de ejemplo creados');

    console.log('\n✅ Base de datos Hostel Colombia inicializada correctamente!');
    console.log('\n🇨🇴 Hoteles Hostel disponibles en:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏨 Bogotá: 60 habitaciones, 4 salones (50-300 personas)');
    console.log('🏨 Medellín: 60 habitaciones, 4 salones (50-300 personas)');
    console.log('🏨 Cali: 60 habitaciones, 4 salones (50-300 personas)');
    console.log('🏨 Cartagena: 60 habitaciones, 4 salones (50-300 personas)');
    console.log('🏨 Barranquilla: 60 habitaciones, 4 salones (50-300 personas)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Admin Central: admin@hostel.co / hostel2025');
    console.log('🔐 Cliente: carlos@email.co / cliente123');
    console.log('🔐 Empresa Innovatech: ana@innovatech.co / innovatech123');
    console.log('🔐 Admin Bogotá: admin.bogotá@hostel.co / adminbogotá123');
    console.log('🔐 Admin Medellín: admin.medellín@hostel.co / adminmedellín123');
    console.log('🔐 Admin Cali: admin.cali@hostel.co / admincali123');
    console.log('🔐 Admin Cartagena: admin.cartagena@hostel.co / admincartagena123');
    console.log('🔐 Admin Barranquilla: admin.barranquilla@hostel.co / adminbarranquilla123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📊 Paquetes empresariales disponibles:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💼 Básico (50 personas): $2,500,000 COP');
    console.log('💼 Mediano (100 personas): $5,000,000 COP');
    console.log('💼 Premium (300 personas): $12,000,000 COP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando Hostel Colombia:', error);
    process.exit(1);
  }
};

// Ejecutar inicialización si el archivo se ejecuta directamente
if (require.main === module) {
  initializeHostelColombia();
}

module.exports = initializeHostelColombia;