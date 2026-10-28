// ecosystem.config.js
// Configuración de pm2 para el servidor de Alamo (se instala en el home de h2024, sin sudo).
const home = process.env.HOME;

module.exports = {
  apps: [
    {
      name: 'alamo',
      script: 'app.js',
      cwd: `${home}/brocolyBackAlamo`,
      // Oracle Instant Client (thick) y libaio, que el servidor no tiene instalados en el sistema.
      env: {
        LD_LIBRARY_PATH: `${home}/oracle/instantclient_19_28:${home}/oracle/libaio/usr/lib/x86_64-linux-gnu`,
      },
      autorestart: true,
      // Espera creciente entre reintentos si el arranque falla, para no entrar en un bucle rápido.
      exp_backoff_restart_delay: 200,
      // Si el proceso crece demasiado, pm2 lo reinicia antes de que lo mate el sistema.
      max_memory_restart: '600M',
      out_file: `${home}/brocolyBackAlamo/alamo.log`,
      error_file: `${home}/brocolyBackAlamo/alamo.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
