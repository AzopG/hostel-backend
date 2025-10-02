const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  // Solo crear servidor si no existe
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  
  const mongoUri = mongoServer.getUri();
  
  // Solo conectar si no hay conexión activa o si la conexión está cerrada
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  // Solo desconectar si hay una conexión activa
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Solo detener servidor si existe
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock para process.env durante tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NODE_ENV = 'test';

// Test vacío para que Jest no falle
test('setup test', () => {
  expect(true).toBe(true);
});