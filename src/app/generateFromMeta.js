const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const { generarLoteYMeta, generarContrato } = require('../documents/generator');
const { parseMoneyLoose } = require('../parsers/money');
const { parseDateDMYLoose } = require('../parsers/date');
const {
  parseGenero,
  parseMesLoose,
  parsePercentLoose,
  parseTelefono
} = require('../parsers/oldParsers');

function toNumber(value, parser) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return parser(String(value));
}

function parseFecha(raw) {
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

function normalizeRegla(raw) {
  if (!raw) return 'mismo';
  const s = String(raw).toLowerCase();
  if (s.includes('siguiente')) return 'siguiente';
  return 'mismo';
}

function normalizePayload(raw) {
  const tipoDocumento = raw.tipoDocumento || raw.documento || raw.docs || 'ambos';
  const fechaEmision = parseFecha(raw.fechaEmision || raw.fechaEmisionLote || raw.fecha);
  const total = toNumber(raw.total ?? raw.montoTotalVenta, parseMoneyLoose);
  const engancheRaw = raw.enganche;
  const engancheSafe = (engancheRaw === undefined || engancheRaw === null || String(engancheRaw).trim() === '')
    ? '0'
    : engancheRaw;
  const enganche = toNumber(engancheSafe, parseMoneyLoose);
  const mensual = toNumber(raw.mensual ?? raw.mensualidad, parseMoneyLoose);
  const anualidadMonto = toNumber(raw.anualidadMonto ?? raw.anualidadMontoValor, parseMoneyLoose);
  const numeroAnualidades = Math.round(
    toNumber(raw.numeroAnualidades ?? raw.anualidadCantidad, parseMoneyLoose)
  );
  const anualidadMes = Math.round(
    toNumber(raw.anualidadMes ?? raw.anualidadMesVence, parseMesLoose)
  );
  const moratorios = toNumber(raw.moratorios ?? raw.interesMoratorioAnual, parsePercentLoose);
  const interes = toNumber(raw.interes ?? raw.interesAnualClausulaCuarta, parsePercentLoose);
  const telefono = raw.telefono || raw.telefonoCliente ? parseTelefono(raw.telefono || raw.telefonoCliente) : '';

  const tieneAnualidades = raw._tieneAnualidades === true || raw.anualidades === true || numeroAnualidades > 0;

  const lugarPagoIgual = raw.lugarPagoIgualExpedicion === true || raw.lugarPagoIgual === true;
  const lugarExpedicion = raw.lugarExpedicion || raw.lugarExpedicionTexto || '';
  const lugarPago = lugarPagoIgual
    ? lugarExpedicion
    : (raw.lugarPago || raw.lugarPagoOtro || '');

  return {
    total,
    enganche,
    saldo: Number((total - enganche).toFixed(2)),
    mensual,
    beneficiario: raw.beneficiario || raw.beneficiarioNombreCompleto || '',
    vendedor_nombre: raw.vendedor_nombre || raw.vendedorNombre || raw.vendedorNombreCompleto || '',
    vendedor_domicilio: raw.vendedor_domicilio || raw.vendedorDomicilio || '',
    deudor: raw.deudor || raw.deudorNombreCompleto || '',
    deudorGenero: raw.deudorGenero ? parseGenero(raw.deudorGenero) : '',
    direccion: raw.direccion || raw.deudorDireccionCompleta || '',
    poblacion: raw.poblacion || raw.deudorPoblacion || '',
    lugarExpedicion,
    lugarPago,
    fechaEmision,
    moratorios,
    telefono,
    reglaPref: normalizeRegla(raw.reglaPref || raw.regla1530 || raw.primerPagoMes || raw.regla),
    anualidadMonto: tieneAnualidades ? anualidadMonto : 0,
    numeroAnualidades: tieneAnualidades ? numeroAnualidades : 0,
    anualidadMes: tieneAnualidades ? anualidadMes : 12,
    tipoDocumento,
    numeroPagares: raw.numeroPagares || 0,
    interes,
    _tieneAnualidades: tieneAnualidades,
    predioNombre: raw.predioNombre || raw.predio_nombre || '',
    predioUbicacion: raw.predioUbicacion || raw.predioUbicacionCompleta || '',
    predioMunicipio: raw.predioMunicipio || '',
    predioManzanaLote: raw.predioManzanaLote || '',
    predioSuperficie: raw.predioSuperficie || raw.predioSuperficieM2 || '',
    linderoNorte: raw.linderoNorte || '',
    linderoSur: raw.linderoSur || '',
    linderoOriente: raw.linderoOriente || '',
    linderoPoniente: raw.linderoPoniente || '',
    testigos: raw.testigos || '',
    testigo1: raw.testigo1 || '',
    testigo2: raw.testigo2 || ''
  };
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

async function copyDirSkippingMeta(srcDir, destDir) {
  await fse.ensureDir(destDir);
  await fse.copy(srcDir, destDir, {
    overwrite: true,
    filter: (item) => path.basename(item) !== 'meta.json'
  });
}

async function ensureAuditJson(basePath, meta, outputs, docs) {
  const auditPath = path.join(basePath, 'audit.json');
  if (fs.existsSync(auditPath)) return;
  const now = new Date().toISOString();
  const payload = {
    docId: meta.docId || `LIA-WEB-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    docs,
    outputs
  };
  writeJsonAtomic(auditPath, payload);
}

async function generateFromMeta({ basePath, docs }) {
  console.log('[DEBUG generateFromMeta] Iniciando...');
  console.log('[DEBUG generateFromMeta] basePath:', basePath);
  console.log('[DEBUG generateFromMeta] docs:', docs);
  
  if (!basePath) throw new Error('basePath requerido');

  const metaPath = path.join(basePath, 'meta.json');
  console.log('[DEBUG generateFromMeta] metaPath:', metaPath);
  console.log('[DEBUG generateFromMeta] metaPath existe:', fs.existsSync(metaPath));
  
  if (!fs.existsSync(metaPath)) throw new Error('meta.json no encontrado');

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const payload = meta.payload || meta;
  const data = normalizePayload(payload);

  const outputs = {};
  let pagaresBaseDir = null;

  try {
    if (docs === 'pagares' || docs === 'ambos') {
      console.log('[DEBUG generateFromMeta] Generando pagarés...');
      const { baseDir, lotePath } = await generarLoteYMeta({ ...data });
      console.log('[DEBUG generateFromMeta] baseDir generado:', baseDir);
      console.log('[DEBUG generateFromMeta] lotePath:', lotePath);
      pagaresBaseDir = baseDir;
      const resolvedBaseDir = path.resolve(baseDir);
      const resolvedBasePath = path.resolve(basePath);
      console.log('[DEBUG generateFromMeta] resolvedBaseDir:', resolvedBaseDir);
      console.log('[DEBUG generateFromMeta] resolvedBasePath:', resolvedBasePath);
      
      // Comparación case-insensitive en macOS (case-insensitive filesystem)
      const isSameDir = process.platform === 'darwin'
        ? resolvedBaseDir.toLowerCase() === resolvedBasePath.toLowerCase()
        : resolvedBaseDir === resolvedBasePath;
      console.log('[DEBUG generateFromMeta] son iguales (case-' + (process.platform === 'darwin' ? 'insensitive' : 'sensitive') + '):', isSameDir);
      
      if (!isSameDir) {
        console.log('[DEBUG generateFromMeta] Copiando directorio...');
        await copyDirSkippingMeta(baseDir, basePath);
        console.log('[DEBUG generateFromMeta] Eliminando directorio temporal...');
        await fse.remove(baseDir);
      } else {
        console.log('[DEBUG generateFromMeta] Directorios son el mismo, omitiendo copia');
      }
      outputs.pagaresPdfPath = path.join(basePath, 'lote', path.basename(lotePath));
      console.log('[DEBUG generateFromMeta] pagaresPdfPath:', outputs.pagaresPdfPath);
    }

    if (docs === 'contrato' || docs === 'ambos') {
      console.log('[DEBUG generateFromMeta] Generando contrato...');
      const { pdfPath } = await generarContrato({ ...data });
      console.log('[DEBUG generateFromMeta] pdfPath generado:', pdfPath);
      const contratoDir = path.join(basePath, 'contrato');
      console.log('[DEBUG generateFromMeta] contratoDir:', contratoDir);
      await fse.ensureDir(contratoDir);
      const targetPdf = path.join(contratoDir, path.basename(pdfPath));
      console.log('[DEBUG generateFromMeta] targetPdf:', targetPdf);
      console.log('[DEBUG generateFromMeta] Copiando PDF del contrato...');
      await fse.copy(pdfPath, targetPdf, { overwrite: true });
      outputs.contratoPdfPath = targetPdf;
      console.log('[DEBUG generateFromMeta] contrato copiado exitosamente');
    }

    console.log('[DEBUG generateFromMeta] Actualizando meta.json...');
    const updatedMeta = {
      ...meta,
      updatedAt: new Date().toISOString(),
      outputs: {
        ...meta.outputs,
        ...outputs
      }
    };
    writeJsonAtomic(metaPath, updatedMeta);
    console.log('[DEBUG generateFromMeta] meta.json actualizado');

    console.log('[DEBUG generateFromMeta] Generando audit.json...');
    await ensureAuditJson(basePath, updatedMeta, outputs, docs);
    console.log('[DEBUG generateFromMeta] audit.json generado');

    console.log('[DEBUG generateFromMeta] Completado. Outputs:', Object.keys(outputs));
    return outputs;
  } catch (err) {
    console.error('[DEBUG generateFromMeta] ERROR STACK:', err.stack);
    console.error('[DEBUG generateFromMeta] ERROR MESSAGE:', err.message);
    throw err;
  }
}

module.exports = { generateFromMeta };
