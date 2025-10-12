// Script para crear solo reservas de prueba para las estadísticas
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB usando la misma configuración del backend
const connectDB = require('./config/db');

// Importar modelos
const Reserva = require('./models/Reserva');
const Usuario = require('./models/Usuario');

async function crearReservasPrueba() {
  try {
    await connectDB();
    
    console.log('🔄 Creando reservas de prueba para estadísticas...');

    // Buscar usuarios existentes
    const clientes = await Usuario.find({ tipo: 'cliente' }).limit(5);
    
    if (clientes.length === 0) {
      console.log('❌ No hay clientes en la base de datos. Ejecuta primero crear-datos-prueba.js');
      process.exit(1);
    }

    console.log(`📊 Encontrados ${clientes.length} clientes`);

    // Crear reservas distribuidas en los últimos 12 meses
    const reservasPrueba = [];
    const fechaActual = new Date();
    
    // Crear 2-4 reservas por mes en los últimos 6 meses
    for (let mes = 0; mes < 6; mes++) {
      const cantidadReservas = Math.floor(Math.random() * 3) + 2; // 2-4 reservas
      
      for (let i = 0; i < cantidadReservas; i++) {
        const fechaCreacion = new Date(fechaActual.getFullYear(), fechaActual.getMonth() - mes, Math.floor(Math.random() * 28) + 1);
        const fechaInicio = new Date(fechaCreacion);
        fechaInicio.setDate(fechaInicio.getDate() + Math.floor(Math.random() * 30) + 1);
        const fechaFin = new Date(fechaInicio);
        fechaFin.setDate(fechaFin.getDate() + Math.floor(Math.random() * 3) + 1);

        const clienteAleatorio = clientes[Math.floor(Math.random() * clientes.length)];
        const tarifaTotal = (Math.random() * 300 + 100) * 1000; // Entre $100,000 y $400,000

        reservasPrueba.push({
          cliente: clienteAleatorio._id,
          fechaCreacion: fechaCreacion,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
          estado: Math.random() > 0.2 ? 'confirmada' : 'pendiente', // 80% confirmadas
          tarifa: {
            total: Math.round(tarifaTotal)
          },
          // Campos mínimos para que funcione la validación
          habitacion: {
            numero: Math.floor(Math.random() * 200) + 101,
            tipo: 'individual'
          },
          huespedes: Math.floor(Math.random() * 4) + 1,
          metodoPago: 'tarjeta'
        });
      }
    }

    console.log(`📝 Creando ${reservasPrueba.length} reservas de prueba...`);

    // Insertar reservas
    let reservasCreadas = 0;
    for (const reservaData of reservasPrueba) {
      try {
        const reserva = new Reserva(reservaData);
        await reserva.save();
        reservasCreadas++;
        console.log(`✅ Reserva ${reservasCreadas}/${reservasPrueba.length} creada - ${reservaData.fechaCreacion.getMonth() + 1}/${reservaData.fechaCreacion.getFullYear()}`);
      } catch (error) {
        console.log(`⚠️ Error creando reserva: ${error.message}`);
      }
    }

    console.log(`🎉 ¡${reservasCreadas} reservas de prueba creadas exitosamente!`);

    // Mostrar distribución por mes
    const distribucion = await Reserva.aggregate([
      {
        $match: {
          fechaCreacion: {
            $gte: new Date(fechaActual.getFullYear(), 0, 1),
            $lte: new Date(fechaActual.getFullYear(), 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$fechaCreacion' } },
          count: { $sum: 1 },
          totalIngresos: { $sum: '$tarifa.total' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    console.log('\n📊 Distribución de reservas por mes:');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    distribucion.forEach(item => {
      console.log(`${meses[item._id.month - 1]}: ${item.count} reservas - $${item.totalIngresos.toLocaleString('es-CO')}`);
    });

  } catch (error) {
    console.error('❌ Error creando reservas de prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('⚠️ MongoDB desconectado');
  }
}

crearReservasPrueba();