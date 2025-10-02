const mongoose = require('mongoose');
const connectDB = require('./config/database');

async function checkUserHotels() {
  try {
    await connectDB();
    const Usuario = require('./models/Usuario');
    
    const juan = await Usuario.findOne({ nombre: 'Juan' });
    if (juan) {
      console.log('👤 Usuario Juan encontrado:');
      console.log('- ID:', juan._id);
      console.log('- Email:', juan.email);
      console.log('- Rol:', juan.rol);
      console.log('- Hoteles administrados:', juan.hotelesAdministrados || 'Ninguno');
    } else {
      console.log('❌ Usuario Juan no encontrado');
    }
    
    // Verificar hoteles disponibles
    const Hotel = require('./models/Hotel');
    const hoteles = await Hotel.find().select('nombre ciudad');
    console.log('\n🏨 Hoteles disponibles:');
    hoteles.forEach(h => {
      console.log(`- ${h._id}: ${h.nombre} (${h.ciudad})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUserHotels();