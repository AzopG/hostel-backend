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

// Verificar y corregir salones sin hotel
const verificarYCorregirSalones = async () => {
  try {
    console.log('🔍 Verificando salones y hoteles...');
    
    // Verificar hoteles
    const hoteles = await Hotel.find();
    console.log(`📍 Hoteles encontrados: ${hoteles.length}`);
    
    if (hoteles.length === 0) {
      console.log('❌ No hay hoteles. Creando hotel de prueba...');
      
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
    
    // Verificar salones
    const salones = await Salon.find().populate('hotel');
    console.log(`📊 Salones encontrados: ${salones.length}`);
    
    // Encontrar salones sin hotel
    const salonesSinHotel = salones.filter(salon => !salon.hotel);
    console.log(`⚠️ Salones sin hotel: ${salonesSinHotel.length}`);
    
    if (salonesSinHotel.length > 0) {
      console.log('🔧 Corrigiendo salones sin hotel...');
      const primerHotel = hoteles[0];
      
      for (const salon of salonesSinHotel) {
        salon.hotel = primerHotel._id;
        await salon.save();
        console.log(`✅ Corregido: ${salon.nombre} ahora pertenece a ${primerHotel.nombre}`);
      }
    }
    
    // Mostrar resumen final
    console.log('\n📋 RESUMEN FINAL:');
    const salonesFinales = await Salon.find().populate('hotel');
    salonesFinales.forEach(salon => {
      const hotelNombre = salon.hotel ? salon.hotel.nombre : 'SIN HOTEL';
      console.log(`- ${salon.nombre} (${salon.capacidad} personas) → ${hotelNombre}`);
    });
    
    console.log(`\n✅ Total: ${salonesFinales.length} salones asociados a hoteles`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Ejecutar
const main = async () => {
  await connectDB();
  await verificarYCorregirSalones();
  
  console.log('✅ Verificación completada. Cerrando conexión...');
  process.exit(0);
};

main().catch(console.error);