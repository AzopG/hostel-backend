const mongoose = require('mongoose');
require('dotenv').config();

async function mostrarUsuarios() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        const Usuario = require('./models/Usuario');
        
        const usuarios = await Usuario.find().select('nombre email tipo');
        console.log('\n👥 TODOS LOS USUARIOS EN LA BASE DE DATOS:');
        usuarios.forEach((user, index) => {
            console.log(`${index + 1}. ${user.nombre} - ${user.email} - ${user.tipo}`);
        });

        console.log('\n💡 Intenta hacer login desde el frontend con estos emails');
        console.log('💡 La contraseña probablemente sea "123456" o "password"');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

mostrarUsuarios();