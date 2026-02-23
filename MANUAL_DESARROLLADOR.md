# 📘 MANUAL TÉCNICO DEL DESARROLLADOR

## LIA Pagaré v3 - Sistema de Generación de Documentos Legales

> **Versión del manual:** 1.0  
> **Fecha:** 2026-02-23  
> **Última actualización:** Análisis completo del repositorio

---

## 📋 TL;DR - Lo Más Importante

### ¿Qué es LIA Pagaré?
Sistema Node.js que genera **pagarés PDF** y **contratos DOCX→PDF** para operaciones inmobiliarias. Tiene dos interfaces:
- **Web**: Wizard en navegador (`web/index.html`)
- **Bot**: WhatsApp automatizado (`src/bot.js`)

### Arquitectura en 10 segundos
```
Frontend (web/app.js) → API REST (server.js) → Motor (src/app/generateFromMeta.js)
                                           ↓
              Pagarés ← pdf-lib + QR    |    Contratos ← docxtemplater + LibreOffice
```

### Archivos críticos (¡NO TOCAR SIN SABER!)
| Archivo | Qué hace | Riesgo si falla |
|---------|----------|-----------------|
| `config/mapping_v1.json` | Mapea campos del PDF de pagarés | Los pagarés no se llenan |
| `config/mapping.safe.js` | Lógica de contratos | El contrato no compila |
| `templates/base.pdf` | Template base de pagarés | Error al generar pagarés |
| `templates/v1/contract.docx` | Plantilla de contrato | Error 500 en contratos |

### Comandos esenciales
```bash
npm run web           # Iniciar servidor
npm run smoke         # Test de humo
npm run test-montos   # Test con montos aleatorios
node test.js          # Test local completo
```

---

## 📑 ÍNDICE

