const mongoose = require('mongoose');
const Usuario = require('./models/Usuario');

require('dotenv').config();

async function mostrarUsuarios() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        const usuarios = await Usuario.find({}).select('email tipo nombre');
        
        console.log('\n👥 Usuarios en la base de datos:');
        usuarios.forEach(usuario => {
            console.log(`📧 Email: ${usuario.email} | 👤 Tipo: ${usuario.tipo} | 🏷️ Nombre: ${usuario.nombre}`);
        });
        
        await mongoose.disconnect();
        console.log('\n✅ Desconectado de MongoDB');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

mostrarUsuarios();