// Script para crear datos de prueba para el sistema de estadísticas
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB usando la misma configuración del backend
const connectDB = require('./config/db');

// Importar modelos
const Hotel = require('./models/Hotel');
const Usuario = require('./models/Usuario');
const Reserva = require('./models/Reserva');
const Habitacion = require('./models/Habitacion');
const Salon = require('./models/Salon');
const bcrypt = require('bcryptjs');

async function crearDatosPrueba() {
  try {
    // Usar la misma función de conexión que el backend
    await connectDB();
    
    console.log('🔄 Creando datos de prueba para estadísticas...');

    // Limpiar datos existentes (opcional)
    // await Hotel.deleteMany({});
    // await Usuario.deleteMany({});
    // await Reserva.deleteMany({});

    // 1. Crear usuarios de prueba con nombres colombianos
    const usuarios = [
      {
        nombre: 'Carlos Mendoza',
        email: 'admin@hotelescolombia.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'admin_central',
        activo: true,
        telefono: '+57 1 234 5678',
        ciudad: 'Bogotá'
      },
      {
        nombre: 'María Elena Vargas',
        email: 'admin.candelaria@hotelescolombia.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'admin_hotel',
        activo: true,
        telefono: '+57 1 234 5679',
        ciudad: 'Bogotá'
      },
      {
        nombre: 'Juan Carlos Pérez',
        email: 'juan.perez@gmail.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'cliente',
        activo: true,
        telefono: '+57 300 123 4567',
        ciudad: 'Medellín'
      },
      {
        nombre: 'Empresa Café de Colombia S.A.S',
        email: 'eventos@cafedecolombia.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'empresa',
        nit: '900123456-1',
        activo: true,
        telefono: '+57 1 587 9200',
        ciudad: 'Bogotá'
      },
      {
        nombre: 'Ana Sofía Rodríguez',
        email: 'ana.rodriguez@outlook.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'cliente',
        activo: true,
        telefono: '+57 310 987 6543',
        ciudad: 'Cali'
      },
      {
        nombre: 'Textiles Antioquia Ltda',
        email: 'corporativo@textilesantioquia.com',
        password: await bcrypt.hash('123456', 10),
        rol: 'empresa',
        nit: '890234567-2',
        activo: true,
        telefono: '+57 4 448 9100',
        ciudad: 'Medellín'
      }
    ];

    const usuariosCreados = [];
    for (const userData of usuarios) {
      const existeUsuario = await Usuario.findOne({ email: userData.email });
      if (!existeUsuario) {
        const usuario = new Usuario(userData);
        await usuario.save();
        usuariosCreados.push(usuario);
        console.log(`✅ Usuario creado: ${userData.email}`);
      } else {
        usuariosCreados.push(existeUsuario);
        console.log(`👤 Usuario ya existe: ${userData.email}`);
      }
    }

    // 2. Crear hoteles de prueba en Colombia
    const adminHotel = usuariosCreados.find(u => u.rol === 'admin_hotel');
    const hotelesData = [
      {
        nombre: 'Hotel Boutique La Candelaria',
        ciudad: 'Bogotá',
        direccion: 'Carrera 8 #12-65, La Candelaria',
        telefono: '+57 1 234 5678',
        email: 'info@boutiquecandelaria.com',
        categoria: 5,
        activo: true,
        admin: adminHotel?._id,
        ocupacion: 85,
        habitaciones: [
          { numero: 101, servicios: ['WiFi', 'TV Cable', 'Aire acondicionado', 'Minibar'] },
          { numero: 102, servicios: ['WiFi', 'TV Cable', 'Baño privado', 'Vista a la ciudad'] },
          { numero: 201, servicios: ['WiFi', 'TV Cable', 'Jacuzzi', 'Balcón', 'Caja fuerte'] },
          { numero: 202, servicios: ['WiFi', 'TV Cable', 'Suite presidencial', 'Sala de estar'] }
        ]
      },
      {
        nombre: 'Hotel El Poblado Plaza',
        ciudad: 'Medellín',
        direccion: 'Carrera 43A #11A-80, El Poblado',
        telefono: '+57 4 448 9200',
        email: 'reservas@pobladoplaza.com',
        categoria: 4,
        activo: true,
        ocupacion: 72,
        habitaciones: [
          { numero: 301, servicios: ['WiFi', 'TV Cable', 'Aire acondicionado'] },
          { numero: 302, servicios: ['WiFi', 'TV Cable', 'Vista al parque'] }
        ]
      },
      {
        nombre: 'Hotel Granada Real',
        ciudad: 'Cali',
        direccion: 'Avenida 6N #28N-35, Granada',
        telefono: '+57 2 661 2828',
        email: 'contacto@granadareal.com',
        categoria: 4,
        activo: true,
        ocupacion: 68,
        habitaciones: [
          { numero: 401, servicios: ['WiFi', 'TV Cable', 'Piscina', 'Gimnasio'] }
        ]
      },
      {
        nombre: 'Hotel Centro Histórico',
        ciudad: 'Cartagena',
        direccion: 'Calle de la Moneda #33-41, Centro Histórico',
        telefono: '+57 5 664 9400',
        email: 'info@centrohistorico.com',
        categoria: 5,
        activo: true,
        ocupacion: 90,
        habitaciones: [
          { numero: 501, servicios: ['WiFi', 'TV Cable', 'Aire acondicionado', 'Vista al mar'] },
          { numero: 502, servicios: ['WiFi', 'TV Cable', 'Terraza privada', 'Minibar'] }
        ]
      },
      {
        nombre: 'Hotel Zona Rosa',
        ciudad: 'Barranquilla',
        direccion: 'Carrera 53 #70-10, Zona Rosa',
        telefono: '+57 5 385 7000',
        email: 'reservas@zonarosa.com',
        categoria: 4,
        activo: true,
        ocupacion: 76
      },
      {
        nombre: 'Hotel Coffee Park',
        ciudad: 'Pereira',
        direccion: 'Carrera 13 #15-73, Centro',
        telefono: '+57 6 335 1200',
        email: 'info@coffeepark.com',
        categoria: 3,
        activo: true,
        ocupacion: 65
      },
      {
        nombre: 'Hotel Bambú Plaza',
        ciudad: 'Bucaramanga',
        direccion: 'Calle 36 #31-24, Cabecera',
        telefono: '+57 7 634 5500',
        email: 'contacto@bambuplaza.com',
        categoria: 4,
        activo: true,
        ocupacion: 71
      },
      {
        nombre: 'Hotel Pacífico',
        ciudad: 'Buenaventura',
        direccion: 'Calle 2 #3A-15, Centro',
        telefono: '+57 2 243 1800',
        email: 'info@hotelpacifico.com',
        categoria: 3,
        activo: true,
        ocupacion: 58
      }
    ];

    const hotelesCreados = [];
    for (const hotelData of hotelesData) {
      const existeHotel = await Hotel.findOne({ email: hotelData.email });
      if (!existeHotel) {
        const hotel = new Hotel(hotelData);
        await hotel.save();
        hotelesCreados.push(hotel);
        console.log(`🏨 Hotel creado: ${hotelData.nombre}`);
      } else {
        hotelesCreados.push(existeHotel);
        console.log(`🏨 Hotel ya existe: ${hotelData.nombre}`);
      }
    }

    // 3. Crear reservas de prueba con datos colombianos
    const cliente = usuariosCreados.find(u => u.email === 'juan.perez@gmail.com');
    const empresa = usuariosCreados.find(u => u.email === 'eventos@cafedecolombia.com');
    const hotel = hotelesCreados.find(h => h.nombre === 'Hotel Boutique La Candelaria');

    if (cliente && empresa && hotel) {
      const reservasData = [
        {
          cliente: cliente._id,
          tipo: 'habitacion',
          habitacion: {
            hotel: hotel._id,
            numero: '101',
            tipo: 'individual'
          },
          fechaInicio: new Date('2025-09-15'),
          fechaFin: new Date('2025-09-18'),
          estado: 'confirmada',
          precioTotal: 520000, // 3 noches x 173.333 COP por noche
          fechaCreacion: new Date('2025-09-10'),
          fechaConfirmacion: new Date('2025-09-10'),
          huespedes: 1,
          notas: 'Reserva para viaje de negocios a Bogotá'
        },
        {
          cliente: empresa._id,
          tipo: 'salon',
          salon: {
            hotel: hotel._id,
            nombre: 'Salón Empresarial Simón Bolívar',
            capacidad: 80
          },
          fechaInicio: new Date('2025-09-20'),
          fechaFin: new Date('2025-09-20'),
          estado: 'confirmada',
          precioTotal: 850000, // Salón para evento empresarial
          fechaCreacion: new Date('2025-09-15'),
          fechaConfirmacion: new Date('2025-09-16'),
          notas: 'Evento de lanzamiento de nueva línea de café'
        },
        {
          cliente: cliente._id,
          tipo: 'habitacion',
          habitacion: {
            hotel: hotel._id,
            numero: '201',
            tipo: 'suite'
          },
          fechaInicio: new Date('2025-10-05'),
          fechaFin: new Date('2025-10-07'),
          estado: 'pendiente',
          precioTotal: 950000, // Suite de lujo 2 noches
          fechaCreacion: new Date('2025-09-25'),
          huespedes: 2,
          notas: 'Fin de semana romántico en La Candelaria'
        },
        {
          cliente: empresa._id,
          tipo: 'habitacion',
          habitacion: {
            hotel: hotelesCreados.find(h => h.ciudad === 'Medellín')?._id,
            numero: '301',
            tipo: 'doble'
          },
          fechaInicio: new Date('2025-10-12'),
          fechaFin: new Date('2025-10-15'),
          estado: 'confirmada',
          precioTotal: 1200000, // 3 noches para empleados
          fechaCreacion: new Date('2025-09-28'),
          fechaConfirmacion: new Date('2025-09-29'),
          huespedes: 4,
          notas: 'Alojamiento para equipo de trabajo en Medellín'
        },
        {
          cliente: usuariosCreados.find(u => u.email === 'ana.rodriguez@outlook.com')?._id,
          tipo: 'habitacion',
          habitacion: {
            hotel: hotelesCreados.find(h => h.ciudad === 'Cartagena')?._id,
            numero: '501',
            tipo: 'individual'
          },
          fechaInicio: new Date('2025-10-20'),
          fechaFin: new Date('2025-10-23'),
          estado: 'pendiente',
          precioTotal: 1350000, // 3 noches en Cartagena
          fechaCreacion: new Date('2025-10-01'),
          huespedes: 1,
          notas: 'Vacaciones en el Centro Histórico de Cartagena'
        }
      ];

      for (const reservaData of reservasData) {
        const existeReserva = await Reserva.findOne({
          cliente: reservaData.cliente,
          fechaInicio: reservaData.fechaInicio
        });
        
        if (!existeReserva) {
          const reserva = new Reserva(reservaData);
          await reserva.save();
          console.log(`📅 Reserva creada: ${reservaData.tipo} - ${reservaData.estado}`);
        } else {
          console.log(`📅 Reserva ya existe para la fecha ${reservaData.fechaInicio}`);
        }
      }
    }

    console.log('✅ Datos de prueba colombianos creados exitosamente');
    console.log('\n📊 Resumen:');
    console.log(`- Usuarios: ${usuariosCreados.length}`);
    console.log(`- Hoteles: ${hotelesCreados.length}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log(`- Admin Central: admin@hotelescolombia.com (password: 123456)`);
    console.log(`- Admin Hotel: admin.candelaria@hotelescolombia.com (password: 123456)`);
    console.log(`- Cliente: juan.perez@gmail.com (password: 123456)`);
    console.log(`- Cliente 2: ana.rodriguez@outlook.com (password: 123456)`);
    console.log(`- Empresa: eventos@cafedecolombia.com (password: 123456)`);
    console.log(`- Empresa 2: corporativo@textilesantioquia.com (password: 123456)`);
    console.log('\n🏨 Hoteles creados en Colombia:');
    hotelesCreados.forEach(hotel => {
      console.log(`- ${hotel.nombre} (${hotel.ciudad}) - Ocupación: ${hotel.ocupacion}%`);
    });
    
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Ejecutar el script
crearDatosPrueba();