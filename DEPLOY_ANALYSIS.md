# 📋 LIA Pagaré - Reporte Técnico de Deploy

> **Proyecto:** LIA Pagaré v3  
> **Destino:** Servidor Contabo 38.242.222.25:3003  
> **Entorno Local:** macOS (Darwin) → **Destino:** Ubuntu/Debian Linux  
> **Fecha de análisis:** 2026-02-23

---

## 1. VERSIONES EXACTAS REQUERIDAS

### Node.js y npm
```
Node.js: v22.20.0 (LTS recomendado: v22.x)
npm: 10.9.3 (viene con Node 22)
```

### Dependencias Críticas del Proyecto
| Paquete | Versión | Uso |
|---------|---------|-----|
| express | ^4.19.2 | Servidor web |
| pdf-lib | ^1.17.1 | Generación de pagarés PDF |
| docxtemplater | ^3.66.7 | Plantillas DOCX para contratos |
| pizzip | ^3.2.0 | Compresión ZIP para DOCX |
| libreoffice-convert | ^1.7.0 | Conversión DOCX→PDF |
| qrcode | ^1.5.4 | Generación de códigos QR |
| puppeteer | ^24.31.0 | **Solo para bot de WhatsApp** |
| whatsapp-web.js | ^1.33.1 | Bot de WhatsApp |
| sharp | ^0.33.5 | Procesamiento de imágenes |
| canvas | ^2.11.2 | Canvas para Node.js |
| @napi-rs/canvas | ^0.1.78 | Canvas nativo |
| jimp | ^1.6.0 | Manipulación de imágenes |
| date-fns | ^4.1.0 | Manejo de fechas |
| dayjs | ^1.11.18 | Fechas alternativo |
| numero-a-letras | ^1.0.6 | Conversión de números a letras |
| dotenv | ^17.2.1 | Variables de entorno |
| fs-extra | ^11.3.2 | Extensión de filesystem |
| pdfkit | ^0.17.2 | Generación PDF alternativa |

---

## 2. COMANDOS DE EJECUCIÓN

### Desarrollo Local
```bash
# Modo desarrollo web (con hot reload manual)
npm run dev:web

# Modo producción web
npm run web
# o directamente:
node server.js
```

### Producción en Servidor
```bash
# Ejecución directa (no recomendado para producción)
node server.js

# Con PM2 (recomendado)
pm2 start server.js --name "lia-pagare-web"
pm2 save

# El script de package.json para producción:
npm run web
```

---

## 3. DEPENDENCIAS DEL SISTEMA

### Requisitos OBLIGATORIOS en Linux

#### 1. LibreOffice (CRÍTICO para contratos)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y libreoffice libreoffice-writer

# Verificar instalación
which soffice
soffice --version
```

#### 2. Dependencias para Puppeteer (bot de WhatsApp)
```bash
# Dependencias de Chromium para Puppeteer
sudo apt install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils
```

#### 3. Dependencias para Canvas/sharp
```bash
sudo apt install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev
```

#### 4. Python (para node-gyp)
```bash
sudo apt install -y python3 python3-pip python3-venv
```

### NOTA IMPORTANTE sobre Puppeteer
- **Puppeteer NO se usa para la web/API**, solo para el bot de WhatsApp
- El servidor web funciona completamente sin Puppeteer
- Si no necesitas el bot de WhatsApp, puedes ignorar las dependencias de Puppeteer

---

## 4. ESTRUCTURA DE ARCHIVOS CRÍTICA

### Directorios que DEBEN existir
```
/opt/lia-pagare/
├── data/
│   ├── clientes/          # Datos de clientes y documentos generados
│   ├── output/            # Salida temporal de contratos
│   └── tmp/               # Archivos temporales
├── templates/
│   ├── base.pdf           # Template base para pagarés
│   └── v1/
│       └── contract.docx  # Plantilla de contrato
├── config/
│   ├── mapping_v1.json    # Mapeo de campos para pagarés
│   └── mapping.safe.js    # Mapeo para contratos
├── web/
│   ├── index.html         # UI principal
│   ├── app.js             # Lógica frontend
│   ├── auth.js            # Autenticación
│   ├── styles.css         # Estilos
│   └── assets/            # Imágenes y recursos
└── src/
    ├── app/
    │   └── generateFromMeta.js
    ├── documents/
    │   └── generator.js
    ├── modules/
    │   └── contracts/
    ├── utils/
    └── lib/
