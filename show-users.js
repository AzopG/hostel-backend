const mongoose = require('mongoose');
require('dotenv').config();

const Usuario = require('./models/Usuario');

async function showUsers() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        console.log('\n👥 Usuarios existentes:');
        const usuarios = await Usuario.find({}).lean();
        
        usuarios.forEach((user, index) => {
            console.log(`\n--- Usuario ${index + 1} ---`);
            console.log(`ID: ${user._id}`);
            console.log(`Nombre: ${user.nombre}`);
            console.log(`Email: ${user.email}`);
            console.log(`Tipo: ${user.tipo}`);
            console.log(`Empresa: ${user.empresa || 'N/A'}`);
            console.log(`Razón Social: ${user.razonSocial || 'N/A'}`);
            console.log(`NIT: ${user.nit || 'N/A'}`);
            console.log(`Creado: ${user.createdAt}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔒 Conexión cerrada');
        process.exit(0);
    }
}

showUsers();