const mongoose = require('mongoose');
require('dotenv').config();

async function analizarReservas() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        const Reserva = require('./models/Reserva');
        const reservas = await Reserva.find();
        
        console.log('\n=== ANÁLISIS DE RESERVAS ===');
        console.log('📊 Total reservas:', reservas.length);
        
        reservas.forEach((r, i) => {
            console.log(`\n${i+1}. Reserva ID: ${r._id}`);
            console.log(`   Estado: ${r.estado}`);
            console.log(`   PrecioTotal: ${r.precioTotal}`);
            console.log(`   Precio: ${r.precio}`);
            console.log(`   Total: ${r.total}`);
            
            // Mostrar todos los campos para debug
            const campos = Object.keys(r.toObject());
            console.log(`   Campos disponibles: ${campos.join(', ')}`);
        });

        // Verificar si hay algún campo de precio
        const primeraReserva = reservas[0];
        if (primeraReserva) {
            console.log('\n🔍 ESTRUCTURA DE PRIMERA RESERVA:');
            console.log(JSON.stringify(primeraReserva.toObject(), null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

analizarReservas();