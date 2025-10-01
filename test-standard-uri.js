/**
 * Test con URI de MongoDB estándar (sin SRV)
 * Alternativa cuando el DNS SRV falla
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testStandardUri() {
  console.log('🧪 Probando URI estándar de MongoDB (sin SRV)...\n');

  // URI estándar construida manualmente
  const standardUri = 'mongodb://afmaldonado10:Andres1070.@cluster0-shard-00-00.9swl2u0.mongodb.net:27017,cluster0-shard-00-01.9swl2u0.mongodb.net:27017,cluster0-shard-00-02.9swl2u0.mongodb.net:27017/Hotel?ssl=true&replicaSet=atlas-123abc-shard-0&authSource=admin&retryWrites=true&w=majority';

  console.log('📍 URI estándar construida');
  console.log('🔄 Intentando conexión...\n');

  try {
    const conn = await mongoose.connect(standardUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000
    });

    console.log('✅ ¡Conexión exitosa con URI estándar!');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`DB: ${conn.connection.name}`);

    // Probar operación
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`Colecciones: ${collections.length}`);

    await mongoose.disconnect();
    console.log('\n🎉 El cluster está funcionando!');
    console.log('👉 El problema es solo con DNS SRV\n');

    console.log('💡 SOLUCIÓN: Actualiza tu .env con esta URI estándar:');
    console.log(`MONGO_URI=${standardUri}`);

  } catch (error) {
    console.log('❌ Error también con URI estándar');
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes('Authentication failed')) {
      console.log('🔧 Problema de autenticación:');
      console.log('   1. Ve a MongoDB Atlas');
      console.log('   2. Database Access → Users');
      console.log('   3. Verifica que el usuario "afmaldonado10" existe');
      console.log('   4. Verifica la contraseña');
    } else if (error.message.includes('connect')) {
      console.log('🔧 El cluster puede estar pausado:');
      console.log('   1. Ve a MongoDB Atlas');
      console.log('   2. Clusters → Cluster0');
      console.log('   3. Si dice "PAUSED", haz clic en "Resume"');
    }
  }
}

// Ejecutar test
if (require.main === module) {
  testStandardUri().catch(console.error);
}

module.exports = { testStandardUri };