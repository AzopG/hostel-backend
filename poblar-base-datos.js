const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const Usuario = require('./models/Usuario');
const Hotel = require('./models/Hotel');
const Salon = require('./models/Salon');
const Reserva = require('./models/Reserva');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('❌ Error de conexión MongoDB:', err);
    process.exit(1);
  }
};

// Limpiar base de datos
const limpiarBaseDatos = async () => {
  try {
    console.log('🗑️ Limpiando base de datos...');
    await Usuario.deleteMany({});
    await Hotel.deleteMany({});
    await Salon.deleteMany({});
    await Reserva.deleteMany({});
    console.log('✅ Base de datos limpiada');
  } catch (error) {
    console.error('❌ Error al limpiar base de datos:', error);
  }
};

// Crear usuarios
const crearUsuarios = async () => {
  try {
    console.log('👥 Creando usuarios...');
    
    const usuarios = [
      {
        nombre: 'Admin Central',
        email: 'admin@hotel.com',
        password: await bcrypt.hash('admin123', 10),
        rol: 'admin_central',
        telefono: '+57 1 234-5678',
        activo: true
      },
      {
        nombre: 'Admin Hotel Plaza',
        email: 'admin.plaza@hotel.com',
        password: await bcrypt.hash('admin123', 10),
        rol: 'admin_hotel',
        telefono: '+57 1 342-5678',
        activo: true,
        hotel: null // Se asignará después de crear hoteles
      },
      {
        nombre: 'Admin Hotel Business',
        email: 'admin.business@hotel.com',
        password: await bcrypt.hash('admin123', 10),
        rol: 'admin_hotel',
        telefono: '+57 4 444-5678',
        activo: true,
        hotel: null // Se asignará después de crear hoteles
      },
      {
        nombre: 'Empresa Ejemplo S.A.S',
        email: 'empresa@gmail.com',
        password: await bcrypt.hash('empresa123', 10),
        rol: 'empresa',
        telefono: '+57 1 555-0001',
        activo: true,
        empresa: {
          razonSocial: 'Empresa Ejemplo S.A.S',
          nit: '900123456-1',
          direccion: 'Calle 72 #10-34, Bogotá',
          contactoPrincipal: 'Maria Rodriguez',
          telefonoContacto: '+57 1 555-0001'
        }
      },
      {
        nombre: 'Corporación ABC',
        email: 'corporacion.abc@gmail.com',
        password: await bcrypt.hash('abc123', 10),
        rol: 'empresa',
        telefono: '+57 4 555-0002',
        activo: true,
        empresa: {
          razonSocial: 'Corporación ABC S.A.S',
          nit: '900654321-2',
          direccion: 'Carrera 43A #1-50, Medellín',
          contactoPrincipal: 'Carlos Mendez',
          telefonoContacto: '+57 4 555-0002'
        }
      },
      {
        nombre: 'Juan Cliente',
        email: 'cliente@gmail.com',
        password: await bcrypt.hash('cliente123', 10),
        rol: 'cliente',
        telefono: '+57 1 555-0003',
        activo: true
      },
      {
        nombre: 'Ana Gomez',
        email: 'ana.gomez@gmail.com',
        password: await bcrypt.hash('cliente123', 10),
        rol: 'cliente',
        telefono: '+57 2 555-0004',
        activo: true
      }
    ];
    
    const usuariosCreados = [];
    for (const userData of usuarios) {
      const usuario = new Usuario(userData);
      await usuario.save();
      usuariosCreados.push(usuario);
      console.log(`✅ Usuario creado: ${usuario.nombre} (${usuario.email}) - Rol: ${usuario.rol}`);
    }
    
    return usuariosCreados;
    
  } catch (error) {
    console.error('❌ Error al crear usuarios:', error);
    return [];
  }
};

