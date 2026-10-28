// routes/webhookRoutes.js
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const router = express.Router();

const SCRIPT_DEPLOY = path.join(__dirname, '..', 'scripts', 'deploy.sh');
const LOG_DEPLOY = path.join(__dirname, '..', 'deploy.log');
const RAMA = 'refs/heads/main';

let desplegando = false;

// La firma se calcula sobre el cuerpo original (rawBody, ver app.js) y se compara en tiempo constante.
function firmaValida(req, secreto) {
  const recibida = req.get('x-hub-signature-256');
  if (!recibida || !req.rawBody) return false;
  const esperada = 'sha256=' + crypto.createHmac('sha256', secreto).update(req.rawBody).digest('hex');
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// El script corre separado del proceso de la API, que es el que pm2 reinicia al final del deploy.
function desplegar() {
  desplegando = true;
  const salida = fs.openSync(LOG_DEPLOY, 'a');
  const proceso = spawn('bash', [SCRIPT_DEPLOY], { detached: true, stdio: ['ignore', salida, salida] });
  proceso.on('exit', () => { desplegando = false; });
  proceso.unref();
}

// POST /webhook -> GitHub avisa de un push; si la firma es válida y es a main, actualiza el código y recarga la API.
router.post('/webhook', (req, res) => {
  const secreto = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secreto) return res.status(503).json({ error: 'Webhook no configurado' });
  if (!firmaValida(req, secreto)) {
    console.log('Webhook rechazado: firma inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const evento = req.get('x-github-event');
  if (evento === 'ping') return res.status(200).json({ ok: true, mensaje: 'pong' });
  if (evento !== 'push') return res.status(202).json({ ok: true, ignorado: `evento ${evento}` });
  if (req.body?.ref !== RAMA) return res.status(202).json({ ok: true, ignorado: `rama ${req.body?.ref}` });
  if (desplegando) return res.status(202).json({ ok: true, ignorado: 'ya hay un deploy en curso' });

  console.log(`Webhook válido: push a main (${req.body?.after?.slice(0, 7) ?? '?'}), iniciando deploy`);
  desplegar();
  res.status(202).json({ ok: true, mensaje: 'Deploy iniciado' });
});

module.exports = router;
