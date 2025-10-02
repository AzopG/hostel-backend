const mongoose = require('mongoose');
require('dotenv').config();

async function verificarDatos() {
    try {
        // Usar MONGO_URI en lugar de MONGODB_URI
        const mongoUri = process.env.MONGO_URI;
        console.log('🔄 Conectando a MongoDB...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB');

        // Importar modelos
        const Usuario = require('./models/Usuario');
        const Hotel = require('./models/Hotel');
        const Reserva = require('./models/Reserva');

        // Contar documentos
        const totalUsuarios = await Usuario.countDocuments();
        const totalHoteles = await Hotel.countDocuments();
        const totalReservas = await Reserva.countDocuments();

        console.log('\n📊 DATOS ACTUALES EN LA BASE DE DATOS:');
        console.log(`👥 Total usuarios: ${totalUsuarios}`);
        console.log(`🏨 Total hoteles: ${totalHoteles}`);
        console.log(`📅 Total reservas: ${totalReservas}`);

        // Mostrar algunos usuarios de ejemplo
        const usuarios = await Usuario.find().limit(5).select('nombre email tipo');
        console.log('\n👤 Usuarios de ejemplo:');
        usuarios.forEach(user => {
            console.log(`  - ${user.nombre} (${user.email}) - ${user.tipo}`);
        });

        // Mostrar algunos hoteles de ejemplo
        const hoteles = await Hotel.find().limit(3).select('nombre ciudad');
        console.log('\n🏨 Hoteles de ejemplo:');
        hoteles.forEach(hotel => {
            console.log(`  - ${hotel.nombre} - ${hotel.ciudad}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verificarDatos();