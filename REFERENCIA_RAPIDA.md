# 📋 REFERENCIA RÁPIDA - LIA Pagaré

> Guía de bolsillo para desarrolladores. No reemplaza al manual completo.

---

## 🚀 Comandos Útiles

### Inicio Rápido
```bash
# Desarrollo
npm run dev:web         # Servidor con NODE_ENV=development
npm run web             # Servidor producción

# Bot de WhatsApp
npm run dev             # Iniciar bot (src/bot.js)
npm run keep            # Bot sin suspensión (macOS)

# Testing
npm run smoke           # Test de humo básico
npm run smoke:all       # Todos los casos de prueba
npm run test-montos     # Test con montos aleatorios
node test.js            # Test completo local
```

### PM2 (Producción)
```bash
pm2 start server.js --name "lia-pagare-web"
pm2 save
pm2 logs lia-pagare-web
pm2 monit
pm2 restart lia-pagare-web
```

### Deploy
```bash
npm run deploy          # scripts/deploy.sh
npm run rollback        # scripts/rollback.sh
```

---

## 📁 Estructura de Carpetas Resumida

```
📦 lia-pagare-v3
├── 📁 config/                  # Configuración
│   ├── mapping_v1.json        # ← Mapeo pagarés
│   └── mapping.safe.js        # ← Lógica contratos
│
├── 📁 data/                    # Datos generados (persistir)
│   └── clientes/
│       └── {slug}/
│           └── {YYYY-MM-DD}/
│               ├── meta.json
│               ├── lote/
│               │   └── lote_*.pdf
│               ├── contrato/
│               │   └── contrato_*.pdf
│               └── individuales/
│
├── 📁 src/                     # Código fuente
│   ├── app/
│   │   └── generateFromMeta.js   # ← ORQUESTADOR
│   ├── calculators/
│   │   └── planPagos.js
│   ├── core/
│   │   └── index.js              # ← Bot conversacional
│   ├── documents/
│   │   └── generator.js          # ← Motor documentos
│   ├── modules/contracts/
│   │   ├── decorate.js
│   │   ├── doublepass.js
│   │   └── generate.js
│   ├── parsers/
│   │   ├── date.js
│   │   ├── money.js
│   │   └── oldParsers.js
│   ├── steps/
│   │   └── definitions.js        # ← Pasos del wizard
│   └── utils/
│       └── sanitizeFolderName.js
│
├── 📁 templates/               # Plantillas
│   ├── base.pdf               # ← Template pagarés
│   └── v1/
│       └── contract.docx      # ← Template contratos
│
├── 📁 web/                     # Frontend
│   ├── index.html
│   ├── app.js
│   └── auth.js
│
├── 📁 scripts/                 # Utilidades
│   ├── smoke.js               # Testing
│   └── test-montos.js
│
└── server.js                   # ← API REST
```

---

## 🔌 Endpoints Principales

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | Login JWT |
| `/api/auth/verify` | GET | JWT | Verificar token |
| `/api/capturas` | POST | JWT | Guardar datos |
| `/api/generar` | POST | JWT | Generar docs |
| `/api/descargar?path=` | GET | JWT | Descargar PDF |
| `/` | GET | No | Web UI |

### Ejemplo de Llamadas

**Login**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"isra","password":"adein123"}'
```

**Guardar captura**:
```bash
curl -X POST http://localhost:3000/api/capturas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"payload":{"tipoDocumento":"ambos","total":250000,...}}'
```

**Generar**:
```bash
curl -X POST http://localhost:3000/api/generar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"basePath":"data/clientes/juan-perez/2026-02-23","docs":"ambos"}'
```

---

## ⚙️ Variables de Entorno

```bash
# Puerto
PORT=3000

# JWT
JWT_SECRET=tu-clave-muy-segura

# Auth Basic (opcional)
ENABLE_AUTH=1
AUTH_USER=isra
AUTH_PASS=adein123

# WhatsApp (solo bot)
SESSION_PATH=.wwebjs_auth

