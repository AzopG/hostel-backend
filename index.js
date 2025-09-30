const connectDB = require('./config/db');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors());

connectDB();

// Importar rutas
app.use('/api/hoteles', require('./routes/hotel'));
app.use('/api/habitaciones', require('./routes/habitacion'));
app.use('/api/salones', require('./routes/salon'));
app.use('/api/reservas', require('./routes/reserva'));
app.use('/api/paquetes', require('./routes/paquete'));
app.use('/api/usuarios', require('./routes/usuario'));

app.use('/api/eventos', require('./routes/evento'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/disponibilidad', require('./routes/disponibilidad'));
app.use('/api/reportes', require('./routes/reporte'));
app.use('/api/calendario', require('./routes/calendario'));
app.use('/api/filtros', require('./routes/filtros'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/comprobantes', require('./routes/comprobante')); // HU11

const PORT = process.env.PORT || 4000;

// Solo iniciar el servidor si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('Conectado a MongoDB');
    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
  }).catch(err => console.error('Error de conexión:', err));
}

// Exportar app para testing
module.exports = app;