```

### Permisos Requeridos
```bash
# El usuario que ejecuta node necesita permisos de escritura en:
chmod -R 755 /opt/lia-pagare/data
chmod -R 755 /opt/lia-pagare/tmp

# Si usas PM2, el usuario debe ser el mismo que instaló los node_modules
```

### Archivos que deben persistir entre deploys
```
data/clientes/*          # TODOS los documentos generados
data/tmp/*               # Archivos temporales (pueden limpiarse)
.env                     # Variables de entorno (NO en git)
.wwebjs_auth/            # Sesión de WhatsApp (si usas el bot)
```

---

## 5. CONFIGURACIÓN

### Variables de Entorno (.env)
```bash
# Puerto de la aplicación
PORT=3003

# Autenticación JWT
JWT_SECRET=tu-clave-secreta-muy-larga-aqui

# Autenticación Basic (opcional)
ENABLE_AUTH=0
AUTH_USER=isra
AUTH_PASS=adein123
AUTH_REALM=LIA Pagaré

# Sesión de WhatsApp (solo si usas el bot)
SESSION_PATH=.wwebjs_auth
WWEBJS_DIR=.wwebjs_auth

# Modo
NODE_ENV=production
```

### Archivos de Configuración Estáticos
| Archivo | Descripción |
|---------|-------------|
| `config/mapping_v1.json` | Mapeo de campos del PDF de pagarés |
| `config/mapping.safe.js` | Lógica de mapeo para contratos DOCX |
| `templates/base.pdf` | Template PDF base para pagarés |
| `templates/v1/contract.docx` | Plantilla DOCX para contratos |

---

## 6. PUERTOS Y RED

### Puerto de la Aplicación
```
Puerto: 3003 (según .env actual)
Protocolo: HTTP (no HTTPS nativo)
```

### Configuración de Firewall
```bash
# Permitir puerto 3003
sudo ufw allow 3003/tcp

# O si usas iptables
sudo iptables -A INPUT -p tcp --dport 3003 -j ACCEPT
```

### CORS
- El servidor Express sirve archivos estáticos desde `/web`
- No hay configuración CORS explícita (mismo origen)
- Si necesitas acceso desde otro dominio, agregar en server.js:
```javascript
const cors = require('cors');
app.use(cors({ origin: ['https://tudominio.com'] }));
```

### Recomendación para Producción
Usar Nginx como reverse proxy:
```nginx
server {
    listen 80;
    server_name 38.242.222.25;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. PROCESO DE GENERACIÓN DE PDFs

### Pagarés (Flujo Principal)
1. **Entrada:** Datos del cliente desde `web/app.js`
2. **Endpoint:** `POST /api/capturas` → Guarda metadata en `data/clientes/{slug}/{fecha}/meta.json`
3. **Generación:** `POST /api/generar` → Llama a `generateFromMeta.js`
4. **Proceso:**
   - Lee `templates/base.pdf` (PDF base con campos de formulario)
   - Usa `pdf-lib` para llenar campos del formulario
   - Genera QR con `qrcode`
   - Crea PDF individual por pagaré
   - Merge todos los pagarés en un solo PDF con `PDFDocument`
   - Guarda en `data/clientes/{slug}/{fecha}/lote/lote_{timestamp}.pdf`

### Contratos (Flujo Principal)
1. **Proceso:**
   - Lee `templates/v1/contract.docx`
   - Usa `docxtemplater` para renderizar plantilla con datos
   - Convierte DOCX→PDF usando LibreOffice (`soffice --headless`)
   - Agrega numeración de páginas con `pdf-lib`
   - Agrega QR de verificación
   - Guarda en `data/clientes/{slug}/{fecha}/contrato/contrato_{timestamp}.pdf`

### Memoria RAM Requerida
```
Base: ~200 MB (Node.js + Express)
Por lote de 130 pagarés: +150-250 MB
Generación de contrato: +100-200 MB
------------------------------------
Total recomendado: 1 GB mínimo, 2 GB óptimo
```

---

## 8. ENDPOINTS CRÍTICOS PARA TESTEAR

### Autenticación
```bash
# Login (obtener JWT)
curl -X POST http://38.242.222.25:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"isra","password":"adein123"}'

# Respuesta esperada:
# {"ok":true,"token":"eyJ...","user":{"username":"isra","name":"Administrador"}}
```

### Health Check Implícito
```bash
# Verificar que el servidor responde
curl http://38.242.222.25:3003/
# Debe retornar el HTML de la aplicación
```

### Flujo Completo de Generación
```bash
# 1. Guardar captura (sin auth para simplificar, o con JWT si ENABLE_AUTH=1)
curl -X POST http://38.242.222.25:3003/api/capturas \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "tipoDocumento": "ambos",
      "fechaEmision": "23/02/2026",
      "total": 250000,
      "enganche": 50000,
      "mensual": 5000,
      "deudor": "Juan Pérez Test",
      "deudorGenero": "Hombre",
      "direccion": "Calle Principal 123",
      "poblacion": "Ciudad de México",
      "lugarExpedicion": "CDMX",
      "lugarPagoIgualExpedicion": true,
      "beneficiario": "ADEIN Inmobiliaria",
      "vendedorNombre": "Israel Vendedor",
      "vendedorDomicilio": "Oficinas ADEIN",
      "telefono": "5512345678",
      "moratorios": 2,
      "interes": 1.5,
      "reglaPref": "siguiente",
      "anualidades": false,
      "predioNombre": "Loma Bonita",
      "predioUbicacion": "Carretera Federal 200 km 15",
      "predioMunicipio": "Puerto Vallarta",
      "predioManzanaLote": "M-12 L-5",
      "predioSuperficie": "200",
      "linderoNorte": "15 | con calle",
      "linderoSur": "15 | con lote 4",
      "linderoOriente": "32 | con barranca",
      "linderoPoniente": "32 | con camino",
      "testigos": "Testigo Uno | Testigo Dos"
    }
  }'

# Respuesta esperada:
# {"ok":true,"basePath":"data/clientes/juan-perez-test/2026-02-23",...}

# 2. Generar documentos
curl -X POST http://38.242.222.25:3003/api/generar \
  -H "Content-Type: application/json" \
  -d '{
    "basePath": "data/clientes/juan-perez-test/2026-02-23",
    "docs": "ambos"
  }'

# Respuesta esperada:
# {"ok":true,"outputs":{"contratoPdfUrl":"/api/descargar?path=...","pagaresPdfUrl":"/api/descargar?path=..."}}

# 3. Descargar archivo
curl -O -J "http://38.242.222.25:3003/api/descargar?path=data/clientes/juan-perez-test/2026-02-23/lote/lote_xxxx.pdf"
```

---

## 9. POSIBLES PROBLEMAS AL PASAR A LINUX

### Problemas Comunes y Soluciones

#### 1. LibreOffice no encontrado
```bash
# Error: "LibreOffice convert error"
# Solución:
sudo apt install -y libreoffice libreoffice-writer
which soffice
# Si no está en PATH, crear symlink:
sudo ln -s /usr/lib/libreoffice/program/soffice /usr/local/bin/soffice
```

#### 2. Permisos de escritura
```bash
# Error: "EACCES: permission denied"
# Solución:
sudo chown -R $(whoami):$(whoami) /opt/lia-pagare/data
chmod -R 755 /opt/lia-pagare/data
```

#### 3. Canvas/sharp no compila
```bash
# Error: "node-gyp rebuild failed"
# Solución:
sudo apt install -y build-essential python3 libcairo2-dev libpango1.0-dev
npm rebuild
```

#### 4. Case sensitivity en paths
```bash
# macOS es case-insensitive, Linux es case-sensitive
# Verificar que todos los imports usan el caso correcto
# Ejemplo: require('./MyModule') vs require('./mymodule')
```

#### 5. Puppeteer/Chromium en headless
```bash
# Si usas el bot de WhatsApp, asegúrate de usar:
puppeteer: {
  headless: true,  // En Linux server, siempre headless
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}
```

#### 6. Paths hardcodeados de macOS
```javascript
// En server.js hay una referencia específica a macOS:
const same = process.platform === 'darwin'
  ? srcAbs.toLowerCase() === dstAbs.toLowerCase()
  : srcAbs === dstAbs;
// Esto funciona correctamente en ambas plataformas
```

---

## 10. CHECKLIST DE VERIFICACIÓN

### Pre-Deploy
- [ ] Node.js v22.x instalado
- [ ] npm 10.x instalado
- [ ] LibreOffice instalado (`soffice --version`)
- [ ] Dependencias del sistema instaladas
- [ ] Puerto 3003 libre en firewall

### Deploy
- [ ] Código subido al servidor
- [ ] `npm install --production` ejecutado sin errores
- [ ] Archivo `.env` creado con configuración correcta
- [ ] Directorios `data/` creados con permisos correctos
- [ ] Archivos de plantilla presentes (`templates/base.pdf`, `templates/v1/contract.docx`)

### Post-Deploy
- [ ] Servidor inicia sin errores (`node server.js`)
- [ ] PM2 configurado y corriendo
- [ ] Endpoint `/` responde con HTML
- [ ] Login funciona (`/api/auth/login`)
- [ ] Generación de pagarés funciona
- [ ] Generación de contratos funciona
- [ ] Descarga de archivos funciona
- [ ] Logs no muestran errores críticos

### Comandos de Verificación
```bash
# 1. Verificar proceso
curl http://localhost:3003/ | head

# 2. Ver logs
pm2 logs lia-pagare-web

# 3. Ver uso de recursos
pm2 monit

# 4. Ver archivos generados
ls -la /opt/lia-pagare/data/clientes/

# 5. Verificar LibreOffice
soffice --headless --convert-to pdf --outdir /tmp /tmp/test.docx

# 6. Test de generación completo (usar el script de test)
cd /opt/lia-pagare && npm run smoke
```

---

## 11. ESTRUCTURA DE DATOS (JSON Payload)

### Ejemplo de Payload Completo
```json
{
  "tipoDocumento": "ambos",
  "fechaEmision": "23/02/2026",
  "total": 250000,
  "enganche": 50000,
  "mensual": 5000,
  "anualidades": false,
  "anualidadMonto": 0,
  "numeroAnualidades": 0,
  "anualidadMes": 12,
  "reglaPref": "siguiente",
  "moratorios": 2,
  "interes": 1.5,
  "beneficiario": "ADEIN Inmobiliaria",
  "vendedorNombre": "Israel Vendedor",
  "vendedorDomicilio": "Oficinas ADEIN",
  "deudor": "Juan Pérez García",
  "deudorGenero": "Hombre",
  "direccion": "Calle Principal 123 Colonia Centro",
  "poblacion": "Ciudad de México, CDMX, 01000",
  "lugarExpedicion": "Ciudad de México",
  "lugarPagoIgualExpedicion": true,
  "lugarPago": "",
  "telefono": "+52 55 1234 5678",
  "predioNombre": "Loma Bonita",
  "predioUbicacion": "Carretera Federal 200 km 15, Puerto Vallarta",
  "predioMunicipio": "Puerto Vallarta",
  "predioManzanaLote": "M-12 L-5",
  "predioSuperficie": "200",
  "linderoNorte": "15 | con calle principal",
  "linderoSur": "15 | con lote 4",
  "linderoOriente": "32 | con barranca",
  "linderoPoniente": "32 | con camino vecinal",
  "testigos": "Testigo Uno | Testigo Dos"
}
```

---

## 12. MANTENIMIENTO

### Limpieza de archivos temporales
```bash
# Limpiar tmp cada semana (cron job)
0 2 * * 0 rm -rf /opt/lia-pagare/data/tmp/*
```

### Backup de datos
```bash
# Backup diario de clientes
0 1 * * * tar czf /backups/lia-clientes-$(date +\%Y\%m\%d).tar.gz /opt/lia-pagare/data/clientes/
```

### Actualización de dependencias
```bash
# En entorno de prueba primero
npm update
npm audit fix
# Luego probar generación de documentos
```

---

## RESUMEN EJECUTIVO

| Aspecto | Requisito |
|---------|-----------|
| **OS** | Ubuntu 20.04+ / Debian 11+ |
| **Node.js** | v22.x LTS |
| **RAM** | 1 GB mínimo, 2 GB recomendado |
| **Disco** | 10 GB mínimo (depende de volumen de PDFs) |
| **Puerto** | 3003 (TCP) |
| **Dependencias críticas** | LibreOffice, build-essential |
| **Proceso** | PM2 recomendado |
| **Base de datos** | Ninguna (filesystem JSON) |
| **Servicios externos** | Ninguno obligatorio |

---

*Generado automáticamente para deploy en 38.242.222.25:3003*