// Crear hoteles
const crearHoteles = async () => {
  try {
    console.log('🏨 Creando hoteles...');
    
    const hotelesData = [
      {
        nombre: 'Hotel Central Plaza',
        ciudad: 'Bogotá',
        direccion: 'Calle 26 #13-19, Centro',
        telefono: '+57 1 342-5678',
        email: 'info@hotelcentralplaza.com',
        politicas: {
          checkIn: '15:00',
          checkOut: '12:00',
          cancelacion: 24,
          politicaMascotas: false
        },
        fotos: ['https://example.com/hotel-central.jpg'],
        calificacion: 4.2,
        activo: true,
        habitaciones: [
          { numero: 101, tipo: 'individual', servicios: ['WiFi', 'TV', 'Aire acondicionado'] },
          { numero: 102, tipo: 'doble', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar'] },
          { numero: 103, tipo: 'suite', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Jacuzzi'] },
          { numero: 201, tipo: 'individual', servicios: ['WiFi', 'TV', 'Aire acondicionado'] },
          { numero: 202, tipo: 'doble', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar'] }
        ]
      },
      {
        nombre: 'Hotel Business Tower',
        ciudad: 'Medellín',
        direccion: 'Carrera 43A #1-50, El Poblado',
        telefono: '+57 4 444-5678',
        email: 'reservas@businesstower.com',
        politicas: {
          checkIn: '14:00',
          checkOut: '12:00',
          cancelacion: 48,
          politicaMascotas: true
        },
        fotos: ['https://example.com/hotel-business.jpg'],
        calificacion: 4.5,
        activo: true,
        habitaciones: [
          { numero: 301, tipo: 'ejecutiva', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Escritorio'] },
          { numero: 302, tipo: 'suite', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Jacuzzi', 'Sala de estar'] },
          { numero: 303, tipo: 'doble', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar'] },
          { numero: 401, tipo: 'ejecutiva', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Escritorio'] }
        ]
      },
      {
        nombre: 'Hotel Conference Center',
        ciudad: 'Cali',
        direccion: 'Avenida 6N #28N-102, Granada',
        telefono: '+57 2 555-9876',
        email: 'eventos@conferencehotel.com',
        politicas: {
          checkIn: '15:00',
          checkOut: '11:00',
          cancelacion: 24,
          politicaMascotas: false
        },
        fotos: ['https://example.com/hotel-conference.jpg'],
        calificacion: 4.7,
        activo: true,
        habitaciones: [
          { numero: 501, tipo: 'individual', servicios: ['WiFi', 'TV', 'Aire acondicionado'] },
          { numero: 502, tipo: 'doble', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar'] },
          { numero: 503, tipo: 'suite', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Sala de reuniones'] }
        ]
      },
      {
        nombre: 'Hotel Ejecutivo Cartagena',
        ciudad: 'Cartagena',
        direccion: 'Calle 36 #3-58, Bocagrande',
        telefono: '+57 5 665-4321',
        email: 'info@hotelEjecutivo.com',
        politicas: {
          checkIn: '16:00',
          checkOut: '12:00',
          cancelacion: 24,
          politicaMascotas: true
        },
        fotos: ['https://example.com/hotel-ejecutivo.jpg'],
        calificacion: 4.3,
        activo: true,
        habitaciones: [
          { numero: 601, tipo: 'vista_mar', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Balcón'] },
          { numero: 602, tipo: 'suite', servicios: ['WiFi', 'TV', 'Aire acondicionado', 'Minibar', 'Jacuzzi', 'Vista al mar'] }
        ]
      }
    ];
    
    const hotelesCreados = [];
    for (const hotelData of hotelesData) {
      const hotel = new Hotel(hotelData);
      await hotel.save();
      hotelesCreados.push(hotel);
      console.log(`✅ Hotel creado: ${hotel.nombre} - ${hotel.ciudad} (${hotel.habitaciones.length} habitaciones)`);
    }
    
    return hotelesCreados;
    
  } catch (error) {
    console.error('❌ Error al crear hoteles:', error);
    return [];
  }
};

// Asignar hoteles a administradores
const asignarHotelesAAdmins = async (usuarios, hoteles) => {
  try {
    console.log('🔗 Asignando hoteles a administradores...');
    
    const adminPlaza = usuarios.find(u => u.email === 'admin.plaza@hotel.com');
    const adminBusiness = usuarios.find(u => u.email === 'admin.business@hotel.com');
    
    const hotelPlaza = hoteles.find(h => h.nombre === 'Hotel Central Plaza');
    const hotelBusiness = hoteles.find(h => h.nombre === 'Hotel Business Tower');
    
    if (adminPlaza && hotelPlaza) {
      adminPlaza.hotel = hotelPlaza._id;
      await adminPlaza.save();
      console.log(`✅ ${adminPlaza.nombre} asignado a ${hotelPlaza.nombre}`);
    }
    
    if (adminBusiness && hotelBusiness) {
      adminBusiness.hotel = hotelBusiness._id;
      await adminBusiness.save();
      console.log(`✅ ${adminBusiness.nombre} asignado a ${hotelBusiness.nombre}`);
    }
    
  } catch (error) {
    console.error('❌ Error al asignar hoteles:', error);
  }
};

// Crear salones
const crearSalones = async (hoteles) => {
  try {
    console.log('🏛️ Creando salones...');
    
    const salonesCreados = [];
    
    for (const hotel of hoteles) {
      const salonesPorHotel = [
        {
          hotel: hotel._id,
          nombre: 'Salón Ejecutivo',
          capacidad: 50,
          equipamiento: ['Proyector', 'Sistema de audio', 'WiFi', 'Aire acondicionado'],
          disponible: true,
          descripcion: 'Salón ideal para reuniones ejecutivas y presentaciones corporativas',
          precioPorDia: 150000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio de café'],
          fotos: ['https://example.com/salon-ejecutivo.jpg'],
          layouts: [
            { nombre: 'Teatro', capacidad: 50, descripcion: 'Configuración tipo teatro' },
            { nombre: 'Mesa en U', capacidad: 30, descripcion: 'Configuración en U para interacción' }
          ]
        },
        {
          hotel: hotel._id,
          nombre: 'Salón de Conferencias',
          capacidad: 100,
          equipamiento: ['Proyector HD', 'Sistema de audio', 'Micrófono inalámbrico', 'WiFi', 'Aire acondicionado', 'Escenario'],
          disponible: true,
          descripcion: 'Salón amplio para conferencias y eventos grandes',
          precioPorDia: 300000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio completo de catering', 'Estacionamiento'],
          fotos: ['https://example.com/salon-conferencias.jpg'],
          layouts: [
            { nombre: 'Teatro', capacidad: 100, descripcion: 'Configuración tipo teatro' },
            { nombre: 'Banquete', capacidad: 80, descripcion: 'Configuración para banquetes' }
          ]
        },
        {
          hotel: hotel._id,
          nombre: 'Sala de Juntas',
          capacidad: 20,
          equipamiento: ['Pantalla LED 75"', 'Sistema de videoconferencia', 'WiFi', 'Aire acondicionado'],
          disponible: true,
          descripcion: 'Sala íntima para juntas directivas y reuniones pequeñas',
          precioPorDia: 80000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio de café y agua'],
          fotos: ['https://example.com/sala-juntas.jpg'],
          layouts: [
            { nombre: 'Mesa de Juntas', capacidad: 20, descripcion: 'Mesa ovalada para juntas' }
          ]
        }
      ];
      
      // Solo crear Auditorio para hoteles más grandes
      if (hotel.nombre.includes('Conference') || hotel.nombre.includes('Business')) {
        salonesPorHotel.push({
          hotel: hotel._id,
          nombre: 'Auditorio Principal',
          capacidad: 200,
          equipamiento: ['Proyector HD', 'Sistema de audio profesional', 'Micrófono inalámbrico', 'WiFi', 'Aire acondicionado', 'Escenario', 'Iluminación profesional'],
          disponible: true,
          descripcion: 'Auditorio completo para grandes eventos y presentaciones',
          precioPorDia: 500000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio completo de catering', 'Estacionamiento', 'Seguridad'],
          fotos: ['https://example.com/auditorio.jpg'],
          layouts: [
            { nombre: 'Teatro', capacidad: 200, descripcion: 'Configuración tipo teatro con escenario' },
            { nombre: 'Conferencia', capacidad: 150, descripcion: 'Configuración para conferencias con mesas' }
          ]
        });
      }
      
      for (const salonData of salonesPorHotel) {
        const salon = new Salon(salonData);
        await salon.save();
        salonesCreados.push(salon);
        console.log(`✅ Salón creado: ${salon.nombre} (${salon.capacidad} personas) en ${hotel.nombre}`);
      }
    }
    
    return salonesCreados;
    
  } catch (error) {
    console.error('❌ Error al crear salones:', error);
    return [];
  }
};

// Crear reservas de ejemplo
const crearReservas = async (usuarios, salones) => {
  try {
    console.log('📅 Creando reservas de ejemplo...');
    
    const empresa1 = usuarios.find(u => u.email === 'empresa@gmail.com');
    const empresa2 = usuarios.find(u => u.email === 'corporacion.abc@gmail.com');
    const cliente = usuarios.find(u => u.email === 'cliente@gmail.com');
    
    if (!empresa1 || !empresa2 || !cliente || salones.length === 0) {
      console.log('⚠️ No se pueden crear reservas - faltan usuarios o salones');
      return [];
    }
    
    const reservasData = [
      {
        usuario: empresa1._id,
        salon: salones[0]._id,
        fechaInicio: new Date('2025-10-15'),
        fechaFin: new Date('2025-10-16'),
        numeroPersonas: 45,
        estado: 'confirmada',
        precioTotal: 150000,
        serviciosAdicionales: ['Catering básico', 'Servicio de café'],
        observaciones: 'Reunión anual de directores',
        metodoPago: 'transferencia',
        fechaReserva: new Date(),
        datosFacturacion: {
          nombre: empresa1.empresa.razonSocial,
          nit: empresa1.empresa.nit,
          direccion: empresa1.empresa.direccion,
          email: empresa1.email,
          telefono: empresa1.telefono
        }
      },
      {
        usuario: empresa2._id,
        salon: salones[1]._id,
        fechaInicio: new Date('2025-10-20'),
        fechaFin: new Date('2025-10-21'),
        numeroPersonas: 80,
        estado: 'pendiente',
        precioTotal: 300000,
        serviciosAdicionales: ['Catering completo', 'Equipo audiovisual adicional'],
        observaciones: 'Conferencia de lanzamiento de producto',
        metodoPago: 'tarjeta_credito',
        fechaReserva: new Date(),
        datosFacturacion: {
          nombre: empresa2.empresa.razonSocial,
          nit: empresa2.empresa.nit,
          direccion: empresa2.empresa.direccion,
          email: empresa2.email,
          telefono: empresa2.telefono
        }
      },
      {
        usuario: cliente._id,
        salon: salones[2]._id,
        fechaInicio: new Date('2025-10-25'),
        fechaFin: new Date('2025-10-25'),
        numeroPersonas: 15,
        estado: 'confirmada',
        precioTotal: 80000,
        serviciosAdicionales: ['Servicio de café'],
        observaciones: 'Reunión familiar',
        metodoPago: 'efectivo',
        fechaReserva: new Date(),
        datosFacturacion: {
          nombre: cliente.nombre,
          documento: '12345678',
          direccion: 'Calle 123 #45-67',
          email: cliente.email,
          telefono: cliente.telefono
        }
      }
    ];
    
    const reservasCreadas = [];
    for (const reservaData of reservasData) {
      const reserva = new Reserva(reservaData);
      await reserva.save();
      reservasCreadas.push(reserva);
      
      const salon = salones.find(s => s._id.toString() === reservaData.salon.toString());
      const usuario = usuarios.find(u => u._id.toString() === reservaData.usuario.toString());
      console.log(`✅ Reserva creada: ${usuario.nombre} - ${salon.nombre} (${reservaData.fechaInicio.toLocaleDateString()})`);
    }
    
    return reservasCreadas;
    
  } catch (error) {
    console.error('❌ Error al crear reservas:', error);
    return [];
  }
};

// Función principal
const poblarBaseDatos = async () => {
  try {
    console.log('🚀 Iniciando población de base de datos...\n');
    
    // Limpiar base de datos
    await limpiarBaseDatos();
    
    // Crear usuarios
    const usuarios = await crearUsuarios();
    console.log(`\n📊 Usuarios creados: ${usuarios.length}\n`);
    
    // Crear hoteles
    const hoteles = await crearHoteles();
    console.log(`\n📊 Hoteles creados: ${hoteles.length}\n`);
    
    // Asignar hoteles a administradores
    await asignarHotelesAAdmins(usuarios, hoteles);
    console.log('');
    
    // Crear salones
    const salones = await crearSalones(hoteles);
    console.log(`\n📊 Salones creados: ${salones.length}\n`);
    
    // Crear reservas
    const reservas = await crearReservas(usuarios, salones);
    console.log(`\n📊 Reservas creadas: ${reservas.length}\n`);
    
    // Resumen final
    console.log('🎉 ¡Base de datos poblada exitosamente!');
    console.log('═'.repeat(50));
    console.log('📊 RESUMEN FINAL:');
    console.log(`👥 Usuarios: ${usuarios.length}`);
    console.log(`🏨 Hoteles: ${hoteles.length}`);
    console.log(`🏛️ Salones: ${salones.length}`);
    console.log(`📅 Reservas: ${reservas.length}`);
    console.log('═'.repeat(50));
    console.log('\n🔑 CREDENCIALES DE ACCESO:');
    console.log('Admin Central: admin@hotel.com / admin123');
    console.log('Admin Hotel Plaza: admin.plaza@hotel.com / admin123');
    console.log('Admin Hotel Business: admin.business@hotel.com / admin123');
    console.log('Empresa: empresa@gmail.com / empresa123');
    console.log('Corporación ABC: corporacion.abc@gmail.com / abc123');
    console.log('Cliente: cliente@gmail.com / cliente123');
    console.log('Cliente Ana: ana.gomez@gmail.com / cliente123');
    
  } catch (error) {
    console.error('❌ Error al poblar base de datos:', error);
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  await poblarBaseDatos();
  
  console.log('\n✅ Proceso completado. Cerrando conexión...');
  process.exit(0);
};

main().catch(console.error);