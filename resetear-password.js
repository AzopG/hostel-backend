const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetearPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        const Usuario = require('./models/Usuario');
        
        // Resetear la contraseña del admin central a "123456"
        const email = 'admin@hotelchain.com';
        const newPassword = '123456';
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const resultado = await Usuario.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (resultado) {
            console.log(`✅ Contraseña actualizada para ${email}`);
            console.log(`📧 Email: ${email}`);
            console.log(`🔐 Nueva contraseña: ${newPassword}`);
            console.log(`👤 Tipo: ${resultado.tipo}`);
        } else {
            console.log(`❌ No se encontró usuario con email: ${email}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetearPassword();