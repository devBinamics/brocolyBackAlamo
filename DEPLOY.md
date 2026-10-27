# brocolyBackAlamo – Despliegue y operación

Documento de referencia del deploy en el servidor de El Álamo. **No contiene contraseñas ni tokens**: pedirlas a Raúl (Alamo) o al equipo de Binamics.

## 1. Resumen

- La API corre **dentro de la red de Alamo**, en el Linux del CRM (Duocrm), porque Oracle solo es accesible desde ahí (`WIN-ORAALAMO.alamo.net` es un nombre interno). No sirve DigitalOcean.
- Puerto de la API: **3003** (local del servidor).
- **URL pública: `https://app-elalamo.brocoly.cc`**, por un Cloudflare Tunnel que ya existía en el servidor (cloudflared corre como root). Se agregó una ruta (Public Hostname) `app-elalamo.brocoly.cc` → `http://localhost:3003`. No usa puertos del router.
- El hostname es de **un solo nivel** a propósito: `app.elalamo.brocoly.cc` (dos niveles) dio `handshake failure` porque el certificado gratuito de Cloudflare solo cubre `*.brocoly.cc`.

## 2. Accesos

| Qué | Dato |
|---|---|
| Servidor Linux (CRM, Debian 12) | `ssh -p 2022 h2024@98.97.148.24` |
| IP pública (Starlink) | `98.97.148.24` |
| IP interna del Linux | `192.168.0.142` |
| Router | `192.168.0.2` |
| Oracle | `WIN-ORAALAMO.alamo.net:1521` (192.168.0.139), service `oalamo.alamo.com.ar`, usuario `produccion` |
| Escritorio remoto (Windows de Oracle, para el JOB de romaneos) | `elalamosrl.com.ar:58500` |

- **SSH: usar siempre el puerto 2022.** El 22 no responde desde afuera (timeout).
- Usuario `h2024` **sin sudo**: todo se instala dentro de `/home/h2024`.
- Duocrm: `http://98.97.148.24:800/duoc/` (otro sistema, no es esta API).

## 3. Puertos del servidor

| Puerto | Uso |
|---|---|
| 4000, 4001, 4002 | Servicios de Duocrm (GraphQL, uploadFile, etc., corren como root). **No tocar.** |
| 80 | Otro servicio |
| **3003** | **Esta API** (libre en el servidor; el túnel apunta acá) |

Puertos que llegan desde afuera por el router: 800, 4001, 443 (verificado). El 1339 nunca llegó, por eso se usa el túnel de Cloudflare.

## 4. Qué hay instalado en el servidor (todo en `/home/h2024`)

| Ruta | Contenido |
|---|---|
| `~/node` | Node 22 (agregado al `PATH` en `~/.bashrc`) |
| `~/brocolyBackAlamo` | Código de la API + `.env` + `alamo.log` |
| `~/oracle/instantclient_19_28` | Oracle Instant Client 19.28 (basiclite) |
| `~/oracle/libaio/usr/lib/x86_64-linux-gnu` | `libaio.so.1` extraída del `.deb` (el sistema no la tiene y no hay sudo) |

### Por qué modo thick
El usuario `produccion` tiene la contraseña con un verifier antiguo (`0x939`). El modo thin falla con `NJS-116: password verifier type 0x939 is not supported`. Por eso se usa el Instant Client (thick). **No poner `ORACLE_THIN=1` en el `.env` del servidor.**

`config/database.js` usa thick salvo que `ORACLE_THIN=1`.

## 5. `.env` del servidor

```
DB_USER=produccion
DB_PASSWORD=<pedir>
DB_CONNECT_STRING=WIN-ORAALAMO.alamo.net:1521/oalamo.alamo.com.ar
API_KEY=<token que usan los clientes>
PORT=3003
```

(En el `.env` local de la Mac, `PORT=4100`; son archivos distintos.)

## 6. Arranque

Script `~/brocolyBackAlamo/start.sh`:

```bash
#!/bin/bash
export PATH=$HOME/node/bin:$PATH
export LD_LIBRARY_PATH=$HOME/oracle/instantclient_19_28:$HOME/oracle/libaio/usr/lib/x86_64-linux-gnu
cd $HOME/brocolyBackAlamo
exec node app.js >> alamo.log 2>&1
```

```bash
chmod +x ~/brocolyBackAlamo/start.sh
pkill -f "node app.js"                                   # detener
nohup ~/brocolyBackAlamo/start.sh > /dev/null 2>&1 &     # iniciar
tail -20 ~/brocolyBackAlamo/alamo.log                    # ver log
```

Arranque automático al reiniciar el servidor:

