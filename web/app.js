/**
 * LIA Pagaré Web - Aplicación Principal
 * Verificación de autenticación al inicio
 */

const steps = {
  docs: document.getElementById('step-docs'),
  venta: document.getElementById('step-venta'),
  cliente: document.getElementById('step-cliente'),
  predio: document.getElementById('step-predio'),
  resumen: document.getElementById('step-resumen')
};

const progressLabel = document.getElementById('progress-label');
const progressBar = document.getElementById('progress-bar');
const nextButton = document.getElementById('next');
const prevButton = document.getElementById('prev');
const submitButton = document.getElementById('submit');
const statusText = document.getElementById('status');
const resultsSection = document.getElementById('results');
const downloadContrato = document.getElementById('download-contrato');
const downloadPagares = document.getElementById('download-pagares');
const printPagares = document.getElementById('print-pagares');

const anualidadesFields = document.getElementById('anualidades-fields');
const lugarPagoToggle = document.getElementById('lugarPagoIgual');
const lugarPagoContainer = document.getElementById('lugarPagoContainer');

const summaryVenta = document.getElementById('summary-venta');
const summaryCliente = document.getElementById('summary-cliente');
const summaryPredio = document.getElementById('summary-predio');
const editPredioButton = document.querySelector('[data-edit="predio"]');

let stepOrder = ['docs', 'venta', 'cliente', 'predio', 'resumen'];
let currentIndex = 0;

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoney(raw) {
  const cleaned = String(raw || '')
    .replace(/[^0-9.,-]/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(',', '.');
  const number = Number(cleaned || 0);
  return Number.isFinite(number) ? number : 0;
}

function getCheckedValue(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : '';
}

function getFieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : '';
}

function updateStepOrder() {
  const tipo = getCheckedValue('tipoDocumento');
  const oldStepOrder = [...stepOrder];
  if (tipo === 'pagares') {
    stepOrder = ['docs', 'venta', 'cliente', 'resumen'];
  } else {
    stepOrder = ['docs', 'venta', 'cliente', 'predio', 'resumen'];
  }
  // Log de debug eliminado para producción
}

function showStep(index) {
  updateStepOrder();
  currentIndex = Math.min(Math.max(index, 0), stepOrder.length - 1);

  Object.values(steps).forEach((step) => step.classList.add('hidden'));
  steps[stepOrder[currentIndex]].classList.remove('hidden');

  prevButton.classList.toggle('hidden', currentIndex === 0);
  nextButton.classList.toggle('hidden', currentIndex === stepOrder.length - 1);

  const stepNumber = currentIndex + 1;
  if (progressLabel) {
    progressLabel.textContent = `Paso ${stepNumber} de ${stepOrder.length}`;
  }
  if (progressBar) {
    progressBar.style.width = `${(stepNumber / stepOrder.length) * 100}%`;
  }
  
  // Actualizar sidebar visual
  updateSidebar();
}

function setError(input, message) {
  const errorEl = input.closest('.field, .options')?.querySelector('.error');
  if (errorEl) {
    errorEl.textContent = message || '';
  }
}

function validateStep(stepKey) {
  const container = steps[stepKey];
  if (!container) return true;
  let valid = true;
  const requiredFields = container.querySelectorAll('[data-required="true"]');
  const radioGroupsChecked = new Set();

  requiredFields.forEach((field) => {
    if (field.closest('.hidden')) return;
    if (field.disabled) return;

    if (field.type === 'radio') {
      if (radioGroupsChecked.has(field.name)) return;
      radioGroupsChecked.add(field.name);
      const selected = container.querySelector(`input[name="${field.name}"]:checked`);
      const message = selected ? '' : 'Selecciona una opción.';
      if (message) valid = false;
      setError(field, message);
      return;
    }

    const value = field.value?.trim ? field.value.trim() : '';
    const type = field.dataset.type;
    let message = '';

    if (!value && field.id !== 'enganche') {
      message = 'Este campo es obligatorio.';
    } else if (type === 'date') {
      if (!/^(hoy|\d{1,2}\/\d{1,2}\/\d{4})$/i.test(value)) {
        message = 'Usa "hoy" o dd/mm/aaaa.';
      }
    } else if (type === 'money') {
      if (field.id === 'enganche') {
        if (value && parseMoney(value) < 0) {
          message = 'Ingresa un monto válido.';
        }
      } else if (parseMoney(value) <= 0) {
        message = 'Ingresa un monto válido.';
      }
    } else if (type === 'percent') {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        message = 'Porcentaje inválido.';
      }
    } else if (type === 'phone') {
      const digits = value.replace(/\D+/g, '');
      if (digits.length < 10 || digits.length > 13) {
        message = 'Teléfono inválido.';
      }
    }

    if (message) {
      valid = false;
    }
    setError(field, message);
  });

  return valid;
}

