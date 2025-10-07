const mongoose = require('mongoose');
require('dotenv').config();
require('./models/ReservaPaquete');
require('./models/Paquete');
require('./models/Hotel');
require('./models/Usuario');

const ReservaPaquete = mongoose.model('ReservaPaquete');
const Paquete = mongoose.model('Paquete');
const Hotel = mongoose.model('Hotel');
const Usuario = mongoose.model('Usuario');

async function debugReservasPaquetes() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Conectado a MongoDB Atlas');
    console.log(`📊 Base de datos: ${mongoose.connection.name}`);
    
    // 1. Verificar cuántas reservas de paquetes hay
    const totalReservas = await ReservaPaquete.countDocuments({});
    console.log(`📊 Total reservas de paquetes: ${totalReservas}`);
    
    if (totalReservas > 0) {
      // 2. Listar todas las reservas con sus hoteles
      const reservas = await ReservaPaquete.find({})
        .populate('hotel', 'nombre ciudad')
        .populate('paquete', 'nombre')
        .populate('usuario', 'nombre email')
        .sort({ createdAt: -1 });
      
      console.log('\n📋 Reservas encontradas:');
      reservas.forEach((reserva, index) => {
        console.log(`\n${index + 1}. Reserva: ${reserva.numeroReserva}`);
        console.log(`   Estado: ${reserva.estado}`);
        console.log(`   Hotel: ${reserva.hotel ? reserva.hotel.nombre : 'NO ASIGNADO'} (ID: ${reserva.hotel?._id || 'NULL'})`);
        console.log(`   Paquete: ${reserva.paquete ? reserva.paquete.nombre : 'NO ENCONTRADO'}`);
        console.log(`   Usuario: ${reserva.usuario ? reserva.usuario.nombre : 'NO ENCONTRADO'}`);
        console.log(`   Empresa: ${reserva.datosEmpresa?.razonSocial || 'NO ESPECIFICADA'}`);
        console.log(`   Fecha evento: ${reserva.fechaInicio}`);
        console.log(`   Creado: ${reserva.createdAt}`);
      });
    }
    
    // 3. Verificar hoteles disponibles
    const hoteles = await Hotel.find({}).select('nombre ciudad');
    console.log(`\n🏨 Hoteles disponibles: ${hoteles.length}`);
    hoteles.forEach(hotel => {
      console.log(`   - ${hotel.nombre} (${hotel.ciudad}) - ID: ${hotel._id}`);
    });
    
    // 4. Verificar paquetes y sus hoteles
    const paquetes = await Paquete.find({})
      .populate('hotel', 'nombre ciudad')
      .select('nombre hotel estado');
    
    console.log(`\n📦 Paquetes disponibles: ${paquetes.length}`);
    paquetes.forEach(paquete => {
      console.log(`   - ${paquete.nombre} (${paquete.estado})`);
      console.log(`     Hotel: ${paquete.hotel ? paquete.hotel.nombre : 'NO ASIGNADO'} - ID: ${paquete.hotel?._id || 'NULL'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugReservasPaquetes();