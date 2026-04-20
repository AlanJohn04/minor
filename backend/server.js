const express = require('express');
const cors = require('cors');
const { admin, db } = require('./firebase');
const app = express();
app.use(cors());
app.use(express.json());

const scanRoute = require('./routes/scan');
const busRoute = require('./routes/bus');
const scansRoute = require('./routes/scans');

app.use('/api/scan', scanRoute);
app.use('/api/bus', busRoute);
app.use('/api/scans', scansRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`ESP32 should connect to: http://192.168.137.1:${PORT}/api/scan`);
});