function updateAnualidadesVisibility() {
  const anualidades = getCheckedValue('anualidades');
  const isVisible = anualidades === 'si';
  anualidadesFields.classList.toggle('hidden', !isVisible);
  anualidadesFields.querySelectorAll('input').forEach((input) => {
    input.disabled = !isVisible;
  });
}

function updateLugarPagoVisibility() {
  lugarPagoContainer.classList.toggle('hidden', lugarPagoToggle.checked);
  lugarPagoContainer.querySelectorAll('input').forEach((input) => {
    input.disabled = lugarPagoToggle.checked;
  });
}

function buildPayload() {
  
  const anualidades = getCheckedValue('anualidades');
  const regla = getCheckedValue('regla1530');
  const tipoDocumento = getCheckedValue('tipoDocumento');
  const lugarPagoIgual = lugarPagoToggle.checked;
  const lugarExpedicion = getFieldValue('lugarExpedicion');
  const engancheRaw = getFieldValue('enganche');

  const payload = {
    tipoDocumento,
    fechaEmision: getFieldValue('fechaEmision'),
    total: parseMoney(getFieldValue('total')),
    enganche: parseMoney(engancheRaw),
    mensual: parseMoney(getFieldValue('mensual')),
    _tieneAnualidades: anualidades === 'si',
    anualidadMonto: anualidades === 'si' ? parseMoney(getFieldValue('anualidadMonto')) : 0,
    numeroAnualidades: anualidades === 'si' ? Number(getFieldValue('numeroAnualidades') || 0) : 0,
    anualidadMes: anualidades === 'si' ? getFieldValue('anualidadMes') : 12,
    reglaPref: regla === 'siguiente' ? 'siguiente' : 'mismo',
    moratorios: Number(getFieldValue('moratorios') || 0),
    interes: Number(getFieldValue('interes') || 0),
    beneficiario: getFieldValue('beneficiario'),
    vendedorNombre: getFieldValue('vendedorNombre'),
    vendedorDomicilio: getFieldValue('vendedorDomicilio'),
    deudor: getFieldValue('deudor'),
    deudorGenero: getFieldValue('deudorGenero'),
    direccion: getFieldValue('direccion'),
    poblacion: getFieldValue('poblacion'),
    lugarExpedicion,
    lugarPagoIgualExpedicion: lugarPagoIgual,
    lugarPago: lugarPagoIgual ? lugarExpedicion : getFieldValue('lugarPago'),
    telefono: getFieldValue('telefono'),
    predioNombre: getFieldValue('predioNombre'),
    predioUbicacion: getFieldValue('predioUbicacion'),
    predioMunicipio: getFieldValue('predioMunicipio'),
    predioManzanaLote: getFieldValue('predioManzanaLote'),
    predioSuperficie: getFieldValue('predioSuperficie'),
    linderoNorte: getFieldValue('linderoNorte'),
    linderoSur: getFieldValue('linderoSur'),
    linderoOriente: getFieldValue('linderoOriente'),
    linderoPoniente: getFieldValue('linderoPoniente'),
    testigos: getFieldValue('testigos')
  };
  
  return payload;
}

