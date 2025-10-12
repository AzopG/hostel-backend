const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Función para hacer login y obtener token
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin.test@hotel.com',
            password: 'admin123'
        });
        
        if (response.data.token) {
            console.log('✅ Login exitoso');
            return response.data.token;
        } else {
            console.log('❌ Error en login:', response.data.msg);
            return null;
        }
    } catch (error) {
        console.log('❌ Error en login:', error.response?.data || error.message);
        console.log('📝 Status:', error.response?.status);
        console.log('📝 Headers:', error.response?.headers);
        return null;
    }
}

// Función para probar endpoint de ocupación
async function probarReporteOcupacion(token) {
    try {
        console.log('\n📊 Probando endpoint de reporte de ocupación...');
        
        const fechaInicio = '2024-01-01';
        const fechaFin = '2024-12-31';
        
        const response = await axios.get(`${BASE_URL}/api/estadisticas/ocupacion`, {
            params: { fechaInicio, fechaFin },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ Reporte de ocupación obtenido correctamente');
        console.log('📈 Datos:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error en reporte de ocupación:', error.response?.data?.message || error.message);
    }
}

// Función para probar endpoint de eventos
async function probarReporteEventos(token) {
    try {
        console.log('\n🎉 Probando endpoint de reporte de eventos...');
        
        const fechaInicio = '2024-01-01';
        const fechaFin = '2024-12-31';
        
        const response = await axios.get(`${BASE_URL}/api/estadisticas/eventos`, {
            params: { fechaInicio, fechaFin },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ Reporte de eventos obtenido correctamente');
        console.log('📊 Datos:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error en reporte de eventos:', error.response?.data?.message || error.message);
    }
}

// Función para probar endpoint de KPIs
async function probarKPIsSedes(token) {
    try {
        console.log('\n🏆 Probando endpoint de KPIs por sede...');
        
        const fechaInicio = '2024-01-01';
        const fechaFin = '2024-12-31';
        
        const response = await axios.get(`${BASE_URL}/api/estadisticas/kpis-sedes`, {
            params: { fechaInicio, fechaFin },
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('✅ KPIs por sede obtenidos correctamente');
        console.log('📊 Datos:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('❌ Error en KPIs por sede:', error.response?.data?.message || error.message);
    }
}

// Función principal para ejecutar todas las pruebas
async function ejecutarPruebas() {
    console.log('🚀 Iniciando pruebas de reportes avanzados...\n');
    
    // Hacer login
    const token = await login();
    if (!token) {
        console.log('❌ No se pudo obtener token de autenticación. Terminando pruebas.');
        return;
    }
    
    // Probar todos los endpoints
    await probarReporteOcupacion(token);
    await probarReporteEventos(token);
    await probarKPIsSedes(token);
    
    console.log('\n✅ Pruebas completadas');
}

// Ejecutar las pruebas
ejecutarPruebas().catch(console.error);