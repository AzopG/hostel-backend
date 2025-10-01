/**
 * Diagnóstico completo de MongoDB Atlas
 * Ayuda a identificar problemas de conexión
 */

const mongoose = require('mongoose');
const dns = require('dns');
const { promisify } = require('util');
require('dotenv').config();

const resolveSrv = promisify(dns.resolveSrv);
const lookup = promisify(dns.lookup);

async function diagnosticarAtlas() {
  console.log('🔍 DIAGNÓSTICO MONGODB ATLAS\n');
  
  const mongoUri = process.env.MONGO_URI;
  console.log('📋 Información básica:');
  console.log(`   URI: ${mongoUri?.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);

  // Extraer información de la URI
  const uriMatch = mongoUri?.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)/);
  if (!uriMatch) {
    console.log('❌ ERROR: URI de MongoDB mal formateada');
    return;
  }

  const [, username, password, host] = uriMatch;
  console.log('🧩 Componentes de la URI:');
  console.log(`   Usuario: ${username}`);
  console.log(`   Contraseña: ${password ? '***configurada***' : '❌ FALTA'}`);
  console.log(`   Host: ${host}\n`);

  // 1. Verificar conectividad a internet
  console.log('🌐 PASO 1: Verificando conectividad a internet...');
  try {
    await lookup('google.com');
    console.log('   ✅ Conexión a internet OK\n');
  } catch (error) {
    console.log('   ❌ Sin conexión a internet');
    console.log(`   Error: ${error.message}\n`);
    return;
  }

  // 2. Verificar resolución DNS de MongoDB
  console.log('🔍 PASO 2: Verificando DNS de MongoDB Atlas...');
  try {
    const srvRecord = `_mongodb._tcp.${host}`;
    console.log(`   Consultando: ${srvRecord}`);
    
    const records = await resolveSrv(srvRecord);
    console.log('   ✅ DNS resuelto correctamente');
    console.log(`   Servidores encontrados: ${records.length}`);
    records.forEach((record, i) => {
      console.log(`      ${i + 1}. ${record.name}:${record.port} (priority: ${record.priority})`);
    });
    console.log('');
  } catch (error) {
    console.log('   ❌ Error al resolver DNS');
    console.log(`   Error: ${error.message}`);
    console.log('   🔧 Posibles soluciones:');
    console.log('      1. El cluster puede estar pausado');
    console.log('      2. Problemas temporales de DNS');
    console.log('      3. Firewall bloqueando DNS\n');
  }

  // 3. Verificar conexión TCP a MongoDB
  console.log('🔌 PASO 3: Verificando conexión TCP...');
  try {
    await testTcpConnection(host, 27017);
    console.log('   ✅ Conexión TCP OK\n');
  } catch (error) {
    console.log('   ⚠️  Problema de conexión TCP');
    console.log(`   Error: ${error.message}\n`);
  }

  // 4. Intentar conexión con Mongoose
  console.log('🍃 PASO 4: Probando conexión con Mongoose...');
  try {
    console.log('   Conectando...');
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // Forzar IPv4
      maxPoolSize: 5,
      retryWrites: true,
      w: 'majority'
    });

    console.log('   ✅ Conexión exitosa!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Base de datos: ${conn.connection.name}`);
    console.log(`   Estado: ${conn.connection.readyState}`);

    // Probar una operación simple
    console.log('\n📊 PASO 5: Probando operación de base de datos...');
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`   ✅ Operación exitosa`);
    console.log(`   Colecciones encontradas: ${collections.length}`);
    if (collections.length > 0) {
      console.log(`   Algunas colecciones: ${collections.slice(0, 3).map(c => c.name).join(', ')}`);
    }

    await mongoose.disconnect();
    console.log('\n🎉 ¡TODO FUNCIONA CORRECTAMENTE!');
    console.log('El problema puede haber sido temporal.\n');

  } catch (error) {
    console.log('   ❌ Error de conexión con Mongoose');
    console.log(`   Tipo: ${error.name}`);
    console.log(`   Mensaje: ${error.message}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('\n🔧 SOLUCIONES PARA MongoServerSelectionError:');
      console.log('   1. Verifica que el cluster NO esté pausado en Atlas');
      console.log('   2. Ve a MongoDB Atlas → Clusters → Resume si está pausado');
      console.log('   3. Verifica la IP whitelist: 0.0.0.0/0 (todas las IPs)');
      console.log('   4. Verifica usuario y contraseña en Atlas');
    } else if (error.message.includes('ENODATA')) {
      console.log('\n🔧 SOLUCIONES PARA ENODATA:');
      console.log('   1. Problema temporal de DNS');
      console.log('   2. Reinicia tu conexión a internet');
      console.log('   3. Cambia DNS a 8.8.8.8 y 8.8.4.4 (Google)');
      console.log('   4. Verifica que el cluster esté activo');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n🔧 SOLUCIONES PARA AUTENTICACIÓN:');
      console.log('   1. Verifica usuario y contraseña en .env');
      console.log('   2. Verifica que el usuario tenga permisos');
      console.log('   3. Recrea las credenciales en Atlas');
    }
    console.log('');
  }
}

// Helper para probar conexión TCP
function testTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(10000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout de conexión'));
    });
    
    socket.on('error', (error) => {
      reject(error);
    });
    
    socket.connect(port, host);
  });
}

// Ejecutar diagnóstico
if (require.main === module) {
  diagnosticarAtlas()
    .then(() => {
      console.log('✅ Diagnóstico completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en diagnóstico:', error);
      process.exit(1);
    });
}

module.exports = { diagnosticarAtlas };