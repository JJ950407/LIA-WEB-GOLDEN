#!/usr/bin/env node
/**
 * diff-pdf-pagares.js
 *
 * Utilidad de línea de comandos para comparar el PDF del lote de pagarés
 * con el PDF del anexo del contrato. Extrae fechas y montos de cada
 * pagaré y verifica que coincidan en número, fecha y monto.
 *
 * Uso:
 *   node tools/diff-pdf-pagares.js --lote /ruta/lote.pdf --anexo /ruta/contract-anexo.pdf
 *
 * Opcionales:
 *   --toleranciaCentavos=0   # tolerancia en centavos al comparar montos (por OCR)
 *   --maxFilasAnexo=200      # límite máximo de filas a procesar en el anexo
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const dayjs = require('dayjs');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

function exitErr(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

const lotePath = args.lote || args.l;
const anexoPath = args.anexo || args.a;
const toleranciaCentavos = Number(args.toleranciaCentavos ?? 0);
const maxFilasAnexo = Number(args.maxFilasAnexo ?? 1000);

if (!lotePath || !anexoPath) {
  console.log('Uso: node tools/diff-pdf-pagares.js --lote <lote.pdf> --anexo <contrato.pdf>');
  process.exit(2);
}

if (!fs.existsSync(lotePath)) exitErr(`No existe el archivo de lote: ${lotePath}`);
if (!fs.existsSync(anexoPath)) exitErr(`No existe el archivo del anexo: ${anexoPath}`);

// Expresiones para extraer importes y fechas
const moneyRe = /(?:\$?\s*)?(-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|-?\d+(?:[.,]\d{2})?)/g;
const dateRe = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;

function normAmount(str) {
  if (!str) return null;
  let s = String(str).replace(/[^0-9.,-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const val = Number(s);
  return Number.isFinite(val) ? Math.round(val * 100) : null;
}

function fmtAmountCents(cents) {
  if (cents == null) return '—';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const entero = Math.floor(abs / 100);
  const dec = (abs % 100).toString().padStart(2, '0');
  return `${sign}$${entero.toLocaleString('en-US')}.${dec}`;
}

function extractPairsFromText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const pairs = [];
  for (const line of lines) {
    const dates = [];
    const amounts = [];
    let m;
    while ((m = dateRe.exec(line)) !== null) {
      const [_, d, mo, y] = m;
      const dd = d.padStart(2, '0');
      const mm = mo.padStart(2, '0');
      const iso = `${y}-${mm}-${dd}`;
      if (dayjs(iso, 'YYYY-MM-DD', true).isValid()) {
        dates.push(iso);
      }
    }
    let a;
    while ((a = moneyRe.exec(line)) !== null) {
      const cents = normAmount(a[0]);
      if (cents != null) amounts.push(cents);
    }
    if (dates.length === 1 && amounts.length >= 1) {
      const best = Math.max(...amounts);
      pairs.push({ dateISO: dates[0], amountCents: best, rawLine: line });
    }
  }
  return pairs;
}

async function parsePdfPairs(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const res = await pdf(dataBuffer);
  const text = res.text || '';
  return extractPairsFromText(text);
}

function multisetKey(p) {
  return `${p.dateISO}|${p.amountCents}`;
}

function diffByOrder(aList, bList) {
  const len = Math.max(aList.length, bList.length);
  const diffs = [];
  for (let i = 0; i < len; i++) {
    const a = aList[i];
    const b = bList[i];
    if (!a || !b) {
      diffs.push({ index: i + 1, tipo: 'faltante/sobrante', lote: a ? `${a.dateISO} ${fmtAmountCents(a.amountCents)}` : '—', anexo: b ? `${b.dateISO} ${fmtAmountCents(b.amountCents)}` : '—' });
      continue;
    }
    const dateOk = a.dateISO === b.dateISO;
    const amtOk = Math.abs(a.amountCents - b.amountCents) <= toleranciaCentavos;
    if (!(dateOk && amtOk)) {
      diffs.push({ index: i + 1, tipo: 'desalineado', lote: `${a.dateISO} ${fmtAmountCents(a.amountCents)}`, anexo: `${b.dateISO} ${fmtAmountCents(b.amountCents)}`, detalles: { fechaOk: dateOk, montoOk: amtOk, deltaCents: a.amountCents - b.amountCents } });
    }
  }
  return diffs;
}

function diffByMultiset(aList, bList) {
  const mapA = new Map();
  const mapB = new Map();
  for (const p of aList) {
    const k = multisetKey(p);
    mapA.set(k, (mapA.get(k) || 0) + 1);
  }
  for (const p of bList) {
    const k = multisetKey(p);
    mapB.set(k, (mapB.get(k) || 0) + 1);
  }
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const missing = [];
  const extra = [];
  for (const k of allKeys) {
    const cA = mapA.get(k) || 0;
    const cB = mapB.get(k) || 0;
    if (cA !== cB) {
      const [dateISO, centsStr] = k.split('|');
      const cents = Number(centsStr);
      if (cA > cB) {
        missing.push({ dateISO, amountCents: cents, veces: cA - cB });
      } else {
        extra.push({ dateISO, amountCents: cents, veces: cB - cA });
      }
    }
  }
  return { missing, extra };
}

(async function main() {
  try {
    console.log('Leyendo lote:', lotePath);
    const lotePairs = await parsePdfPairs(lotePath);
    console.log('Leyendo anexo:', anexoPath);
    const anexoPairs = await parsePdfPairs(anexoPath);

    if (anexoPairs.length > maxFilasAnexo) {
      console.warn(`⚠ El anexo tiene ${anexoPairs.length} filas, supera el máximo de ${maxFilasAnexo}.`);
    }

    console.log('\nResumen:');
    console.log(`  Pagarés detectados en lote : ${lotePairs.length}`);
    console.log(`  Pagarés detectados en anexo: ${anexoPairs.length}`);

    const orderDiffs = diffByOrder(lotePairs, anexoPairs);
    const bagDiffs = diffByMultiset(lotePairs, anexoPairs);

    console.log('\n✔ Verificación por multiconjunto (fecha,monto en cantidad)');
    if (bagDiffs.missing.length === 0 && bagDiffs.extra.length === 0) {
      console.log('  ✅ Coinciden todos los pares (fecha, monto).');
    } else {
      if (bagDiffs.missing.length) {
        console.log('  ❌ Faltantes en anexo (presentes en lote):');
        bagDiffs.missing.forEach(x => console.log(`    - ${x.dateISO}  ${fmtAmountCents(x.amountCents)}  (faltan ${x.veces} veces)`));
      }
      if (bagDiffs.extra.length) {
        console.log('  ❌ Sobrantes en anexo (no vistos en lote):');
        bagDiffs.extra.forEach(x => console.log(`    - ${x.dateISO}  ${fmtAmountCents(x.amountCents)}  (sobran ${x.veces} veces)`));
      }
    }

    console.log('\n✔ Verificación por orden (folio a folio):');
    if (orderDiffs.length === 0) {
      console.log('  ✅ Todas las filas coinciden por orden.');
    } else {
      console.log('  ❌ Diferencias por orden:');
      orderDiffs.forEach(d => {
        console.log(`    [#${d.index}] ${d.tipo}`);
        console.log(`       Lote : ${d.lote}`);
        console.log(`       Anexo: ${d.anexo}`);
        if (d.detalles) {
          console.log(`       Detalles: fechaOk=${d.detalles.fechaOk}, montoOk=${d.detalles.montoOk}, deltaCentavos=${d.detalles.deltaCents}`);
        }
      });
    }

    if (orderDiffs.length > 0 && bagDiffs.missing.length === 0 && bagDiffs.extra.length === 0) {
      console.log('\nℹ️ Nota: Los conjuntos coinciden pero el orden difiere. Ordena el anexo por fecha ascendente para que coincida con los folios.');
    }

    console.log('\nFin de la comparación.');
  } catch (err) {
    console.error('Fallo en la comparación:', err);
    process.exit(1);
  }
})();