function renderSummary(payload) {
  const engancheValue = parseMoney(payload.enganche);
  const saldo = Number(payload.total) - engancheValue;
  const anualTotal = Number(payload.anualidadMonto) * Number(payload.numeroAnualidades || 0);
  const mensualNum = Number(payload.mensual) || 0;
  const numeroPagares = mensualNum > 0 ? Math.ceil((saldo - anualTotal) / mensualNum) : 0;

  // Mapeo de emojis por tipo de campo
  const getEmoji = (text) => {
    const lower = String(text).toLowerCase();
    if (lower.includes('total') || lower.includes('enganche') || lower.includes('mensualidad') || lower.includes('saldo') || lower.includes('monto')) return '💰';
    if (lower.includes('fecha') || lower.includes('número de pagarés') || lower.includes('numero de pagares')) return '📅';
    if (lower.includes('beneficiario') || lower.includes('vendedor') || lower.includes('deudor') || lower.includes('género') || lower.includes('genero')) return '👤';
    if (lower.includes('domicilio') || lower.includes('lugar') || lower.includes('dirección') || lower.includes('direccion') || lower.includes('población') || lower.includes('poblacion')) return '🏠';
    if (lower.includes('teléfono') || lower.includes('telefono')) return '📞';
    if (lower.includes('regla') || lower.includes('moratorios') || lower.includes('moratorio') || lower.includes('interés') || lower.includes('interes')) return '⚖️';
    if (lower.includes('documentos') || lower.includes('anualidades') || lower.includes('anualidad')) return '📋';
    return '•';
  };

  summaryVenta.textContent = [
    '📋 Venta y pagos',
    `${getEmoji('Documentos')} Documentos: ${payload.tipoDocumento}`,
    `${getEmoji('Fecha')} Fecha de emisión: ${payload.fechaEmision}`,
    `${getEmoji('Total')} Total: $${formatCurrency(payload.total)}`,
    `${getEmoji('Enganche')} Enganche: $${formatCurrency(engancheValue)}`,
    `${getEmoji('Saldo')} Saldo: $${formatCurrency(saldo)}`,
    `${getEmoji('Mensualidad')} Mensualidad: $${formatCurrency(payload.mensual)}`,
    payload._tieneAnualidades
      ? `${getEmoji('Anualidades')} Anualidades: $${formatCurrency(payload.anualidadMonto)} x ${payload.numeroAnualidades} (mes ${payload.anualidadMes})`
      : `${getEmoji('Anualidades')} Anualidades: No`,
    `${getEmoji('Número de pagarés')} Número de pagarés: ${numeroPagares}`,
    `${getEmoji('Regla')} Regla 15/30: ${payload.reglaPref === 'siguiente' ? 'siguiente mes' : 'este mes'}`,
    `${getEmoji('Moratorios')} Moratorios: ${payload.moratorios}%`,
    `${getEmoji('Interés')} Interés anual: ${payload.interes}%`
  ].join('\n');

  summaryCliente.textContent = [
    '👥 Cliente y deudor',
    `${getEmoji('Beneficiario')} Beneficiario: ${payload.beneficiario}`,
    `${getEmoji('Vendedor')} Vendedor: ${payload.vendedorNombre}`,
    `${getEmoji('Domicilio')} Domicilio vendedor: ${payload.vendedorDomicilio}`,
    `${getEmoji('Deudor')} Deudor: ${payload.deudor}`,
    `${getEmoji('Género')} Género: ${payload.deudorGenero}`,
    `${getEmoji('Dirección')} Dirección: ${payload.direccion}`,
    `${getEmoji('Población')} Población: ${payload.poblacion}`,
    `${getEmoji('Lugar')} Lugar expedición: ${payload.lugarExpedicion}`,
    `${getEmoji('Lugar')} Lugar pago: ${payload.lugarPago}`,
    `${getEmoji('Teléfono')} Teléfono: ${payload.telefono}`
  ].join('\n');

  if (stepOrder.includes('predio')) {
    summaryPredio.textContent = [
      '🏡 Predio y testigos',
      `🏡 Predio: ${payload.predioNombre}`,
      `📍 Ubicación: ${payload.predioUbicacion}`,
      `🏛️ Municipio: ${payload.predioMunicipio}`,
      `🔢 Manzana/Lote: ${payload.predioManzanaLote}`,
      `📐 Superficie: ${payload.predioSuperficie}`,
      `🧭 Norte: ${payload.linderoNorte}`,
      `🧭 Sur: ${payload.linderoSur}`,
      `🧭 Oriente: ${payload.linderoOriente}`,
      `🧭 Poniente: ${payload.linderoPoniente}`,
      `👥 Testigos: ${payload.testigos}`
    ].join('\n');
    summaryPredio.classList.remove('hidden');
    if (editPredioButton) editPredioButton.classList.remove('hidden');
  } else {
    summaryPredio.textContent = 'Se omitió la sección de predio porque solo se generarán pagarés.';
    summaryPredio.classList.remove('hidden');
    if (editPredioButton) editPredioButton.classList.add('hidden');
  }
}

