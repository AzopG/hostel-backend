const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Hotel = require('./models/Hotel');
const Habitacion = require('./models/Habitacion');
const Salon = require('./models/Salon');

const connectDB = require('./config/db');

const recreateHotelData = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('🔌 Conectado a MongoDB');

    // Verificar si ya hay hoteles
    const hotelCount = await Hotel.countDocuments();
    if (hotelCount > 0) {
      console.log(`⚠️  Ya existen ${hotelCount} hoteles. ¿Quieres continuar? (saltando creación)`);
      await mongoose.connection.close();
      return;
    }

    // 1. Crear hoteles de ejemplo
    console.log('🏨 Creando hoteles...');
    
    const hotel1 = new Hotel({
      nombre: 'Hotel Plaza Central',
      ciudad: 'Madrid',
      direccion: 'Calle Gran Vía 123',
      telefono: '+34 911 222 333',
      email: 'info@plazacentral.com',
      calificacion: 4.5,
      descripcion: 'Hotel elegante en el corazón de Madrid',
      servicios: ['WiFi gratuito', 'Restaurante', 'Gimnasio', 'Spa', 'Bar'],
      politicas: {
        checkIn: '15:00',
        checkOut: '12:00',
        cancelacion: '24 horas antes sin cargo',
        mascotas: true,
        fumadores: false
      },
      fotos: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
      ]
    });
    await hotel1.save();

    const hotel2 = new Hotel({
      nombre: 'Hotel Mar y Sol',
      ciudad: 'Barcelona', 
      direccion: 'Paseo de Gracia 456',
      telefono: '+34 933 444 555',
      email: 'reservas@marysol.com',
      calificacion: 4.2,
      descripcion: 'Hotel moderno cerca de la playa',
      servicios: ['WiFi gratuito', 'Piscina', 'Restaurante', 'Bar en la azotea'],
      politicas: {
        checkIn: '14:00',
        checkOut: '11:00',
        cancelacion: '48 horas antes sin cargo',
        mascotas: false,
        fumadores: false
      },
      fotos: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800'
      ]
    });
    await hotel2.save();

    const hotel3 = new Hotel({
      nombre: 'Hotel Business Center',
      ciudad: 'Bogotá',
      direccion: 'Zona Rosa, Carrera 15 #93-45',
      telefono: '+57 1 555 7890',
      email: 'contacto@businesscenter.com',
      calificacion: 4.7,
      descripcion: 'Hotel ejecutivo con centro de convenciones',
      servicios: ['WiFi gratuito', 'Centro de negocios', 'Salas de reuniones', 'Gimnasio', 'Restaurante'],
      politicas: {
        checkIn: '15:00',
        checkOut: '12:00',
        cancelacion: '24 horas antes sin cargo',
        mascotas: false,
        fumadores: false
      },
      fotos: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'
      ]
    });
    await hotel3.save();

    console.log('✅ Hoteles creados');

    // 2. Crear habitaciones para cada hotel
    console.log('🛏️  Creando habitaciones...');

    const tiposHabitacion = [
      { tipo: 'individual', capacidad: 1, precio: 80000 },
      { tipo: 'doble', capacidad: 2, precio: 120000 },
      { tipo: 'suite', capacidad: 4, precio: 200000 },
      { tipo: 'presidencial', capacidad: 6, precio: 350000 }
    ];

    const hoteles = [hotel1, hotel2, hotel3];
    
    for (const hotel of hoteles) {
      for (let piso = 1; piso <= 5; piso++) {
        for (let numero = 1; numero <= 10; numero++) {
          const tipoIndex = Math.floor(Math.random() * tiposHabitacion.length);
          const tipoInfo = tiposHabitacion[tipoIndex];
          
          const habitacion = new Habitacion({
            hotel: hotel._id,
            numero: `${piso}${numero.toString().padStart(2, '0')}`,
            tipo: tipoInfo.tipo,
            capacidad: tipoInfo.capacidad,
            precio: tipoInfo.precio + (Math.random() * 20000 - 10000), // Variación de precio
            disponible: true,
            descripcion: `Habitación ${tipoInfo.tipo} cómoda y moderna`,
            servicios: [
              'WiFi gratuito',
              'Aire acondicionado',
              'TV LCD',
              'Minibar',
              'Caja fuerte',
              'Baño privado'
            ],
            fotos: [
              `https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800`,
              `https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800`
            ]
          });
          
          await habitacion.save();
        }
      }
      console.log(`✅ Habitaciones creadas para ${hotel.nombre}`);
    }

    // 3. Crear salones para eventos
    console.log('🏢 Creando salones...');

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
      }
      console.log(`✅ Salones creados para ${hotel.nombre}`);
    }

    console.log('🎉 ¡Datos de demo recreados exitosamente!');
    console.log(`📊 Creados: ${hoteles.length} hoteles, ${hoteles.length * 50} habitaciones, ${hoteles.length * 3} salones`);

  } catch (error) {
    console.error('❌ Error recreando datos:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Conexión cerrada');
    process.exit(0);
  }
};

recreateHotelData();