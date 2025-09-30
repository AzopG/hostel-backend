// Test simple para verificar el endpoint de ciudades
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/disponibilidad/ciudades',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('RESPONSE:');
    console.log(data);
    try {
      const json = JSON.parse(data);
      console.log('\nJSON PARSEADO:');
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('No es JSON válido');
    }
  });
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
});

req.end();
