// Script para crear una reserva de prueba en octubre 2025
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
const connectDB = require('./config/db');

// Importar modelos
const Reserva = require('./models/Reserva');
const Usuario = require('./models/Usuario');
const Hotel = require('./models/Hotel');
const Habitacion = require('./models/Habitacion');

async function crearReservaOctubre() {
  try {
    await connectDB();
    
    console.log('🎯 Creando reserva de prueba para octubre 2025...');

    // Buscar un cliente existente
    const cliente = await Usuario.findOne({ tipo: 'cliente' });
    if (!cliente) {
      console.log('❌ No hay clientes en la base de datos');
      process.exit(1);
    }

    // Buscar un hotel existente
    const hotel = await Hotel.findOne();
    if (!hotel) {
      console.log('❌ No hay hoteles en la base de datos');
      process.exit(1);
    }

    // Buscar una habitación existente
    const habitacion = await Habitacion.findOne({ hotel: hotel._id });
    if (!habitacion) {
      console.log('❌ No hay habitaciones en la base de datos');
      process.exit(1);
    }

    console.log('📋 Datos encontrados:');
    console.log('  - Cliente:', cliente.nombre, cliente.email);
    console.log('  - Hotel:', hotel.nombre);
    console.log('  - Habitación:', habitacion.numero);

    // Generar código de reserva único
    const codigoReserva = await Reserva.generarCodigoReserva();

    // Crear fechas para octubre 2025
    const fechaInicio = new Date(2025, 9, 15); // 15 de octubre 2025
    const fechaFin = new Date(2025, 9, 17);   // 17 de octubre 2025
    const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));

    // Calcular tarifa
    const precioPorNoche = 150000; // $150,000 por noche
    const subtotal = precioPorNoche * noches;
    const impuestos = Math.round(subtotal * 0.19);
    const total = subtotal + impuestos;

    // Crear la reserva (SIN especificar createdAt - se asigna automáticamente)
    const nuevaReserva = new Reserva({
      usuario: cliente._id,
      hotel: hotel._id,
      habitacion: habitacion._id,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      huespedes: 2,
      noches: noches,
      datosHuesped: {
        nombre: cliente.nombre.split(' ')[0] || 'Juan',
        apellido: cliente.nombre.split(' ')[1] || 'Pérez',
        email: cliente.email,
        telefono: cliente.telefono || '+57 300 123 4567',
        documento: '12345678',
        pais: 'Colombia',
        ciudad: 'Bogotá'
      },
      codigoReserva: codigoReserva,
      tarifa: {
        precioPorNoche: precioPorNoche,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total,
        moneda: 'COP'
      },
      estado: 'confirmada',
      metodoPago: 'tarjeta'
    });

    console.log('💾 Guardando reserva...');
    console.log('⏰ NOTA: createdAt se asignará automáticamente por el modelo');

    // Guardar la reserva
    const reservaGuardada = await nuevaReserva.save();

    console.log('✅ ¡Reserva creada exitosamente!');
    console.log('📊 Detalles de la reserva:');
    console.log('  - Código:', reservaGuardada.codigoReserva);
    console.log('  - Fecha inicio:', reservaGuardada.fechaInicio.toLocaleDateString());
    console.log('  - Fecha fin:', reservaGuardada.fechaFin.toLocaleDateString());
    console.log('  - Total: $', reservaGuardada.tarifa.total.toLocaleString('es-CO'));
    console.log('  - Estado:', reservaGuardada.estado);
    console.log('  - 🎯 createdAt:', reservaGuardada.createdAt);
    console.log('  - Mes de createdAt:', reservaGuardada.createdAt.getMonth() + 1);

    // Verificar que la reserva aparezca en las estadísticas
    console.log('\n📈 Verificando estadísticas de octubre...');
    
    const reservasOctubre = await Reserva.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(2025, 9, 1), // Octubre 1, 2025
            $lte: new Date(2025, 9, 31, 23, 59, 59) // Octubre 31, 2025
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          totalIngresos: { $sum: '$tarifa.total' }
        }
      }
    ]);

    console.log('📊 Reservas en octubre:', reservasOctubre);

  } catch (error) {
    console.error('❌ Error creando reserva de prueba:', error);
  } finally {
    await mongoose.disconnect();
    console.log('⚠️ MongoDB desconectado');
  }
}

crearReservaOctubre();