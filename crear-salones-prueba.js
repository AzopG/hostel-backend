const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Hotel = require('./models/Hotel');
const Salon = require('./models/Salon');

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

// Crear salones de prueba
const crearSalonesPrueba = async () => {
  try {
    console.log('🔍 Buscando hoteles...');
    
    // Obtener todos los hoteles
    const hoteles = await Hotel.find();
    console.log(`📍 Encontrados ${hoteles.length} hoteles`);
    
    if (hoteles.length === 0) {
      console.log('❌ No hay hoteles. Creando hoteles de prueba...');
      
      // Crear un hotel de prueba
      const hotel = new Hotel({
        nombre: 'Hotel Business Center',
        ciudad: 'Bogotá',
        direccion: 'Calle 100 #50-25',
        telefono: '+57 1 234-5678',
        email: 'info@hotelbusinesscenter.com',
        politicas: {
          checkIn: '15:00',
          checkOut: '12:00',
          cancelacion: 24,
          politicaMascotas: false
        },
        fotos: ['https://example.com/hotel1.jpg'],
        calificacion: 4.5,
        activo: true
      });
      
      await hotel.save();
      console.log('✅ Hotel creado:', hotel.nombre);
      hoteles.push(hotel);
    }
    
    // Verificar si ya existen salones
    const salonesExistentes = await Salon.countDocuments();
    console.log(`📊 Salones existentes: ${salonesExistentes}`);
    
    if (salonesExistentes > 0) {
      console.log('ℹ️ Ya existen salones. Mostrando lista...');
      const salones = await Salon.find().populate('hotel', 'nombre');
      salones.forEach(salon => {
        console.log(`- ${salon.nombre} (${salon.capacidad} personas) en ${salon.hotel.nombre}`);
      });
      return;
    }
    
    console.log('🏗️ Creando salones de prueba...');
    
    // Crear salones de prueba para cada hotel
    for (const hotel of hoteles) {
      const salonesPorHotel = [
        {
          hotel: hotel._id,
          nombre: 'Salón Ejecutivo',
          capacidad: 50,
          equipamiento: ['Proyector', 'Sistema de audio', 'WiFi', 'Aire acondicionado'],
          disponible: true,
          descripcion: 'Salón ideal para reuniones ejecutivas y presentaciones',
          precioPorDia: 150000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio de café'],
          fotos: ['https://example.com/salon1.jpg'],
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
          fotos: ['https://example.com/salon2.jpg'],
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
          fotos: ['https://example.com/salon3.jpg'],
          layouts: [
            { nombre: 'Mesa de Juntas', capacidad: 20, descripcion: 'Mesa ovalada para juntas' }
          ]
        },
        {
          hotel: hotel._id,
          nombre: 'Auditorio Principal',
          capacidad: 200,
          equipamiento: ['Proyector HD', 'Sistema de audio profesional', 'Micrófono inalámbrico', 'WiFi', 'Aire acondicionado', 'Escenario', 'Iluminación profesional'],
          disponible: true,
          descripción: 'Auditorio completo para grandes eventos y presentaciones',
          precioPorDia: 500000,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Servicio completo de catering', 'Estacionamiento', 'Seguridad'],
          fotos: ['https://example.com/auditorio.jpg'],
          layouts: [
            { nombre: 'Teatro', capacidad: 200, descripcion: 'Configuración tipo teatro con escenario' },
            { nombre: 'Conferencia', capacidad: 150, descripcion: 'Configuración para conferencias con mesas' }
          ]
        }
      ];
      
      for (const salonData of salonesPorHotel) {
        const salon = new Salon(salonData);
        await salon.save();
        console.log(`✅ Creado: ${salon.nombre} (${salon.capacidad} personas) en ${hotel.nombre}`);
      }
    }
    
    console.log('🎉 ¡Salones de prueba creados exitosamente!');
    
    // Mostrar resumen
    const totalSalones = await Salon.countDocuments();
    console.log(`📊 Total de salones en la base de datos: ${totalSalones}`);
    
  } catch (error) {
    console.error('❌ Error al crear salones:', error);
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  await crearSalonesPrueba();
  
  console.log('✅ Proceso completado. Cerrando conexión...');
  process.exit(0);
};

main().catch(console.error);