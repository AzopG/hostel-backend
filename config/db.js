const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('🔄 Conectando a MongoDB...');
        console.log(`📍 URI: ${process.env.MONGO_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
        
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 segundos timeout
            socketTimeoutMS: 45000, // 45 segundos socket timeout
        });

        console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
        console.log(`📊 Base de datos: ${conn.connection.name}`);
        
        // Event listeners para monitoreo
        mongoose.connection.on('error', (err) => {
            console.error('❌ Error de MongoDB:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB desconectado');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconectado');
        });

    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
        
        // Mostrar diferentes tipos de errores
        if (error.code === 'ENODATA') {
            console.log('🔧 Soluciones posibles:');
            console.log('   1. Verifica tu conexión a internet');
            console.log('   2. Verifica que el cluster de MongoDB Atlas esté activo');
            console.log('   3. Verifica las credenciales en .env');
            console.log('   4. Verifica que tu IP esté en la whitelist de Atlas');
        } else if (error.name === 'MongoServerSelectionError') {
            console.log('🔧 Error de selección de servidor:');
            console.log('   1. El cluster puede estar pausado');
            console.log('   2. Verifica las credenciales');
            console.log('   3. Verifica la configuración de red');
        }
        
        console.log('\n💡 Alternativa: Usa MongoDB local comentando/descomentando en .env');
        process.exit(1);
    }
};

module.exports = connectDB;