function clearStatus() {
  statusText.textContent = '';
}

nextButton.addEventListener('click', () => {
  const stepKey = stepOrder[currentIndex];
  if (!validateStep(stepKey)) return;
  
  // IMPORTANTE: Leer datos ANTES de cambiar de paso, mientras todos los campos son visibles
  const payload = buildPayload();
  
  if (stepKey === 'docs') updateStepOrder();
  if (stepKey === 'venta') updateAnualidadesVisibility();
  if (stepKey === 'cliente') updateLugarPagoVisibility();
  
  showStep(currentIndex + 1);
  
  // Usar requestAnimationFrame para asegurar que el DOM esté listo para renderizar
  requestAnimationFrame(() => {
    renderSummary(payload);
  });
});

prevButton.addEventListener('click', () => {
  // Leer datos antes de cambiar de paso
  const payload = buildPayload();
  showStep(currentIndex - 1);
  requestAnimationFrame(() => {
    renderSummary(payload);
  });
});

lugarPagoToggle.addEventListener('change', updateLugarPagoVisibility);

document.querySelectorAll('input[name="anualidades"]').forEach((radio) => {
  radio.addEventListener('change', updateAnualidadesVisibility);
});

document.querySelectorAll('input[name="tipoDocumento"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    updateStepOrder();
    renderSummary(buildPayload());
  });
});

document.querySelectorAll('[data-edit]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-edit');
    const index = stepOrder.indexOf(target);
    if (index >= 0) {
      showStep(index);
    }
  });
});

// ============================================================================
// BOTÓN NUEVO CONTRATO - RESET WIZARD
// ============================================================================

const btnNewContract = document.getElementById('btn-new-contract');

function resetWizard() {
  if (!confirm('¿Iniciar nuevo contrato? Los datos actuales se perderán.')) {
    return;
  }
  
  // Limpiar todos los inputs
  document.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'radio' || el.type === 'checkbox') {
      el.checked = false;
    } else {
      el.value = '';
    }
    // Limpiar errores
    const errorEl = el.closest('.field, .options')?.querySelector('.error');
    if (errorEl) errorEl.textContent = '';
  });
  
  // Resetear paso de lugar de pago (checkbox default)
  if (lugarPagoToggle) lugarPagoToggle.checked = true;
  
  // Ocultar secciones condicionales
  if (anualidadesFields) anualidadesFields.classList.add('hidden');
  if (lugarPagoContainer) lugarPagoContainer.classList.add('hidden');
  
  // Resetear orden de pasos
  stepOrder = ['docs', 'venta', 'cliente', 'predio', 'resumen'];
  
  // Ocultar resultados
  resultsSection.classList.add('hidden');
  
  // Limpiar status
  statusText.textContent = '';
  
  // Volver al paso 1
  const payload = buildPayload();
  showStep(0);
  requestAnimationFrame(() => {
    renderSummary(payload);
  });
  
  // Scroll al inicio
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (btnNewContract) {
  btnNewContract.addEventListener('click', resetWizard);
}

