const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Usuario = require('./models/Usuario');

require('dotenv').config();

async function crearUsuarioAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Verificar si ya existe
        const existeAdmin = await Usuario.findOne({ email: 'admin.test@hotel.com' });
        if (existeAdmin) {
            console.log('⚠️ El usuario admin.test@hotel.com ya existe');
            await mongoose.disconnect();
            return;
        }
        
        // Crear nuevo usuario admin
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        const nuevoAdmin = new Usuario({
            nombre: 'Admin de Prueba',
            email: 'admin.test@hotel.com',
            password: passwordHash,
            tipo: 'admin_central'
        });
        
        await nuevoAdmin.save();
        console.log('✅ Usuario admin creado exitosamente');
        console.log('📧 Email: admin.test@hotel.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Tipo: admin_central');
        
        await mongoose.disconnect();
        console.log('✅ Desconectado de MongoDB');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

crearUsuarioAdmin();