const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelo
const Hotel = require('./models/Hotel');

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

// Crear hoteles de prueba
const crearHotelesPrueba = async () => {
  try {
    console.log('🔍 Verificando hoteles existentes...');
    
    const hotelesExistentes = await Hotel.countDocuments();
    console.log(`📊 Hoteles existentes: ${hotelesExistentes}`);
    
    if (hotelesExistentes > 0) {
      console.log('ℹ️ Ya existen hoteles. Mostrando lista...');
      const hoteles = await Hotel.find();
      hoteles.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.nombre} - ${hotel.ciudad} (Activo: ${hotel.activo})`);
      });
      return;
    }
    
    console.log('🏗️ Creando hoteles de prueba...');
    
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
        activo: true
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
        activo: true
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
        activo: true
      },
      {
        nombre: 'Hotel Ejecutivo',
        ciudad: 'Cartagena',
        direccion: 'Calle 36 #3-58, Bocagrande',
        telefono: '+57 5 665-4321',
        email: 'info@hotelrejecutivo.com',
        politicas: {
          checkIn: '16:00',
          checkOut: '12:00',
          cancelacion: 24,
          politicaMascotas: true
        },
        fotos: ['https://example.com/hotel-ejecutivo.jpg'],
        calificacion: 4.3,
        activo: true
      }
    ];
    
    for (const hotelData of hotelesData) {
      const hotel = new Hotel(hotelData);
      await hotel.save();
      console.log(`✅ Hotel creado: ${hotel.nombre} - ${hotel.ciudad}`);
    }
    
    console.log('🎉 ¡Hoteles de prueba creados exitosamente!');
    
    // Mostrar resumen final
    const totalHoteles = await Hotel.countDocuments();
    console.log(`📊 Total de hoteles en la base de datos: ${totalHoteles}`);
    
  } catch (error) {
    console.error('❌ Error al crear hoteles:', error);
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  await crearHotelesPrueba();
  
  console.log('✅ Proceso completado. Cerrando conexión...');
  process.exit(0);
};

main().catch(console.error);