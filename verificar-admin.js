const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

const Hotel = require('./models/Hotel');
const Usuario = require('./models/Usuario');

async function verificarAsociacionAdmin() {
  console.log('🔍 Verificando asociación admin-hotel...');
  
  try {
    // Buscar el admin Maria
    const adminMaria = await Usuario.findOne({ email: 'maria@empresa.com' });
    console.log('👤 Admin Maria:', {
      id: adminMaria._id,
      nombre: adminMaria.nombre,
      email: adminMaria.email,
      tipo: adminMaria.tipo
    });
    
    // Buscar hoteles
    const hoteles = await Hotel.find();
    console.log('\n🏨 Hoteles encontrados:');
    hoteles.forEach(hotel => {
      console.log(`- ${hotel.nombre}: admin=${hotel.admin}`);
    });
    
    // Buscar hotel asignado a Maria
    const hotelMaria = await Hotel.findOne({ admin: adminMaria._id });
    console.log('\n🔍 Hotel asignado a Maria:', hotelMaria ? hotelMaria.nombre : 'Ninguno');
    
    if (!hotelMaria) {
      console.log('\n⚠️  PROBLEMA: No hay hotel asignado a Maria');
      console.log('💡 Sugerencia: Asignar Maria a un hotel o mostrar estadísticas generales');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarAsociacionAdmin();