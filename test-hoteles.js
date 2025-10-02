async function testHoteles() {
  try {
    console.log('🔍 Probando endpoint de hoteles...');
    const response = await fetch('http://localhost:4000/api/hoteles');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const hoteles = await response.json();
    console.log('✅ Respuesta del servidor:');
    console.log('📊 Total de hoteles:', hoteles.length);
    
    if (hoteles.length > 0) {
      console.log('\n🏨 Hoteles encontrados:');
      hoteles.forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.nombre} (ID: ${hotel._id}) - Activo: ${hotel.activo}`);
      });
    } else {
      console.log('⚠️  No se encontraron hoteles en la base de datos');
    }
    
  } catch (error) {
    console.error('❌ Error al probar endpoint:', error.message);
  }
}

testHoteles();