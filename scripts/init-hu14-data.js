/**
 * Script de Inicialización de Datos para HU14
 * Búsqueda de Salones para Eventos
 * 
 * Ejecutar: node backend/scripts/init-hu14-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Hotel = require('../models/Hotel');
const Salon = require('../models/Salon');
const Usuario = require('../models/Usuario');
const Reserva = require('../models/Reserva');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hotel-db';

async function initHU14Data() {
  try {
    console.log('🚀 Iniciando configuración de datos para HU14...\n');

    // Conectar a MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB\n');

    // 1. Crear Hoteles de Prueba
    console.log('📍 Creando hoteles...');
    
    const hotel1 = await Hotel.findOneAndUpdate(
      { nombre: 'Hotel Business Center' },
      {
        nombre: 'Hotel Business Center',
        ciudad: 'Bogotá',
        direccion: 'Calle 100 #15-20, Bogotá',
        telefono: '+57 1 234 5678',
        email: 'info@hotelbusiness.com',
        descripcion: 'Hotel especializado en eventos corporativos',
        estrellas: 5
      },
      { upsert: true, new: true }
    );

    const hotel2 = await Hotel.findOneAndUpdate(
      { nombre: 'Hotel Conference Plaza' },
      {
        nombre: 'Hotel Conference Plaza',
        ciudad: 'Medellín',
        direccion: 'Carrera 43A #1-50, Medellín',
        telefono: '+57 4 321 9876',
        email: 'eventos@conferenceplaza.com',
        descripcion: 'Centro de convenciones y eventos',
        estrellas: 4
      },
      { upsert: true, new: true }
    );

    console.log(`  ✓ Hotel 1: ${hotel1.nombre} (${hotel1._id})`);
    console.log(`  ✓ Hotel 2: ${hotel2.nombre} (${hotel2._id})\n`);

    // 2. Crear Salones para Hotel 1 (Business Center)
    console.log('🏢 Creando salones para Hotel Business Center...');

    const salonesHotel1 = [
      {
        hotel: hotel1._id,
        nombre: 'Salón Ejecutivo',
        capacidad: 30,
        equipamiento: ['Proyector', 'WiFi', 'Pizarra', 'Aire acondicionado'],
        disponible: true,
        descripcion: 'Salón ideal para reuniones ejecutivas y juntas directivas. Ambiente privado y profesional.',
        precioPorDia: 200000,
        serviciosIncluidos: ['WiFi de alta velocidad', 'Aire acondicionado', 'Café y agua', 'Estacionamiento'],
        fotos: []
      },
      {
        hotel: hotel1._id,
        nombre: 'Salón Corporativo A',
        capacidad: 80,
        equipamiento: ['Proyector', 'Sistema de audio', 'Micrófono inalámbrico', 'WiFi', 'Aire acondicionado', 'Pizarra'],
        disponible: true,
        descripcion: 'Salón versátil para conferencias, capacitaciones y presentaciones corporativas de mediano tamaño.',
        precioPorDia: 500000,
        serviciosIncluidos: ['WiFi de alta velocidad', 'Aire acondicionado', 'Sistema de videoconferencia', 'Catering básico', 'Estacionamiento gratuito', 'Soporte técnico'],
        fotos: []
      },
      {
        hotel: hotel1._id,
        nombre: 'Gran Salón de Eventos',
        capacidad: 200,
        equipamiento: ['Proyector HD', 'Sistema de audio profesional', 'Micrófono inalámbrico', 'Micrófono de mano', 'WiFi', 'Aire acondicionado', 'Escenario', 'Iluminación profesional', 'Pizarra'],
        disponible: true,
        descripcion: 'Salón principal para grandes eventos corporativos, conferencias, lanzamientos de productos y galas empresariales. Con escenario y capacidad para 200 personas.',
        precioPorDia: 1200000,
        serviciosIncluidos: ['WiFi de alta velocidad', 'Aire acondicionado', 'Sistema de videoconferencia HD', 'Catering completo', 'Estacionamiento VIP', 'Seguridad privada', 'Soporte técnico dedicado', 'Decoración básica'],
        fotos: []
      },
      {
        hotel: hotel1._id,
        nombre: 'Sala de Juntas Premium',
        capacidad: 15,
        equipamiento: ['Pantalla LED 75"', 'Sistema de videoconferencia', 'WiFi', 'Aire acondicionado', 'Pizarra interactiva'],
        disponible: true,
        descripcion: 'Sala de juntas de lujo para reuniones de alto nivel. Equipamiento tecnológico de última generación.',
        precioPorDia: 350000,
        serviciosIncluidos: ['WiFi empresarial', 'Aire acondicionado', 'Videoconferencia 4K', 'Café gourmet', 'Servicio de secretariado'],
        fotos: []
      }
    ];

    const salones1 = [];
    for (const salonData of salonesHotel1) {
      const salon = await Salon.findOneAndUpdate(
        { hotel: hotel1._id, nombre: salonData.nombre },
        salonData,
        { upsert: true, new: true }
      );
      salones1.push(salon);
      console.log(`  ✓ ${salon.nombre} - Capacidad: ${salon.capacidad} personas - $${salon.precioPorDia.toLocaleString()}/día`);
    }

    // 3. Crear Salones para Hotel 2 (Conference Plaza)
    console.log('\n🏢 Creando salones para Hotel Conference Plaza...');

    const salonesHotel2 = [
      {
        hotel: hotel2._id,
        nombre: 'Salón Medellín',
        capacidad: 120,
        equipamiento: ['Proyector', 'Sistema de audio', 'Micrófono', 'WiFi', 'Aire acondicionado'],
        disponible: true,
        descripcion: 'Salón con vista panorámica de la ciudad. Ideal para eventos corporativos.',
        precioPorDia: 750000,
        serviciosIncluidos: ['WiFi', 'Aire acondicionado', 'Catering', 'Estacionamiento'],
        fotos: []
      },
      {
        hotel: hotel2._id,
        nombre: 'Auditorio Principal',
        capacidad: 300,
        equipamiento: ['Proyector HD', 'Sistema de audio profesional', 'Escenario', 'Micrófono', 'WiFi', 'Aire acondicionado', 'Iluminación'],
        disponible: true,
        descripcion: 'Auditorio de gran capacidad para conferencias y convenciones.',
        precioPorDia: 1800000,
        serviciosIncluidos: ['WiFi empresarial', 'Aire acondicionado', 'Catering completo', 'Seguridad', 'Soporte técnico', 'Estacionamiento VIP'],
        fotos: []
      },
      {
        hotel: hotel2._id,
        nombre: 'Sala Innovación',
        capacidad: 50,
        equipamiento: ['Pantalla interactiva', 'Videoconferencia', 'WiFi', 'Aire acondicionado', 'Pizarra inteligente'],
        disponible: true,
        descripcion: 'Espacio moderno para brainstorming, workshops y presentaciones innovadoras.',
        precioPorDia: 400000,
        serviciosIncluidos: ['WiFi de alta velocidad', 'Aire acondicionado', 'Herramientas de colaboración digital', 'Café'],
        fotos: []
      }
    ];

    const salones2 = [];
    for (const salonData of salonesHotel2) {
      const salon = await Salon.findOneAndUpdate(
        { hotel: hotel2._id, nombre: salonData.nombre },
        salonData,
        { upsert: true, new: true }
      );
      salones2.push(salon);
      console.log(`  ✓ ${salon.nombre} - Capacidad: ${salon.capacidad} personas - $${salon.precioPorDia.toLocaleString()}/día`);
    }

    // 4. Crear Usuario Empresa de Prueba
    console.log('\n👤 Creando usuario empresa de prueba...');

    const hashedPassword = await bcrypt.hash('Empresa123!', 12);

    const empresaUsuario = await Usuario.findOneAndUpdate(
      { email: 'empresa@test.com' },
      {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'empresa@test.com',
        password: hashedPassword,
        telefono: '+57 300 123 4567',
        tipoUsuario: 'empresa',
        razonSocial: 'Tech Solutions S.A.S.',
        nit: '900123456-7',
        contactoEmpresa: {
          nombreContacto: 'Juan Pérez',
          cargoContacto: 'Gerente de Eventos',
          telefonoContacto: '+57 300 123 4567'
        }
      },
      { upsert: true, new: true }
    );

    console.log(`  ✓ Usuario: ${empresaUsuario.email}`);
    console.log(`  ✓ Empresa: ${empresaUsuario.razonSocial}`);
    console.log(`  ✓ NIT: ${empresaUsuario.nit}`);
    console.log(`  ✓ Password: Empresa123!`);

    // 5. Crear Reservas de Prueba (para testing de disponibilidad)
    console.log('\n📅 Creando reservas de prueba...');

    // Reserva confirmada en Salón Corporativo A (fechas 25-26 dic 2024)
    const reserva1 = await Reserva.findOneAndUpdate(
      {
        salon: salones1[1]._id,
        fechaInicio: new Date('2024-12-25T00:00:00.000Z')
      },
      {
        salon: salones1[1]._id,
        usuario: empresaUsuario._id,
        fechaInicio: new Date('2024-12-25T00:00:00.000Z'),
        fechaFin: new Date('2024-12-26T00:00:00.000Z'),
        estado: 'confirmada',
        precioTotal: 500000,
        numeroPersonas: 60,
        observaciones: 'Reserva de prueba para HU14 - Conferencia anual'
      },
      { upsert: true, new: true }
    );

    console.log(`  ✓ Reserva 1: ${salones1[1].nombre} - 25-26 dic 2024 (confirmada)`);

    // Reserva pendiente en Gran Salón (fechas 28-30 dic 2024)
    const reserva2 = await Reserva.findOneAndUpdate(
      {
        salon: salones1[2]._id,
        fechaInicio: new Date('2024-12-28T00:00:00.000Z')
      },
      {
        salon: salones1[2]._id,
        usuario: empresaUsuario._id,
        fechaInicio: new Date('2024-12-28T00:00:00.000Z'),
        fechaFin: new Date('2024-12-30T00:00:00.000Z'),
        estado: 'pendiente',
        precioTotal: 2400000,
        numeroPersonas: 150,
        observaciones: 'Reserva de prueba para HU14 - Evento de fin de año'
      },
      { upsert: true, new: true }
    );

    console.log(`  ✓ Reserva 2: ${salones1[2].nombre} - 28-30 dic 2024 (pendiente)`);

    // Actualizar referencias en salones
    await Salon.findByIdAndUpdate(salones1[1]._id, {
      $addToSet: { reservas: reserva1._id }
    });
    await Salon.findByIdAndUpdate(salones1[2]._id, {
      $addToSet: { reservas: reserva2._id }
    });

    // 6. Resumen
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    console.log('═'.repeat(60));
    console.log(`✅ Hoteles creados: 2`);
    console.log(`   - ${hotel1.nombre} (${salones1.length} salones)`);
    console.log(`   - ${hotel2.nombre} (${salones2.length} salones)`);
    console.log(`\n✅ Total de salones: ${salones1.length + salones2.length}`);
    console.log(`   - Capacidad mínima: 15 personas`);
    console.log(`   - Capacidad máxima: 300 personas`);
    console.log(`\n✅ Usuarios empresa: 1`);
    console.log(`   - Email: empresa@test.com`);
    console.log(`   - Password: Empresa123!`);
    console.log(`\n✅ Reservas de prueba: 2`);
    console.log(`   - Confirmada: ${salones1[1].nombre} (25-26 dic)`);
    console.log(`   - Pendiente: ${salones1[2].nombre} (28-30 dic)`);

    console.log('\n🧪 CASOS DE PRUEBA DISPONIBLES:');
    console.log('═'.repeat(60));
    console.log('1. Búsqueda con resultados:');
    console.log(`   - Hotel: ${hotel1._id}`);
    console.log('   - Capacidad: 50');
    console.log('   - Fechas: 2024-12-20 a 2024-12-22');
    console.log('   - Resultado esperado: 2 salones (Corporativo A y Gran Salón)');
    
    console.log('\n2. Búsqueda con conflicto:');
    console.log(`   - Hotel: ${hotel1._id}`);
    console.log('   - Capacidad: 50');
    console.log('   - Fechas: 2024-12-25 a 2024-12-27');
    console.log('   - Resultado esperado: 1 salón (Gran Salón, Corporativo A ocupado)');
    
    console.log('\n3. Sin resultados (capacidad alta):');
    console.log(`   - Hotel: ${hotel1._id}`);
    console.log('   - Capacidad: 500');
    console.log('   - Resultado esperado: 0 salones con sugerencias');
    
    console.log('\n4. Ordenamiento por precio:');
    console.log('   - Verificar orden: Ejecutivo < Corporativo A < Gran Salón');
    
    console.log('\n5. Verificación específica:');
    console.log(`   - GET /api/salon/${salones1[1]._id}/disponibilidad`);
    console.log('   - Fechas: 2024-12-25 a 2024-12-26');
    console.log('   - Resultado esperado: No disponible (conflicto)');

    console.log('\n🎯 ENDPOINTS PARA TESTING:');
    console.log('═'.repeat(60));
    console.log(`GET /api/salon/buscar?hotelId=${hotel1._id}&capacidadMinima=50&fechaInicio=2024-12-20&fechaFin=2024-12-22`);
    console.log(`GET /api/salon/${salones1[0]._id}`);
    console.log(`GET /api/salon/${salones1[1]._id}/disponibilidad?fechaInicio=2024-12-25&fechaFin=2024-12-27`);

    console.log('\n✅ Inicialización completada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada');
  }
}

// Ejecutar
if (require.main === module) {
  initHU14Data()
    .then(() => {
      console.log('\n✨ Script finalizado con éxito');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script finalizado con errores:', error);
      process.exit(1);
    });
}

module.exports = { initHU14Data };
