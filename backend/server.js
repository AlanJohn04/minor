const express = require('express');
const cors = require('cors');
const { admin, db } = require('./firebase');
const app = express();
app.use(cors());
app.use(express.json());

const scanRoute = require('./routes/scan');
const busRoute = require('./routes/bus');

app.use('/api/scan', scanRoute);
app.use('/api/bus', busRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});