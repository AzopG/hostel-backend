const mongoose = require('mongoose');
require('dotenv').config();

const Hotel = require('./models/Hotel');
const Salon = require('./models/Salon');
const connectDB = require('./config/db');

const createSalones = async () => {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB');

    // Obtener todos los hoteles
    const hoteles = await Hotel.find({});
    console.log(`🏨 Encontrados ${hoteles.length} hoteles`);

    const salonesData = [
      {
        nombre: 'Salón Ejecutivo',
        capacidad: 50,
        equipamiento: ['Proyector', 'Sistema de audio', 'WiFi', 'Aire acondicionado'],
        precioPorDia: 150000,
        descripcion: 'Salón ideal para reuniones ejecutivas'
      },
      {
        nombre: 'Salón de Conferencias',
        capacidad: 100,
        equipamiento: ['Proyector HD', 'Sistema de audio profesional', 'Micrófono inalámbrico', 'WiFi', 'Escenario'],
        precioPorDia: 300000,
        descripcion: 'Perfecto para conferencias y presentaciones'
      },
      {
        nombre: 'Salón VIP',
        capacidad: 30,
        equipamiento: ['Pantalla LED 75"', 'Sistema de videoconferencia', 'WiFi', 'Catering'],
        precioPorDia: 200000,
        descripcion: 'Ambiente exclusivo para eventos privados'
      }
    ];

    console.log('🏢 Creando salones...');
    
    for (const hotel of hoteles) {
      for (const salonData of salonesData) {
        const salon = new Salon({
          hotel: hotel._id,
          nombre: salonData.nombre,
          capacidad: salonData.capacidad,
          equipamiento: salonData.equipamiento,
          disponible: true,
          descripcion: salonData.descripcion,
          precioPorDia: salonData.precioPorDia,
          serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Limpieza'],
          fotos: [
            'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
            'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800'
          ],
          layouts: [
            {
              nombre: 'Teatro',
              capacidad: salonData.capacidad,
              descripcion: 'Disposición en filas para presentaciones'
            },
            {
              nombre: 'Banquete',
              capacidad: Math.floor(salonData.capacidad * 0.7),
              descripcion: 'Mesas redondas para eventos sociales'
            },
            {
              nombre: 'Cocktail',
              capacidad: Math.floor(salonData.capacidad * 1.2),
              descripcion: 'Ambiente informal para networking'
            }
          ]
        });
        
        await salon.save();
        console.log(`✅ Creado ${salonData.nombre} para ${hotel.nombre}`);
      }
    }

    console.log('🎉 ¡Salones creados exitosamente!');
    console.log(`📊 Total: ${hoteles.length * salonesData.length} salones`);

  } catch (error) {
    console.error('❌ Error creando salones:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Conexión cerrada');
    process.exit(0);
  }
};

createSalones();