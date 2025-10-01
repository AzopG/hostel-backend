const mongoose = require('mongoose');
require('dotenv').config();

// Importar todos los modelos
const Usuario = require('./models/Usuario');
const Hotel = require('./models/Hotel');
const Habitacion = require('./models/Habitacion');
const Salon = require('./models/Salon');
const Reserva = require('./models/Reserva');

async function checkDatabase() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        console.log(`📊 Base de datos: ${mongoose.connection.name}`);
        console.log(`🌐 Host: ${mongoose.connection.host}`);

        // Verificar cada colección
        const collections = [
            { name: 'Usuarios', model: Usuario },
            { name: 'Hoteles', model: Hotel },
            { name: 'Habitaciones', model: Habitacion },
            { name: 'Salones', model: Salon },
            { name: 'Reservas', model: Reserva }
        ];

        console.log('\n📋 Estado de las colecciones:');
        console.log('=' .repeat(50));

        for (const collection of collections) {
            try {
                const count = await collection.model.countDocuments();
                console.log(`${collection.name}: ${count} documentos`);
                
                if (count > 0) {
                    // Mostrar algunos ejemplos
                    const samples = await collection.model.find({}).limit(2).lean();
                    samples.forEach((doc, index) => {
                        console.log(`  Ejemplo ${index + 1}: ${doc.nombre || doc.email || doc._id}`);
                    });
                }
            } catch (err) {
                console.log(`${collection.name}: ERROR - ${err.message}`);
            }
        }

        // Verificar todas las colecciones en la base de datos
        console.log('\n🗂️  Todas las colecciones disponibles:');
        const db = mongoose.connection.db;
        const collectionsList = await db.listCollections().toArray();
        
        for (const col of collectionsList) {
            const collection = db.collection(col.name);
            const count = await collection.countDocuments();
            console.log(`  ${col.name}: ${count} documentos`);
        }

        // Verificar conexiones activas
        console.log('\n🔗 Información de conexión:');
        console.log(`Estado: ${mongoose.connection.readyState}`); // 1 = connected
        console.log(`Base de datos: ${mongoose.connection.name}`);

    } catch (error) {
        console.error('❌ Error al verificar la base de datos:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔒 Conexión cerrada');
        process.exit(0);
    }
}

checkDatabase();