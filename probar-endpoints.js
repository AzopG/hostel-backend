const axios = require('axios');

async function probarEndpoints() {
    try {
        console.log('🔐 Probando login...');
        
        // Intentar login con diferentes usuarios
        const usuarios = [
            { email: 'admin@hotelchain.com', password: '123456', tipo: 'admin_central' }
        ];

        for (const usuario of usuarios) {
            try {
                console.log(`\n👤 Probando login con: ${usuario.email} (${usuario.tipo})`);
                
                const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
                    email: usuario.email,
                    password: usuario.password
                });

                if (loginResponse.data.token) {
                    console.log('✅ Login exitoso');
                    const token = loginResponse.data.token;

                    // Probar endpoint de estadísticas
                    console.log('📊 Probando endpoint de estadísticas...');
                    const statsResponse = await axios.get('http://localhost:4000/api/estadisticas/generales', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log('📈 Estadísticas recibidas:');
                    console.log(JSON.stringify(statsResponse.data, null, 2));
                    break; // Solo necesitamos probar con un usuario
                } else {
                    console.log('❌ Login fallido:', loginResponse.data);
                }
            } catch (loginError) {
                console.log(`❌ Error en login: ${loginError.response?.data?.message || loginError.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

probarEndpoints();