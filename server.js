const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const dotenv = require('dotenv');
const { parseDateDMYLoose } = require('./src/parsers/date');
const { generateFromMeta } = require('./src/app/generateFromMeta');
const { sanitizeFolderName } = require('./src/utils/sanitizeFolderName');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_CLIENTS_DIR = path.resolve(__dirname, 'data', 'clientes');
const ENABLE_AUTH = String(process.env.ENABLE_AUTH || '0') === '1';
const AUTH_USER = process.env.AUTH_USER;
const AUTH_PASS = process.env.AUTH_PASS;
const AUTH_REALM = process.env.AUTH_REALM || 'LIA Pagaré';

// ============================================================================
// CONFIGURACIÓN DE AUTENTICACIÓN JWT
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'lia-pagare-secret-key-' + Date.now();
const JWT_EXPIRES_IN = '24h';

// Credenciales hardcodeadas (temporal)
const HARDCODED_USER = 'isra';
const HARDCODED_PASS = 'adein123';

/**
 * Genera un JWT simple usando crypto
 */
function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 horas
  };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedBody = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64url');
  
  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Verifica un JWT
 */
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedBody, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedBody}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const body = JSON.parse(Buffer.from(encodedBody, 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    
    if (body.exp && body.exp < now) return null;
    
    return body;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para extraer y verificar token de la petición
 */
function extractAuth(req, res, next) {
  req.auth = null;
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    req.auth = verifyToken(match[1]);
  }
  next();
}

app.use(express.json({ limit: '1mb' }));

// Aplicar extracción de auth a todas las rutas
app.use(extractAuth);

function unauthorized(res) {
  res.setHeader('WWW-Authenticate', `Basic realm="${AUTH_REALM}"`);
  return res.status(401).send('Autenticación requerida.');
}

function basicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, encoded] = header.split(' ');
  if (type !== 'Basic' || !encoded) {
    return unauthorized(res);
  }
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  if (!user || !pass) {
    return unauthorized(res);
  }
  if (user !== AUTH_USER || pass !== AUTH_PASS) {
    return unauthorized(res);
  }
  return next();
}

if (ENABLE_AUTH) {
  if (!AUTH_USER || !AUTH_PASS) {
    throw new Error('ENABLE_AUTH=1 requiere AUTH_USER y AUTH_PASS.');
  }
  app.use(basicAuth);
}

// ============================================================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================================================

/**
 * POST /api/auth/login
 * Autentica usuario y retorna JWT
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Usuario y contraseña requeridos.' });
    }
    
    // Validar credenciales hardcodeadas
    if (username !== HARDCODED_USER || password !== HARDCODED_PASS) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }
    
    // Generar token
    const token = generateToken({ 
      username,
      name: 'Administrador'
    });
    
    return res.json({
      ok: true,
      token,
      user: {
        username,
        name: 'Administrador'
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Error interno' });
  }
});

/**
 * GET /api/auth/verify
 * Verifica si el token proporcionado es válido
 */
app.get('/api/auth/verify', (req, res) => {
  if (req.auth) {
    return res.json({ ok: true, user: { username: req.auth.username, name: req.auth.name } });
  }
  return res.status(401).json({ ok: false, error: 'Token inválido o expirado.' });
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'web')));

// NOTA: La función slugifyWeb ha sido reemplazada por sanitizeFolderName centralizada
// ubicada en ./src/utils/sanitizeFolderName.js para garantizar consistencia
// entre la creación de carpetas y la generación de documentos.

function parseFechaEmision(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  if (typeof raw === 'number') return new Date(raw);
  const text = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseDateDMYLoose(text);
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  const srcAbs = path.resolve(tmp);
  const dstAbs = path.resolve(filePath);
  const same = process.platform === 'darwin'
    ? srcAbs.toLowerCase() === dstAbs.toLowerCase()
    : srcAbs === dstAbs;
  if (!same) {
    fs.renameSync(tmp, filePath);
  }
}

