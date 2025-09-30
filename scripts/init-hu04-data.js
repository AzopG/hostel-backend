/**
 * Script para inicializar datos de prueba HU04
 * Crea hoteles en diferentes ciudades con habitaciones
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Modelos
const Hotel = require('../models/Hotel');
const Habitacion = require('../models/Habitacion');
const Reserva = require('../models/Reserva');
const Usuario = require('../models/Usuario');

const initHU04Data = async () => {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Limpiar datos existentes (opcional)
    console.log('🗑️  Limpiando datos existentes...');
    // await Hotel.deleteMany({});
    // await Habitacion.deleteMany({});
    // await Reserva.deleteMany({});

    // Crear hoteles en diferentes ciudades
    console.log('🏨 Creando hoteles...');
    
    const ciudades = [
      { nombre: 'Bogotá', hoteles: 3 },
      { nombre: 'Medellín', hoteles: 2 },
      { nombre: 'Cartagena', hoteles: 2 },
      { nombre: 'Cali', hoteles: 1 },
      { nombre: 'Barranquilla', hoteles: 1 }
    ];

    for (const ciudad of ciudades) {
      console.log(`\n📍 Ciudad: ${ciudad.nombre}`);
      
      for (let i = 1; i <= ciudad.hoteles; i++) {
        // Crear hotel
        const hotel = await Hotel.create({
          nombre: `Hotel Paradise ${ciudad.nombre} ${i}`,
          direccion: `Calle ${i} # ${10 + i}-${20 + i}`,
          ciudad: ciudad.nombre,
          telefono: `+57 ${300 + i}${i}${i}${i}${i}${i}${i}${i}`,
          email: `hotel${i}.${ciudad.nombre.toLowerCase().replace(/\s/g, '')}@paradise.com`,
          descripcion: `Hotel de lujo en ${ciudad.nombre} con excelentes servicios`,
          servicios: ['WiFi', 'Piscina', 'Restaurante', 'Spa', 'Gimnasio']
        });

        console.log(`  ✅ ${hotel.nombre}`);

        // Crear habitaciones para este hotel
        const tiposHabitacion = [
          { tipo: 'Individual', precio: 150000, capacidad: 1, cantidad: 3 },
          { tipo: 'Doble', precio: 250000, capacidad: 2, cantidad: 5 },
          { tipo: 'Suite', precio: 450000, capacidad: 4, cantidad: 2 }
        ];

        for (const tipoHab of tiposHabitacion) {
          for (let num = 1; num <= tipoHab.cantidad; num++) {
            const numeroHabitacion = `${i}${tipoHab.tipo.substring(0, 1)}${num.toString().padStart(2, '0')}`;
            
            await Habitacion.create({
              hotel: hotel._id,
              numero: numeroHabitacion,
              tipo: tipoHab.tipo,
              precio: tipoHab.precio,
              capacidad: tipoHab.capacidad,
              disponible: true,
              descripcion: `Habitación ${tipoHab.tipo} con vista panorámica`,
              servicios: ['TV', 'Aire Acondicionado', 'Minibar', 'WiFi']
            });
          }
          
          console.log(`    🛏️  ${tipoHab.cantidad} habitaciones ${tipoHab.tipo}`);
        }
      }
    }

    // Crear algunas reservas para probar disponibilidad
    console.log('\n📅 Creando reservas de prueba...');
    
    // Buscar un usuario existente o crear uno de prueba
    let usuario = await Usuario.findOne({ email: 'test@test.com' });
    if (!usuario) {
      usuario = await Usuario.create({
        nombre: 'Usuario Test',
        email: 'test@test.com',
        password: 'hashedpassword123',
        telefono: '+57 3001234567',
        rol: 'cliente',
        tipo: 'cliente'
      });
      console.log('  ✅ Usuario de prueba creado');
    }

    // Obtener algunas habitaciones
    const habitaciones = await Habitacion.find().limit(10);
    
    // Crear reservas en diferentes fechas
    const hoy = new Date();
    const reservasCreadas = [];

    for (let i = 0; i < Math.min(5, habitaciones.length); i++) {
      const habitacion = habitaciones[i];
      const inicioOffset = i * 3; // Espaciar las reservas
      const duracion = 2 + (i % 3); // 2-4 días
      
      const fechaInicio = new Date(hoy);
      fechaInicio.setDate(fechaInicio.getDate() + inicioOffset);
      
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + duracion);

      const reserva = await Reserva.create({
        usuario: usuario._id,
        hotel: habitacion.hotel,
        habitacion: habitacion._id,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        precioTotal: habitacion.precio * duracion,
        estado: 'confirmada',
        metodoPago: 'tarjeta',
        observaciones: 'Reserva de prueba HU04'
      });

      reservasCreadas.push(reserva);
      console.log(`  ✅ Reserva ${i + 1}: Hab ${habitacion.numero} del ${fechaInicio.toLocaleDateString()} al ${fechaFin.toLocaleDateString()}`);
    }

    // Resumen
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    const totalHoteles = await Hotel.countDocuments();
    const totalHabitaciones = await Habitacion.countDocuments();
    const totalReservas = await Reserva.countDocuments();
    const ciudadesUnicas = await Hotel.distinct('ciudad');

    console.log(`  🏨 Hoteles: ${totalHoteles}`);
    console.log(`  🛏️  Habitaciones: ${totalHabitaciones}`);
    console.log(`  📅 Reservas: ${totalReservas}`);
    console.log(`  🌆 Ciudades: ${ciudadesUnicas.length} (${ciudadesUnicas.join(', ')})`);

    console.log('\n✨ ¡Datos de prueba HU04 creados exitosamente!');
    console.log('✅ Ahora puedes probar el calendario de disponibilidad por ciudad\n');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
    process.exit(0);
  }
};

// Ejecutar
initHU04Data();