// ============================================================================
// OVERLAY DE PROGRESO DE GENERACIÓN
// ============================================================================

const generationOverlay = document.getElementById('generationOverlay');
const generationProgressFill = document.getElementById('generationProgressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');

function showGenerationProgress() {
  if (generationOverlay) {
    generationOverlay.classList.add('active');
    updateGenerationProgress(0, 'Iniciando...');
  }
}

function hideGenerationProgress() {
  if (generationOverlay) {
    generationOverlay.classList.remove('active');
  }
}

function updateGenerationProgress(percent, text) {
  if (generationProgressFill) {
    generationProgressFill.style.width = `${percent}%`;
  }
  if (progressText) {
    progressText.textContent = text;
  }
  if (progressPercent) {
    progressPercent.textContent = `${Math.round(percent)}%`;
  }
}

async function generateDocumentsWithProgress() {
  clearStatus();
  const payload = buildPayload();
  const allValid = stepOrder.every((stepKey) => validateStep(stepKey));
  if (!allValid) return;

  submitButton.disabled = true;
  showGenerationProgress();
  
  try {
    // Paso 1: Enviando datos (0-20%)
    updateGenerationProgress(10, 'Enviando datos...');
    await new Promise(r => setTimeout(r, 400));
    
    updateGenerationProgress(20, 'Validando información...');
    
    const captureRes = await fetch('/api/capturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });

    const captureData = await captureRes.json();
    if (!captureData.ok) {
      throw new Error(captureData.error || 'Error al guardar la captura');
    }

    // Paso 2: Generando documentos (20-80%)
    const docsType = payload.tipoDocumento;
    let progressStart = 30;
    
    if (docsType === 'contrato' || docsType === 'ambos') {
      updateGenerationProgress(progressStart, 'Generando contrato...');
      await new Promise(r => setTimeout(r, 800));
      progressStart += 25;
    }
    
    if (docsType === 'pagares' || docsType === 'ambos') {
      updateGenerationProgress(progressStart, 'Generando pagarés...');
      await new Promise(r => setTimeout(r, 800));
      progressStart += 25;
    }
    
    updateGenerationProgress(Math.min(progressStart, 70), 'Procesando documentos...');
    
    const generateRes = await fetch('/api/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ basePath: captureData.basePath, docs: docsType })
    });

    const generateData = await generateRes.json();
    if (!generateData.ok) {
      throw new Error(generateData.error || 'Error al generar documentos');
    }

    // Paso 3: Finalizando (80-100%)
    updateGenerationProgress(85, 'Finalizando...');
    await new Promise(r => setTimeout(r, 400));
    
    updateGenerationProgress(100, '¡Documentos listos!');
    await new Promise(r => setTimeout(r, 600));

    // Mostrar resultados
    const { contratoPdfUrl, pagaresPdfUrl } = generateData.outputs || {};

    downloadContrato.classList.toggle('hidden', !contratoPdfUrl);
    downloadPagares.classList.toggle('hidden', !pagaresPdfUrl);
    printPagares.classList.toggle('hidden', !pagaresPdfUrl);

    if (contratoPdfUrl) downloadContrato.href = contratoPdfUrl;
    if (pagaresPdfUrl) downloadPagares.href = pagaresPdfUrl;

    resultsSection.classList.remove('hidden');
    statusText.textContent = 'Documentos listos para descarga.';
    
    hideGenerationProgress();

  } catch (error) {
    hideGenerationProgress();
    statusText.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

submitButton.addEventListener('click', generateDocumentsWithProgress);

printPagares.addEventListener('click', () => {
  if (!downloadPagares.href || downloadPagares.href === '#') return;
  const printWindow = window.open(downloadPagares.href, '_blank');
  if (!printWindow) return;
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  });
});