app.post('/api/capturas', (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) {
      return res.status(400).json({ ok: false, error: 'Falta payload.' });
    }

    const fechaEmision = parseFechaEmision(payload.fechaEmision || payload.fechaEmisionLote);
    const dateISO = ymd(fechaEmision);
    const slug = sanitizeFolderName(payload.deudor || payload.deudorNombreCompleto || 'cliente');

    const basePathRel = path.join('data', 'clientes', slug, dateISO);
    const basePathAbs = path.resolve(__dirname, basePathRel);
    fs.mkdirSync(basePathAbs, { recursive: true });

    const now = new Date().toISOString();
    const meta = {
      ...payload,
      slug,
      dateISO,
      basePath: basePathRel,
      createdAt: payload.createdAt || now,
      updatedAt: now
    };

    const metaPath = path.join(basePathAbs, 'meta.json');
    writeJsonAtomic(metaPath, meta);

    const auditPath = path.join(basePathAbs, 'audit.json');
    if (!fs.existsSync(auditPath)) {
      writeJsonAtomic(auditPath, {
        docId: meta.docId || `LIA-WEB-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        basePath: basePathRel
      });
    }

    return res.json({
      ok: true,
      basePath: basePathRel,
      metaPath: path.join(basePathRel, 'meta.json'),
      slug,
      dateISO
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
});

app.post('/api/generar', async (req, res) => {
  console.log('=== DEBUG GENERAR ===');
  console.log('Endpoint:', req.path);
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Headers Auth:', req.headers.authorization ? 'Presente' : 'Ausente');
  console.log('BASE_CLIENTS_DIR:', BASE_CLIENTS_DIR);
  try {
    const { basePath, docs } = req.body || {};
    console.log('basePath recibido:', basePath);
    if (!basePath) {
      return res.status(400).json({ ok: false, error: 'Falta basePath.' });
    }
    const docsType = docs || 'ambos';
    const basePathAbs = path.resolve(__dirname, basePath);
    console.log('basePathAbs resuelto:', basePathAbs);
    console.log('startsWith check:', basePathAbs.startsWith(BASE_CLIENTS_DIR));
    if (!basePathAbs.startsWith(BASE_CLIENTS_DIR)) {
      return res.status(400).json({ ok: false, error: 'Ruta inválida.' });
    }

    console.log('Llamando a generateFromMeta...');
    const outputs = await generateFromMeta({ basePath: basePathAbs, docs: docsType });
    console.log('generateFromMeta completado. Outputs:', Object.keys(outputs));

    const responseOutputs = {};
    if (outputs.contratoPdfPath) {
      const rel = path.relative(__dirname, outputs.contratoPdfPath).replace(/\\/g, '/');
      responseOutputs.contratoPdfUrl = `/api/descargar?path=${encodeURIComponent(rel)}`;
    }
    if (outputs.pagaresPdfPath) {
      const rel = path.relative(__dirname, outputs.pagaresPdfPath).replace(/\\/g, '/');
      responseOutputs.pagaresPdfUrl = `/api/descargar?path=${encodeURIComponent(rel)}`;
    }

    console.log('===================');
    return res.json({ ok: true, outputs: responseOutputs });
  } catch (error) {
    console.error('STACK COMPLETO:', error.stack);
    console.error('Mensaje:', error.message);
    console.log('===================');
    return res.status(500).json({ ok: false, error: error.message || String(error) });
  }
});

app.get('/api/descargar', (req, res) => {
  const relPath = req.query.path;
  if (!relPath || typeof relPath !== 'string') {
    return res.status(400).send('Falta path.');
  }
  const absPath = path.resolve(__dirname, relPath);
  if (!absPath.startsWith(BASE_CLIENTS_DIR)) {
    return res.status(400).send('Ruta inválida.');
  }
  if (!fs.existsSync(absPath)) {
    return res.status(404).send('Archivo no encontrado.');
  }
  return res.download(absPath);
});

app.listen(PORT, () => {
  console.log(`LIA Pagaré web escuchando en http://localhost:${PORT}`);
});