# Entorno
NODE_ENV=production
```

---

## ❌ Errores Comunes y Fixes

| Error | Causa | Solución |
|-------|-------|----------|
| `Las anualidades exceden el saldo` | Anualidades > (Total - Enganche) | Validar en frontend |
| `No encontré la plantilla DOCX` | Falta archivo | `ls templates/v1/contract.docx` |
| `LibreOffice convert error` | LibreOffice no instalado | `sudo apt install libreoffice` |
| `EACCES: permission denied` | Permisos en `data/` | `chmod -R 755 data/` |
| `Cannot find module` | `node_modules` corrupto | `rm -rf node_modules && npm i` |
| `QR no se genera` | Error en payload QR | Revisar que `qr_text` existe |

---

## 🔧 Dependencias Críticas

```bash
# Sistema (Ubuntu/Debian)
sudo apt update
sudo apt install -y libreoffice libreoffice-writer build-essential python3

# Node.js
npm install

# Verificar instalaciones
node --version      # v22.x
npm --version       # 10.x
soffice --version   # LibreOffice
```

---

## 📊 Estructura de Datos (Payload)

```javascript
{
  // Documento
  tipoDocumento: 'ambos',     // 'contrato' | 'pagares' | 'ambos'
  
  // Financieros
  total: 250000,
  enganche: 50000,
  mensual: 5000,
  
  // Anualidades (opcional)
  _tieneAnualidades: true,
  anualidadMonto: 15000,
  numeroAnualidades: 3,
  anualidadMes: 2,            // 1-12
  
  // Fechas
  fechaEmision: '23/02/2026', // o Date
  reglaPref: 'siguiente',     // 'mismo' | 'siguiente'
  
  // Tasas
  moratorios: 2,              // %
  interes: 1.5,               // %
  
  // Personas
  beneficiario: 'Nombre',
  vendedorNombre: 'Nombre',
  vendedorDomicilio: 'Dir',
  deudor: 'Nombre Deudor',
  deudorGenero: 'Hombre',     // 'Hombre' | 'Mujer'
  direccion: 'Calle 123',
  poblacion: 'Ciudad, CP',
  lugarExpedicion: 'Ciudad',
  lugarPagoIgualExpedicion: false,
  lugarPago: 'Otra ciudad',
  telefono: '5512345678',
  
  // Predio (solo contratos)
  predioNombre: 'Predio X',
  predioUbicacion: 'Ubicación',
  predioMunicipio: 'Municipio',
  predioManzanaLote: 'M-1 L-2',
  predioSuperficie: '200',
  
  // Linderos: "metros | colinda"
  linderoNorte: '10 | con calle',
  linderoSur: '10 | con lote',
  linderoOriente: '20 | con barranca',
  linderoPoniente: '20 | con camino',
  
  // Testigos: "Nombre 1 | Nombre 2"
  testigos: 'Testigo 1 | Testigo 2'
}
```

---

## 🔍 Debugging Rápido

```bash
# Ver logs en tiempo real
pm2 logs

# Test local completo
node test.js

# Test específico
node scripts/smoke.js tests/cases/venta_contrato.json

# Ver estructura generada
ls -la data/clientes/

# Verificar meta.json
cat data/clientes/{slug}/{fecha}/meta.json | jq

# Probar LibreOffice
soffice --headless --convert-to pdf --outdir /tmp /tmp/test.docx
```

---

## 📝 Checklist: Agregar Campo Nuevo

- [ ] `web/index.html` - Agregar input
- [ ] `web/app.js` - Validar en `validateStep()`
- [ ] `web/app.js` - Agregar en `buildPayload()`
- [ ] `src/app/generateFromMeta.js` - Agregar en `normalizePayload()`
- [ ] `src/steps/definitions.js` - Agregar paso (bot)
- [ ] Probar: `node test.js`

---

## 🔗 Enlaces Útiles

- **Manual completo**: `MANUAL_DESARROLLADOR.md`
- **Guía deploy**: `DEPLOY_ANALYSIS.md`
- **Deploy rápido**: `DEPLOY_QUICKSTART.md`

---

## 💡 Tips

1. **Siempre trabajar en centavos** para cálculos financieros
2. **El QR usa hash pre-QR** para verificación de integridad
3. **Los paths se sanitizan** con `sanitizeFolderName()`
4. **Los contratos usan doble pasada** para calcular páginas
5. **La regla 15/30 ajusta** febrero a 28/29 días

---

*Generado el 2026-02-23 para LIA Pagaré v3*
