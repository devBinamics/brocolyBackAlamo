require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const articulosRoutes = require('./routes/articulosRoutes');
const cuentaRoutes = require('./routes/cuentaRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
// rawBody se conserva para verificar la firma del webhook de GitHub (ver routes/webhookRoutes.js).
app.use(express.json({ limit: '500kb', verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use((req, res, next) => {
  const fecha = new Date().toISOString();
  console.log(`[${fecha}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

app.use(helmet());

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  handler: (req, res) => {
    console.log(`IP ${req.ip} bloqueada por rate limit`);
    res.status(429).json({ error: '¡Demasiadas peticiones!' });
  },
});
app.use(limiter);

app.use('/api', articulosRoutes);
app.use('/api', cuentaRoutes);
app.use(webhookRoutes);

app.get('/health', (req, res) => {
  res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor on port ${PORT} - ok`);
});