```bash
(crontab -l 2>/dev/null; echo "@reboot $HOME/brocolyBackAlamo/start.sh") | crontab -
```

Si la API se cae sola no se levanta de nuevo (mejora posible: `pm2` instalado en `~/`).

## 7. Actualizar el código

Desde la Mac (no desde el servidor), con el prompt `barbaramolinero@MacBook...`:

```bash
cd /Users/barbaramolinero/Documents/Binamics/APIs
rsync -av -e "ssh -p 2022" --exclude node_modules --exclude .git --exclude .env \
  brocolyBackAlamo/ h2024@98.97.148.24:~/brocolyBackAlamo/
```

Luego, en el servidor:

```bash
cd ~/brocolyBackAlamo && npm install --omit=dev
pkill -f "node app.js"; nohup ./start.sh > /dev/null 2>&1 &
```

(El servidor no tiene `git` y no hay auto-deploy.)

## 8. Endpoints

Todos con `Authorization: Bearer <API_KEY>` (excepto `/health`).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | 200 `OK` |
| GET | `/api/cuentas` | Cuentas activas: `CUENTA, NOMBRE, CUIT, ZONA, NOMBRE_ZONA, CENTRO, COPER_DESCRIP`. Filtros `?cuenta=X`, `?buscar=texto` (mín. 3 caracteres) |
| GET | `/api/contactos` | `CUENTA, NOMBRE, CUIT, TELEFONO, EMAIL` de cuentas con teléfono o email. Mismos filtros |
| GET | `/api/articulos` | Catálogo reducido (`?sku=X`, `?refresh=1`) |
| GET | `/api/articulos-control` | Detalle completo (`?sku=X`) |

Notas de datos reales de Alamo:
- `CUENTA` es numérico; `ZONA` y `CENTRO` son códigos de texto (`GEN`, `PROD`, `PROV`, `CLI`).
- `TELEFONO` viene como texto libre (a veces dos números); `EMAIL` suele ser `null`.
- Sin filtro de centros (Ganadera filtra `(1,2,3,5,10,13,4,7,8)`; no aplica a Alamo).
- Cuentas activas = `NVL(baja,0) = 0`.

Prueba rápida dentro del servidor:

```bash
TOKEN=$(grep '^API_KEY=' ~/brocolyBackAlamo/.env | cut -d= -f2-)
curl -s -H "Authorization: Bearer $TOKEN" "localhost:3003/api/cuentas?buscar=gar" | head -c 600
```

## 9. Probar desde la Mac

Túnel SSH (dejar la terminal abierta):

```bash
ssh -p 2022 -L 3003:localhost:3003 h2024@98.97.148.24
```

Y usar `http://localhost:3003`. Para probar directamente la URL pública: `curl https://app-elalamo.brocoly.cc/health` (tiene que devolver `OK`).

Colección de Postman: `../brocoly-Backend-CREA.postman_collection.json` (variables `baseUrl` y `apiKey`).

## 10. Problemas conocidos

| Síntoma | Causa / solución |
|---|---|
| `ssh` colgado en "Connecting..." | Se usó el puerto 22. Usar `-p 2022` |
| `DPI-1047 ... libclntsh.so` | No se cargó el Instant Client: falta `LD_LIBRARY_PATH` (usar `start.sh`) o `ORACLE_THIN=1` mal puesto |
| `DPI-1047 ... libaio.so.1` | Falta la ruta de `libaio` en `LD_LIBRARY_PATH` |
| `NJS-116 password verifier type 0x939` | Se está usando modo thin; sacar `ORACLE_THIN` del `.env` |
| `EADDRINUSE :::3003` | Ya hay una instancia corriendo; `pkill -f "node app.js"` |
| La URL pública da 502 / no responde | La API no corre en el 3003 (`curl localhost:3003/health` en el servidor) o la ruta del túnel no apunta a `http://localhost:3003` |
| `handshake failure` en la URL pública | Hostname de dos niveles o DNS sin propagar; usar `app-elalamo.brocoly.cc` |
| Error `tb_coper` / `ORA-00942` | Ver join de `tb_coper` en `models/cuentaModel.js` (en Alamo funciona) |

## 11. Pendientes

- Rotar el token del túnel de Cloudflare: el proceso `cloudflared` de root lo muestra en `ps aux` (guardarlo en archivo de configuración).
- Opcional: HTTPS (proxy en el 443), `pm2` para reinicio automático.
- Romaneos: el JOB/trigger de Alfa (`JOB_ROMANEOS`, `br_romaneos`) no se evaluó para Alamo; la compila Raúl en el Linux del Duocrm. Verificar en Oracle: `SELECT job_name FROM all_scheduler_jobs WHERE job_name LIKE '%ROMANEO%'`.