// ============================================================================
// SIDEBAR Y NAVEGACIÓN
// ============================================================================

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const stepItems = document.querySelectorAll('.step-item');
const currentStepNum = document.getElementById('current-step-num');
const totalStepsEl = document.getElementById('total-steps');
const stepProgressFill = document.getElementById('step-progress-fill');

// Toggle sidebar en mobile
function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

if (menuToggle) {
  menuToggle.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Función para actualizar indicador de pasos visuales
function updateStepIndicator(currentStep) {
  stepItems.forEach((item, index) => {
    item.classList.remove('active', 'completed');
    if (index + 1 === currentStep) {
      item.classList.add('active');
    } else if (index + 1 < currentStep) {
      item.classList.add('completed');
    }
  });
}

// Actualizar sidebar según el paso actual
function updateSidebar() {
  const currentStepKey = stepOrder[currentIndex];
  const currentStepNumber = currentIndex + 1;
  
  // Actualizar números en el header
  if (currentStepNum) currentStepNum.textContent = currentStepNumber;
  if (totalStepsEl) totalStepsEl.textContent = stepOrder.length;
  if (stepProgressFill) {
    stepProgressFill.style.width = `${(currentStepNumber / stepOrder.length) * 100}%`;
  }
  
  // Actualizar indicadores visuales
  updateStepIndicator(currentStepNumber);
  
  // Ocultar predio si no aplica
  stepItems.forEach(item => {
    const stepId = item.dataset.stepId;
    if (stepId === 'predio' && !stepOrder.includes('predio')) {
      item.style.display = 'none';
    } else {
      item.style.display = '';
    }
  });
}

// Click en items del sidebar
stepItems.forEach(item => {
  item.addEventListener('click', () => {
    const stepId = item.dataset.stepId;
    const targetIndex = stepOrder.indexOf(stepId);
    
    if (targetIndex !== -1) {
      // Validar pasos anteriores si avanzamos
      if (targetIndex > currentIndex) {
        for (let i = currentIndex; i < targetIndex; i++) {
          if (!validateStep(stepOrder[i])) return;
        }
      }
      
      // Leer datos antes de cambiar de paso
      const payload = buildPayload();
      showStep(targetIndex);
      requestAnimationFrame(() => {
        renderSummary(payload);
      });
      closeSidebar();
    }
  });
});

// Sidebar ya se actualiza en showStep()

/**
 * Inicializa la aplicación después de verificar autenticación
 */
(async function initApp() {
  // Verificar autenticación antes de cargar la aplicación
  if (!window.LIA_AUTH) {
    console.error('Sistema de autenticación no disponible');
    window.location.replace('/login.html');
    return;
  }

  const isAuthenticated = await window.LIA_AUTH.requireAuth();
  if (!isAuthenticated) {
    // La función requireAuth ya redirige a login si no está autenticado
    return;
  }

  // Configurar botón de logout
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      window.LIA_AUTH.logout();
    });
  }

  // Inicializar wizard solo después de autenticación exitosa
  updateAnualidadesVisibility();
  updateLugarPagoVisibility();
  showStep(0);
  renderSummary(buildPayload());
})();

(function () {
  const overlay = document.getElementById("liaLoaderOverlay");
  const titleEl = document.getElementById("liaLoaderTitle");
  const stepEl  = document.getElementById("liaLoaderStep");
  const pctEl   = document.getElementById("liaLoaderPct");
  const barEl   = document.getElementById("liaProgressBar");

  function setPct(p){
    const pct = Math.max(0, Math.min(100, Math.round(p)));
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;
  }
  function setStep(t){
    if (stepEl) stepEl.textContent = t || "Procesando…";
  }
  function showLoader(){
    if (!overlay) return;
    if (titleEl) titleEl.textContent = "Generando documentos…";
    setStep("Iniciando…");
    setPct(0);
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function hideLoader(){
    if (!overlay) return;
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  window.LIA_LOADER = { showLoader, hideLoader, setPct, setStep };
})();