1. [Arquitectura General](#1-arquitectura-general)
2. [Módulos y Componentes](#2-módulos-y-componentes)
3. [Flujo de Datos](#3-flujo-de-datos-detallado)
4. [Endpoints y API](#4-endpoints-y-api)
5. [Sistema de Plantillas](#5-sistema-de-plantillas)
6. [Cálculos Financieros](#6-cálculos-financieros)
7. [Generación de Documentos](#7-generación-de-documentos)
8. [Configuración](#8-configuración-y-variables)
9. [Dependencias Críticas](#9-dependencias-críticas)
10. [Debugging](#10-depuración-y-troubleshooting)
11. [Guía de Modificación](#11-guía-de-modificación)
12. [Referencia Rápida](#12-referencia-rápida)

---

## 1. ARQUITECTURA GENERAL

### 1.1 Diagrama Conceptual de Flujo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INTERFACES DE ENTRADA                          │
│  ┌──────────────┐    ┌──────────────┐                                   │
│  │   Web UI     │    │ Bot WhatsApp │                                   │
│  │ (web/app.js) │    │ (src/bot.js) │                                   │
│  └──────┬───────┘    └──────┬───────┘                                   │
└─────────┼───────────────────┼───────────────────────────────────────────┘
          │                   │
          │  POST /api/capturas        handleMessage()
          │  POST /api/generar         (core/index.js)
          │                   │
          └─────────┬─────────┘
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API REST (server.js)                             │
│  - Autenticación JWT                                                     │
│  - Validación de datos                                                   │
│  - Enrutamiento a generadores                                            │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MOTOR PRINCIPAL (src/app/)                            │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ generateFromMeta.js                                               │   │
│  │ - Normaliza payload (normalizePayload)                           │   │
│  │ - Orquesta generación de documentos                              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐      ┌────────────────┐
│   PAGARÉS     │      │   CONTRATOS    │
│   (PDF)       │      │   (DOCX→PDF)   │
├───────────────┤      ├────────────────┤
│ pdf-lib       │      │ docxtemplater  │
│ qrcode        │      │ pizzip         │
│ mapping_v1    │      │ LibreOffice    │
└───────────────┘      └────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │   data/clientes/      │
        │   (almacenamiento)    │
        └───────────────────────┘
```

### 1.2 Tecnologías Principales

| Tecnología | Versión | Uso Principal |
|------------|---------|---------------|
| Node.js | v22.x | Runtime |
| Express | ^4.19.2 | Servidor web |
| pdf-lib | ^1.17.1 | Manipulación PDF |
| docxtemplater | ^3.66.7 | Plantillas DOCX |
| qrcode | ^1.5.4 | Generación QR |
| LibreOffice | System | DOCX→PDF |
| whatsapp-web.js | ^1.33.1 | Bot WhatsApp |
| puppeteer | ^24.31.0 | Browser para bot |
| date-fns | ^4.1.0 | Manejo de fechas |

### 1.3 Patrones de Diseño

1. **Factory Pattern**: `normalizePayload()` en `generateFromMeta.js`
2. **Strategy Pattern**: Parsers de `src/parsers/`
3. **Template Method**: Generación de documentos con mapeos configurables
4. **State Machine**: Flujo del bot en `src/core/index.js`
5. **Adapter Pattern**: Router universal en `src/router/index.js`

### 1.4 Separación de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA           │ ARCHIVOS CLAVE              │ RESPONSABILIDAD          │
├─────────────────────────────────────────────────────────────┤
│ Frontend       │ web/app.js, web/index.html  │ UI, validación, llamadas │
│ API            │ server.js                   │ HTTP, auth, routing      │
│ Core           │ src/core/index.js           │ Flujo conversacional     │
│ App            │ src/app/generateFromMeta.js │ Orquestación             │
│ Documentos     │ src/documents/generator.js  │ Generación PDF/DOCX      │
│ Cálculos       │ src/calculators/            │ Plan de pagos            │
│ Parsers        │ src/parsers/                │ Normalización datos      │
│ Utils          │ src/utils/                  │ Funciones auxiliares     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. MÓDULOS Y COMPONENTES

### 2.1 Estructura de Carpetas

```
src/
├── app/
│   └── generateFromMeta.js     # ← ORQUESTADOR PRINCIPAL
├── bot.js                      # Punto de entrada del bot WhatsApp
├── core/
│   └── index.js                # Lógica conversacional del bot
├── calculators/
│   └── planPagos.js            # Cálculo de plan de pagos
├── db/
│   └── memory.js               # Estado en memoria (SESS, DRAFTS)
├── documents/
│   └── generator.js            # Motor de documentos (pagarés + contratos)
├── lib/
│   └── docx.js                 # Wrapper de docxtemplater
├── modules/
│   └── contracts/
│       ├── decorate.js         # Enriquecimiento de datos para contrato
│       ├── doublepass.js       # Doble pasada DOCX→PDF con foliado/QR
│       └── generate.js         # Entry point generación contratos
├── parsers/
│   ├── date.js                 # Parser de fechas
│   ├── money.js                # Parser de montos
│   └── oldParsers.js           # Parsers legacy (género, sí/no, etc)
├── router/
│   └── index.js                # Adapter universal para testing
├── steps/
│   └── definitions.js          # Definición de pasos del wizard
├── templates/
│   └── v1/
│       └── contract.docx       # Plantilla DOCX
├── test/
│   └── mockCtx.js              # Mock para smoke tests
└── utils/
    ├── sanitizeFolderName.js   # Sanitización de nombres de carpeta
    └── office.js               # Conversión LibreOffice

config/
├── mapping_v1.json             # Mapeo campos pagarés
├── mapping.safe.js             # Mapeo campos contratos
└── sample_input.json           # Ejemplo de entrada

web/
├── index.html                  # Wizard principal
├── app.js                      # Lógica frontend
├── auth.js                     # Autenticación JWT
├── login.html                  # Pantalla login
├── login.js                    # Lógica login
└── styles.css                  # Estilos

templates/
├── base.pdf                    # Template base pagarés
└── v1/contract.docx            # Plantilla contratos

data/
└── clientes/                   # Datos generados (cliente/fecha/archivos)
```

### 2.2 Descripción Detallada por Módulo

#### 2.2.1 `src/app/generateFromMeta.js` - ORQUESTADOR

**Propósito**: Punto de entrada unificado para generación de documentos.

**Funciones clave**:
```javascript
// Normaliza payload del wizard o bot a formato interno
function normalizePayload(raw) { ... }

// Función principal llamada por server.js
async function generateFromMeta({ basePath, docs }) { ... }
```

**Datos de entrada**:
```javascript
{
  tipoDocumento: 'ambos',        // 'contrato' | 'pagares' | 'ambos'
  fechaEmision: Date | string,
  total: number,
  enganche: number,
  mensual: number,
  deudor: string,
  beneficiario: string,
  // ... (ver sección 12)
}
```

**Datos de salida**:
```javascript
{
  pagaresPdfPath: '/abs/path/to/lote.pdf',
  contratoPdfPath: '/abs/path/to/contrato.pdf'
}
```

**Dependencias**:
- `src/documents/generator.js` - Genera documentos
- `src/parsers/*` - Normaliza datos

---

#### 2.2.2 `src/documents/generator.js` - MOTOR DE DOCUMENTOS

**Propósito**: Genera pagarés y contratos.

**Funciones principales**:
```javascript
// Genera lote de pagarés + meta.json
async function generarLoteYMeta(data) { ... }

// Genera contrato DOCX→PDF
async function generarContrato(data) { ... }

// Calcula lista de pagarés con fechas
function calcListaPagares(data) { ... }
```

**Flujo de pagarés**:
1. Validar que anualidades ≤ saldo
2. Calcular plan de pagos en centavos
3. Para cada pagaré:
   - Renderizar PDF base con `pdf-lib`
   - Generar hash pre-QR
   - Inyectar QR con datos
   - Guardar individual
4. Mergear todos en lote único
5. Generar `meta.json` y archivos de auditoría

**Flujo de contratos**:
1. Calcular lista de pagarés
2. Enriquecer datos de predio/linderos
3. Construir mapeo con `mapping.safe.js`
4. Llamar a `generateContractDocxPdf()`
5. Guardar en `data/clientes/{slug}/{fecha}/contrato/`

---

#### 2.2.3 `src/calculators/planPagos.js` - CÁLCULOS FINANCIEROS

**Función principal**:
```javascript
function calcListaPagares(total, enganche, numPagos, fechaInicio, diaBase) {
  // Retorna: [{ folio, monto, fecha_vencimiento, tipo }, ...]
}
```

**Lógica interna** (en `generator.js`):
```javascript
// Trabaja en CENTAVOS para evitar errores de punto flotante
const saldo_c = toCents(data.saldo);
const mens_c = toCents(data.mensual);

// Calcula número de mensualidades
const N = Math.ceil(saldo_c / mens_c);

// Distribuye sobrepago desde el final
const montos = planPagosPorCents(saldo_c, mens_c);
// Ej: [10000, 10000, 10000, 9997] para saldo de 39997
```

---

#### 2.2.4 `src/parsers/` - NORMALIZADORES

| Archivo | Función | Ejemplo entrada → salida |
|---------|---------|--------------------------|
| `money.js` | `parseMoneyLoose()` | "250 mil" → 250000.00 |
| `date.js` | `parseDateDMYLoose()` | "hoy" → Date() |
| `oldParsers.js` | `parseGenero()` | "Hombre" → "EL COMPRADOR" |
| `oldParsers.js` | `parseRegla1530()` | "siguiente mes" → "siguiente" |

---

#### 2.2.5 `src/core/index.js` - BOT CONVERSACIONAL

**Estado del flujo** (SESS):
```javascript
{
  idx: 0,                    // Índice del paso actual
  data: { ... },             // Datos capturados
  mode: 'capture',           // 'capture' | 'block-summary' | 'edit-*' | 'final-summary'
  currentBlock: 'A',         // Bloque actual (A, B, C)
  summaryFromFinal: false    // Si vino de resumen final
}
```

**Bloques de datos**:
- **Bloque A**: Venta (total, enganche, mensual, anualidades, regla 15/30)
- **Bloque B**: Personas (deudor, beneficiario, dirección, etc.)
- **Bloque C**: Predio (solo si tipoDocumento !== 'pagares')

---

## 3. FLUJO DE DATOS DETALLADO

### 3.1 Wizard Web: Formulario → Servidor

```
┌─────────────┐    POST /api/capturas     ┌─────────────┐
│   Browser   │ ────────────────────────> │   server.js │
│  (app.js)   │                           │             │
└─────────────┘                           └─────────────┘
                                                 │
                                                 ▼
┌─────────────┐    POST /api/generar      ┌─────────────┐
│   Browser   │ <──────────────────────── │  Guarda en  │
│             │    (devuelve URLs)        │ data/clientes/
└─────────────┘                           └─────────────┘
       │
       ▼
GET /api/descargar?path=...
```

**Payload de `/api/capturas`**:
```json
{
  "payload": {
    "tipoDocumento": "ambos",
    "fechaEmision": "23/02/2026",
    "total": 485000,
    "enganche": 75000,
    "mensual": 22500,
    "_tieneAnualidades": true,
    "anualidadMonto": 15000,
    "numeroAnualidades": 3,
    "anualidadMes": "febrero",
    "reglaPref": "siguiente",
    "moratorios": 2,
    "interes": 1.5,
    "beneficiario": "Marina Hernández",
    "vendedorNombre": "Roberto Carlos Méndez",
    "vendedorDomicilio": "Calle Primavera 128",
    "deudor": "Ana Sofía Ramírez",
    "deudorGenero": "Mujer",
    "direccion": "Av. Insurgentes Sur 3847",
    "poblacion": "Tlalpan, CDMX, C.P. 14000",
    "lugarExpedicion": "Chalco, Estado de México",
    "lugarPagoIgualExpedicion": false,
    "lugarPago": "Texcoco, Edo. Méx.",
    "telefono": "5587654321",
    "predioNombre": "Terreno Las Flores",
    "predioUbicacion": "Camino Real a San Miguel km 2.5",
    "predioMunicipio": "Chalco",
    "predioManzanaLote": "Manzana 14 Lote 22",
    "predioSuperficie": "320",
    "linderoNorte": "10 | con camino vecinal",
    "linderoSur": "10 | con lote 23",
    "linderoOriente": "32 | con terreno ejidal",
    "linderoPoniente": "32 | con barranca",
    "testigos": "María González | Carlos Ruiz"
  }
}
```

### 3.2 Procesamiento: Datos → Documentos

**Paso a paso en `generateFromMeta`**:

1. **Normalización** (`normalizePayload`):
   - Convierte strings de fecha a objetos Date
   - Parsea montos con `parseMoneyLoose`
   - Calcula saldo = total - enganche
   - Normaliza regla 15/30

2. **Generación de pagarés** (si aplica):
   ```javascript
   const { baseDir, lotePath } = await generarLoteYMeta(data);
   ```

3. **Generación de contrato** (si aplica):
   ```javascript
   const { pdfPath } = await generarContrato(data);
   ```

4. **Actualización de metadatos**:
   - Guarda `meta.json` actualizado
   - Genera `audit.json` para trazabilidad

### 3.3 Generación PDF Pagarés: Flujo Completo

```
Entrada: data { total, enganche, mensual, fechaEmision, ... }
    │
    ▼
┌─────────────────────────────────────────┐
│  calcListaPagares(data)                 │
│  - Calcula saldo_c en centavos          │
│  - Ajusta distribución desde el final   │
│  - Inserta anualidades en mes indicado  │
│  - Genera array de {folio, monto, fecha}│
└─────────────────────────────────────────┘
    │
    ▼
Para cada pagaré en lista:
    │
    ├── 1. Construir payload
    │      { deudor: {...}, beneficiario: {...}, pagare: {...} }
    │
    ├── 2. Generar hash pre-QR
    │      sha256(renderToBuffer sin QR)
    │
    ├── 3. Inyectar QR con hash corto
    │      payload.pagare.qr_text = JSON.stringify({..., h: hash.slice(0,10)})
    │
    ├── 4. Renderizar PDF final
    │      renderToFile(mapping_v1.json, payload, indPath)
    │
    └── 5. Guardar audit individual
           audit_{docId}_{timestamp}.json
    │
    ▼
Mergear todos los PDFs individuales en lote.pdf
    │
    ▼
Guardar meta.json con toda la información
```

### 3.4 Estructura de Almacenamiento

```
data/clientes/
└── {slug-del-cliente}/           # Ej: "juan-perez-garcia"
    └── {YYYY-MM-DD}/             # Ej: "2026-02-23"
        ├── meta.json             # Datos completos de la venta
        ├── audit.json            # Trazabilidad de generación
        ├── lote/
        │   └── lote_{timestamp}.pdf      # PDF unificado de pagarés
        ├── individuales/
        │   ├── PAGARE_01.pdf
        │   ├── PAGARE_02.pdf
        │   └── audit/
        │       └── audit_{id}_{ts}.json   # Audits individuales
        └── contrato/
            ├── contrato_{timestamp}.pdf   # Contrato final
            ├── contrato_{timestamp}.docx  # DOCX intermedio
            └── audit_contrato_{ts}.json   # Hash de verificación
```

---

## 4. ENDPOINTS Y API

### 4.1 Lista Completa de Endpoints

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login, devuelve JWT |
| GET | `/api/auth/verify` | JWT | Verifica token |
| POST | `/api/capturas` | JWT | Guarda metadata de venta |
| POST | `/api/generar` | JWT | Genera documentos |
| GET | `/api/descargar?path=` | JWT | Descarga archivo PDF |
| GET | `/` | No | Sirve web/index.html |

### 4.2 Detalle de Endpoints

#### POST `/api/auth/login`
**Request**:
```json
{
  "username": "isra",
  "password": "adein123"
}
```

**Response 200**:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "isra",
    "name": "Administrador"
  }
}
```

**Response 401**:
```json
{
  "ok": false,
  "error": "Usuario o contraseña incorrectos."
}
```

---

#### POST `/api/capturas`
**Headers**: `Authorization: Bearer {token}`

**Request**:
```json
{
  "payload": { /* ver sección 3.1 */ }
}
```

**Response 200**:
```json
{
  "ok": true,
  "basePath": "data/clientes/juan-perez/2026-02-23",
  "metaPath": "data/clientes/juan-perez/2026-02-23/meta.json",
  "slug": "juan-perez",
  "dateISO": "2026-02-23"
}
```

**Response 400**:
```json
{
  "ok": false,
  "error": "Falta payload."
}
```

---

#### POST `/api/generar`
**Headers**: `Authorization: Bearer {token}`

**Request**:
```json
{
  "basePath": "data/clientes/juan-perez/2026-02-23",
  "docs": "ambos"  // "contrato" | "pagares" | "ambos"
}
```

**Response 200**:
```json
{
  "ok": true,
  "outputs": {
    "contratoPdfUrl": "/api/descargar?path=data/.../contrato.pdf",
    "pagaresPdfUrl": "/api/descargar?path=data/.../lote.pdf"
  }
}
```

**Response 500**:
```json
{
  "ok": false,
  "error": "Las anualidades exceden el saldo."
}
```

---

#### GET `/api/descargar?path={relPath}`
**Headers**: `Authorization: Bearer {token}`

**Parámetros**: `path` - Ruta relativa al archivo (desde root del proyecto)

**Response 200**: Archivo PDF (Content-Type: application/pdf)

**Response 400**: `Ruta inválida.` (si intenta salir de data/clientes/)

**Response 404**: `Archivo no encontrado.`

### 4.3 Códigos de Error Comunes

| Código | Significado | Solución |
|--------|-------------|----------|
| 400 | Bad Request | Revisar formato del payload |
| 401 | Unauthorized | Token inválido o expirado |
| 404 | Not Found | Archivo no existe |
| 500 | Server Error | Revisar logs del servidor |

---

## 5. SISTEMA DE PLANTILLAS

### 5.1 Pagarés: `config/mapping_v1.json`

```json
{
  "pdf": {
    "base": "templates/base.pdf",
    "qr": { "x_mm": 70, "y_mm": 8, "size_mm": 16 }
  },
  "fields": {
    "monto en letra": { "from": "pagare.monto", "type": "currencyWords" },
    "monto": { "from": "pagare.monto", "type": "currency" },
    "no_folio ": { "from": "pagare.folio", "pad": 2 },
    "lugar expedicion": { "from": "pagare.lugarExpedicion" },
    "dia": { "from": "pagare.fechaEmision", "type": "day" },
    "mes": { "from": "pagare.fechaEmision", "type": "monthName" },
    "año": { "from": "pagare.fechaEmision", "type": "year" },
    "beneficiario": { "from": "beneficiario.nombre" },
    "fecha de pago ": { "from": "pagare.fechaVencimiento", "type": "dateDMY" },
    "numero de pagares ": { "from": "pagare.numeroDePagares" },
    "moratorios": { "from": "pagare.moratorios", "type": "percent" },
    "nombre deudor": { "from": "deudor.nombre" },
    "direccion deudor": { "from": "deudor.direccion" },
    "poblacion deudor ": { "from": "deudor.poblacion" },
    "lugar de pago 1": { "from": "pagare.lugarDePago" }
  }
}
```

**Tipos de campo disponibles**:
| Tipo | Descripción | Ejemplo salida |
|------|-------------|----------------|
| `currency` | Número con formato MXN | "$250,000.00" |
| `currencyWords` | Número a letras | "DOSCIENTOS CINCUENTA MIL PESOS" |
| `dateLong` | Fecha larga | "23 DE FEBRERO DE 2026" |
| `dateDMY` | Fecha corta | "23/02/2026" |
| `day` | Solo día | "23" |
| `monthName` | Nombre del mes | "FEBRERO" |
| `year` | Año | "2026" |
| `percent` | Porcentaje | "2%" |

### 5.2 Contratos: `config/mapping.safe.js`

**Función principal**:
```javascript
module.exports = function buildMapping(data, opts = {}) {
  // ... lógica de normalización ...
  return {
    'nombre deudor': data.deudor.toUpperCase(),
    'total': formatCurrency(total),
    'total_en_letra': monedaEnLetras(total),
    'pagares': [ /* array para loop */ ],
    // ... más campos
  };
};
```

**Campos especiales para DOCX**:
- `{#pagares}` - Loop de pagarés (ANEXO I)
- `{num_hojas}` - Número de páginas (calculado en doble pasada)
- Condicionales: Docxtemplater soporta `{?condicion}texto{/condicion}`

### 5.3 Cómo Modificar Plantillas

#### Agregar campo en pagaré:
1. Editar `templates/base.pdf` (con Acrobat/Editor PDF) - agregar campo de formulario
2. Agregar entrada en `config/mapping_v1.json`:
   ```json
   "nombre nuevo campo": { "from": "pagare.nuevaPropiedad", "type": "currency" }
   ```
3. Actualizar payload en `generator.js` para incluir `nuevaPropiedad`

#### Agregar campo en contrato:
1. Editar `templates/v1/contract.docx` - agregar placeholder `{nombre_campo}`
2. Agregar en `config/mapping.safe.js`:
   ```javascript
   'nombre_campo': data.valorCampo.toUpperCase()
   ```

**IMPORTANTE**: Los nombres de campos en el PDF deben coincidir EXACTAMENTE (case-sensitive).

---

## 6. CÁLCULOS FINANCIEROS

### 6.1 Plan de Pagos (`calcListaPagares`)

**Algoritmo en centavos** (evita errores de punto flotante):

```javascript
function planPagosPorCents(saldo_c, mensual_c) {
  const N = Math.ceil(saldo_c / mensual_c);
  const montos = Array(N).fill(mensual_c);
  const sobrepago = N * mensual_c - saldo_c;
  
  // Distribuir sobrepago desde el FINAL
  let rest = sobrepago;
  for (let i = N - 1; i >= 0 && rest > 0; i--) {
    const can = Math.min(rest, montos[i] - 1);
    montos[i] -= can;
    rest -= can;
  }
  return montos;
}
```

**Ejemplo**:
- Saldo: $39,997
- Mensualidad: $10,000
- Resultado: [10000, 10000, 10000, 9997] (4 pagarés)

### 6.2 Fórmulas de Mensualidad

```
Número de pagarés = CEIL((Saldo - TotalAnualidades) / Mensualidad)

Donde:
- Saldo = Total - Enganche
- TotalAnualidades = MontoAnualidad × CantidadAnualidades
```

### 6.3 Regla 15/30

**Lógica** (`primera15o30` en `generator.js`):

```javascript
function primera15o30(fechaEmision, preferencia) {
  const diaRef = fechaEmision.getDate() <= 15 ? 15 : 30;
  const baseMonthOffset = preferencia === 'siguiente' ? 1 : 0;
  
  // Calcula fecha objetivo
  // Si es febrero y diaRef=30 → usa último día del mes (28/29)
}
```

**Comportamiento**:
| Fecha emisión | Regla | Primer vencimiento |
|---------------|-------|-------------------|
| 10/feb | mismo | 15/feb |
| 10/feb | siguiente | 15/mar |
| 20/feb | mismo | 28/feb (ajuste) |
| 20/feb | siguiente | 30/mar |

### 6.4 Manejo de Fechas Edge Cases

```javascript
function addMonthsKeepBaseDay(date, months, baseDay) {
  const targetMonth = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  // Si baseDay > último día del mes, usa último día
  const day = baseDay > lastDay ? lastDay : baseDay;
  return new Date(year, month, day);
}
```

### 6.5 Anualidades

**Inserción**:
```javascript
// Cuando el mes de vencimiento coincide con anualidadMes
if (annRestantes > 0 && mesVenc === data.anualidadMes) {
  lista.push({ folio: 'XX', monto: anualidadMonto, tipo: 'anualidad' });
  annRestantes--;
}
```

**Orden final**: Todas las mensualidades primero, luego anualidades, reenumeradas.

---

## 7. GENERACIÓN DE DOCUMENTOS

### 7.1 Pagarés con pdf-lib

**Proceso en `src/pdf.js`**:

```javascript
async function renderPagare(mapping, payload) {
  // 1. Cargar PDF base
  const pdfDoc = await PDFDocument.load(fs.readFileSync(mapping.pdf.base));
  const form = pdfDoc.getForm();
  
  // 2. Llenar campos según mapeo
  for (const [pdfField, rule] of Object.entries(mapping.fields)) {
    const val = resolve(payload, rule.from);
    const formatted = formatByType(val, rule.type);
    form.getField(pdfField).setText(formatted);
  }
  
  // 3. Aplanar formulario (hace campos no editables)
  form.flatten();
  
  // 4. Generar e incrustar QR
  const qrPng = await QRCode.toBuffer(qrText, { errorCorrectionLevel: 'H' });
  const qrImg = await pdfDoc.embedPng(qrPng);
  page.drawImage(qrImg, { x, y, width, height });
  
  return pdfDoc.save();
}
```

### 7.2 Contratos: Doble Pasada

**Por qué doble pasada**: Para calcular número de páginas antes de insertarlo en el documento.

```javascript
// Fase 1: Render rápido para contar páginas
const docxTemp = renderDocx(template, data);
const pdfTemp = await libreofficeConvert(docxTemp);
const pages = countPages(pdfTemp);

// Fase 2: Render final con número de páginas
data.num_hojas = pages;
data.num_hojas_letra = numeroALetras(pages);
const docxFinal = renderDocx(template, data);
const pdfFinal = await libreofficeConvert(docxFinal);

// Fase 2b: Agregar foliado y QR
await addPageNumbers(pdfFinal);
await addQRToContractPdf(pdfFinal, mapping, pages, hashPreQR);
```

### 7.3 Sistema de QR

**Datos en QR de pagaré**:
```json
{
  "base": "LIA-juan-perez-2026-02-23-123456789",
  "doc": "LIA-juan-perez-2026-02-23-123456789-P01",
  "folio": 1,
  "monto": 10000,
  "emision": "2026-02-23T00:00:00.000Z",
  "h": "a3f7b2c9d8"  // hash corto para verificación
}
```

**Datos en QR de contrato**:
```json
{
  "tipo": "CONTRATO",
  "nombre": "Juan Pérez",
  "fecha": "23/02/2026",
  "pagares": 4,
  "paginas": 5,
  "folio": "C-001",
  "hash": "a3f7b2c9d8e1f5a2"
}
```

### 7.4 Auditoría y Hashes

**Archivo audit.json (pagaré)**:
```json
{
  "tipo": "PAGARE",
  "baseDocId": "LIA-juan-perez-2026-02-23-123456789",
  "docId": "LIA-juan-perez-2026-02-23-123456789-P01",
  "folio": "01",
  "deudor": "Juan Pérez",
  "monto": "10000.00",
  "hash_sha256_pre_qr": "a3f7b2c9d8e1f5a2...",
  "hash_corto_pre_qr": "a3f7b2c9d8",
  "hash_sha256_post_qr": "b8e4c5d2a9f3...",
  "pdfPath": "/path/to/PAGARE_01.pdf",
  "createdAt": "2026-02-23T15:30:00.000Z"
}
```

**Propósito**: Verificación de integridad. El QR contiene el hash ANTES de insertar el QR mismo (pre-QR), permitiendo detectar modificaciones.

---

## 8. CONFIGURACIÓN Y VARIABLES

### 8.1 Variables de Entorno (.env)

```bash
# Puerto de la aplicación
PORT=3000

# Autenticación JWT (generado automáticamente si no se especifica)
JWT_SECRET=tu-clave-super-secreta-minimo-32-caracteres

# Autenticación Basic (opcional, para proteger toda la API)
ENABLE_AUTH=1
AUTH_USER=isra
AUTH_PASS=adein123
AUTH_REALM=LIA Pagaré

# Sesión de WhatsApp (solo para bot)
SESSION_PATH=.wwebjs_auth
WWEBJS_DIR=.wwebjs_auth

# Entorno
NODE_ENV=production
```

### 8.2 Archivos de Configuración

| Archivo | Propósito | Modificable en runtime |
|---------|-----------|----------------------|
| `config/mapping_v1.json` | Mapeo campos pagarés | ❌ (requiere reinicio) |
| `config/mapping.safe.js` | Lógica contratos | ❌ (requiere reinicio) |
| `templates/base.pdf` | Template pagarés | ✅ (sin reinicio) |
| `templates/v1/contract.docx` | Template contrato | ✅ (sin reinicio) |

### 8.3 Cómo Cambiar Comportamiento sin Código

**Ejemplo: Cambiar posición del QR en pagarés**:
Editar `config/mapping_v1.json`:
```json
"qr": { "x_mm": 80, "y_mm": 10, "size_mm": 20 }
```

**Ejemplo: Cambiar texto legal en contrato**:
Editar directamente `templates/v1/contract.docx` con Word/LibreOffice.

---

## 9. DEPENDENCIAS CRÍTICAS

### 9.1 Lista de Paquetes Esenciales

| Paquete | ¿Qué pasa si falla? | Alternativa |
|---------|---------------------|-------------|
| `pdf-lib` | No se generan pagarés | Ninguna (core) |
| `docxtemplater` | No se generan contratos | Ninguna (core) |
| `libreoffice-convert` | Contratos sin PDF | Instalar LibreOffice manualmente |
| `qrcode` | Pagarés sin QR | Ninguna (feature) |
| `puppeteer` | Bot de WhatsApp no funciona | Omitir si solo se usa web |
| `whatsapp-web.js` | Bot de WhatsApp no funciona | Omitir si solo se usa web |
| `date-fns` | Cálculo de fechas incorrecto | Migrar a dayjs |
| `sharp` | Procesamiento de imágenes lento | Usar jimp (más lento) |

### 9.2 Dependencias del Sistema

| Software | Uso | Sin él... |
|----------|-----|-----------|
| LibreOffice | DOCX→PDF | Contratos solo en DOCX |
| Node.js v22 | Runtime | No funciona |
| Python 3 | node-gyp | Fallan paquetes nativos |
| build-essential | Compilación | Fallan canvas/sharp |

---

## 10. DEPURACIÓN Y TROUBLESHOOTING

### 10.1 Logs

**Consola**: El servidor usa `console.log` directo.

**Habilitar modo debug**:
```bash
NODE_ENV=development DEBUG=* node server.js
```

**Logs de generación**: El motor imprime pasos clave:
```
[DEBUG generateFromMeta] Iniciando...
[DEBUG generateFromMeta] Generando pagarés...
[DEBUG generateFromMeta] baseDir generado: data/clientes/...
[DEBUG generateFromMeta] Generando contrato...
```

### 10.2 Errores Comunes y Soluciones

#### Error: "Las anualidades exceden el saldo"
**Causa**: `anualidadMonto × numeroAnualidades > saldo`
**Solución**: Validar en frontend o ajustar valores

#### Error: "No encontré la plantilla DOCX"
**Causa**: Falta `templates/v1/contract.docx`
**Solución**: Verificar que existe el archivo

#### Error: "LibreOffice convert error"
**Causa**: LibreOffice no instalado o no en PATH
**Solución**:
```bash
sudo apt install libreoffice libreoffice-writer
which soffice  # Verificar que está en PATH
```

#### Error: "EACCES: permission denied"
**Causa**: Usuario sin permisos en `data/`
**Solución**:
```bash
sudo chown -R $(whoami):$(whoami) data/
chmod -R 755 data/
```

#### Error: "Cannot find module 'pdf-lib'"
**Causa**: `node_modules` incompleto
**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 10.3 Testing Local

**Test completo**:
```bash
node test.js
```

**Test de humo** (simula conversación de bot):
```bash
npm run smoke
```

**Test con montos aleatorios**:
```bash
npm run test-montos
```

**Test específico**:
```bash
node scripts/smoke.js tests/cases/venta_contrato.json
```

### 10.4 Simular Errores de Producción

**Test con datos inválidos**:
```javascript
// En test.js, modificar payload:
{
  anualidadMonto: 999999999,  // Forzar error de anualidades
  numeroAnualidades: 100
}
```

**Test sin LibreOffice**:
```bash
sudo mv /usr/bin/soffice /usr/bin/soffice.bak
node test.js  # Debe fallar en contratos
sudo mv /usr/bin/soffice.bak /usr/bin/soffice
```

---

## 11. GUÍA DE MODIFICACIÓN

### 11.1 Checklist: Agregar Nuevo Campo en Wizard

- [ ] Agregar input en `web/index.html`
- [ ] Agregar validación en `web/app.js` (función `validateStep`)
- [ ] Agregar en `buildPayload()` en `web/app.js`
- [ ] Agregar en `normalizePayload()` en `src/app/generateFromMeta.js`
- [ ] Agregar en `src/steps/definitions.js` (si aplica para bot)
- [ ] Actualizar `renderSummary()` en `web/app.js`
- [ ] Probar con `node test.js`

### 11.2 Checklist: Modificar Documento PDF (Pagaré)

- [ ] Editar `templates/base.pdf` con editor PDF
- [ ] Agregar campo de formulario con nombre exacto deseado
- [ ] Agregar entrada en `config/mapping_v1.json`
- [ ] Actualizar payload en `generator.js` si es necesario
- [ ] Probar generación

### 11.3 Checklist: Modificar Contrato DOCX

- [ ] Hacer backup de `templates/v1/contract.docx`
- [ ] Editar con Word/LibreOffice
- [ ] Agregar placeholder `{nombre_campo}` donde corresponda
- [ ] Agregar mapeo en `config/mapping.safe.js`
- [ ] Probar generación

### 11.4 Checklist: Cambiar Cálculos Financieros

- [ ] Identificar función en `src/calculators/planPagos.js` o `generator.js`
- [ ] Modificar lógica (trabajar en centavos siempre)
- [ ] Actualizar tests si existen
- [ ] Probar con múltiples escenarios (febrero, meses 30/31, ajuste final)

### 11.5 Qué NO Tocar Bajo Ninguna Circunstancia

| Componente | Razón |
|------------|-------|
| `calcListaPagares` lógica de centavos | Riesgo de errores de redondeo |
| Sistema de hashes/auditoría | Integridad legal de documentos |
| Normalización de rutas (`sanitizeFolderName`) | Riesgo de path traversal |
| Validación de paths en `/api/descargar` | Seguridad - path traversal |

---

## 12. REFERENCIA RÁPIDA

### 12.1 Glosario de Términos del Negocio

| Término | Significado |
|---------|-------------|
| **Pagare** | Documento de crédito que obliga al deudor a pagar una cantidad en fecha determinada |
| **Contrato** | Acuerdo legal de compraventa del predio |
| **Anualidad** | Pago extraordinario que se realiza una vez al año (generalmente mayor a la mensualidad) |
| **Regla 15/30** | Norma para determinar fecha de primer pago: día 15 si emisión ≤ día 15, día 30 si emisión > día 15 |
| **Lindero** | Límite o frontera del terreno en cada dirección (norte, sur, oriente, poniente) |
| **Predio** | Terreno o propiedad inmueble objeto de la venta |
| **Enganche** | Pago inicial (down payment) |
| **Saldo** | Monto restante a pagar (total - enganche) |
| **Moratorios** | Intereses por pago tardío |
| **Foliado** | Numeración de páginas en documentos |

### 12.2 Estructura de Datos Principal (Objeto "venta")

```javascript
{
  // Identificación
  tipoDocumento: 'ambos',        // 'contrato' | 'pagares' | 'ambos'
  
  // Financieros (OBLIGATORIOS)
  total: 250000.00,              // number
  enganche: 50000.00,            // number
  mensual: 5000.00,              // number
  saldo: 200000.00,              // calculado: total - enganche
  
  // Anualidades (opcional)
  _tieneAnualidades: true,
  anualidadMonto: 15000.00,
  numeroAnualidades: 3,
  anualidadMes: 2,               // 1-12
  
  // Fechas y reglas
  fechaEmision: Date,
  reglaPref: 'siguiente',        // 'mismo' | 'siguiente'
  
  // Tasas
  moratorios: 2,                 // %
  interes: 1.5,                  // % (cláusula cuarta)
  
  // Personas
  beneficiario: 'Nombre Apellido',
  vendedor_nombre: 'Nombre Vendedor',
  vendedor_domicilio: 'Dirección',
  deudor: 'Nombre Deudor',
  deudorGenero: 'EL COMPRADOR',  // 'EL COMPRADOR' | 'LA COMPRADORA'
  direccion: 'Calle número',
  poblacion: 'Ciudad, Estado, CP',
  lugarExpedicion: 'Ciudad',
  lugarPago: 'Ciudad',
  telefono: '5512345678',
  
  // Predio (solo contratos)
  predioNombre: 'Nombre del predio',
  predioUbicacion: 'Dirección completa',
  predioMunicipio: 'Municipio',
  predioManzanaLote: 'M-12 L-5',
  predioSuperficie: '200',       // m²
  
  // Linderos
  linderoNorte: '15 | con calle',
  linderoSur: '15 | con lote 4',
  linderoOriente: '32 | con barranca',
  linderoPoniente: '32 | con camino',
  
  // Testigos
  testigos: 'Testigo 1 | Testigo 2'
}
```

### 12.3 Campos Obligatorios vs Opcionales

**Obligatorios para todos los documentos**:
- `tipoDocumento`, `total`, `enganche`, `mensual`
- `deudor`, `beneficiario`
- `fechaEmision`, `lugarExpedicion`

**Obligatorios solo para contratos**:
- `vendedor_nombre`, `vendedor_domicilio`
- `predioNombre`, `predioUbicacion`, `predioMunicipio`
- `linderoNorte`, `linderoSur`, `linderoOriente`, `linderoPoniente`

**Opcionales**:
- `anualidadMonto` (default: 0)
- `numeroAnualidades` (default: 0)
- `telefono` (default: '')
- `interes` (default: 0)

### 12.4 Formatos de Datos

| Tipo | Formato de entrada | Ejemplo válido |
|------|-------------------|----------------|
| Dinero | Número o string | `250000`, `"250 mil"`, `"$250,000.00"` |
| Fecha | DD/MM/AAAA o "hoy" | `"23/02/2026"`, `"hoy"` |
| Porcentaje | Número 0-100 | `2`, `2.5` |
| Género | 1/2 o texto | `"1"`, `"Hombre"`, `"Mujer"` |
| Mes | 1-12 o nombre | `2`, `"febrero"` |
| Teléfono | 10+ dígitos | `"5512345678"`, `"+52 55 1234 5678"` |
| Lindero | "metros | colinda" | `"15 | con calle"` |
| Testigos | "Nombre 1 | Nombre 2" | `"Juan | María"` |

---

## 13. APÉNDICES

### 13.1 Código Legacy a Refactorizar

| Ubicación | Problema | Severidad |
|-----------|----------|-----------|
| `src/core/index.js:154-233` | Función `runParser` con switch enorme | Media |
| `src/documents/generator.js:221-290` | Duplicación de lógica de linderos | Baja |
| `config/mapping.safe.js` | Múltiples fallback para mismo campo | Media |

### 13.2 Extensiones Futuras Sugeridas

1. **Base de datos real**: Migrar de JSON files a PostgreSQL/MongoDB
2. **Caché de plantillas**: Cachear en memoria los templates PDF/DOCX
3. **Generación async**: Cola de trabajo con Bull/Redis para lotes grandes
4. **Previews**: Generar imagen preview del documento antes de descargar
5. **API REST completa**: CRUD de clientes, histórico, búsquedas

### 13.3 Contactos y Recursos

- **Repositorio**: `Copia de LIA-WEB-ESTABLE-SERVER`
- **Documentación deploy**: `DEPLOY_ANALYSIS.md`
- **Inicio rápido**: `DEPLOY_QUICKSTART.md`

---

*Fin del Manual del Desarrollador*

**Nota**: Este manual es un documento vivo. Actualizar cuando se realicen cambios significativos en la arquitectura o funcionalidad del sistema.
