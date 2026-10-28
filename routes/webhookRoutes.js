// routes/webhookRoutes.js
const express = require('express');
const crypto = require('crypto');
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

// El script corre completamente desacoplado de la API: pm2 la reinicia al final del deploy y, si el script fuera
// hijo de la API, lo cerraría antes de escribir las últimas líneas del log. Con nohup y '&' dentro de un bash que
// termina enseguida, el script queda huérfano. El candado contra deploys simultáneos está en scripts/deploy.sh.
function desplegar() {
  desplegando = true;
  setTimeout(() => { desplegando = false; }, 30 * 1000);
  const proceso = spawn(
    'bash',
    ['-c', 'nohup bash "$0" >> "$1" 2>&1 &', SCRIPT_DEPLOY, LOG_DEPLOY],
    { detached: true, stdio: 'ignore' }
  );
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
