// test.js (VERSIÓN FINAL CORREGIDA) – prueba end-to-end con datos inventados
// - Corrige todas las respuestas según lo que el bot espera exactamente
// - Datos completamente nuevos para validar robustez del sistema
// - Flujo completo hasta "Aprobar y generar documentos"

const { handleMessage } = require('./src/core/index');

const mockClient = {
  sendMessage: () => Promise.resolve()
};

// Respuestas corregidas según las validaciones del bot
const msgs = [
  // Arranque del sistema
  { from: 'test', body: 'Menu' },
  
  // Menú documentos
  { from: 'test', body: '3' }, // Ambos documentos
  
  // Fecha de emisión
  { from: 'test', body: 'hoy' },
  
  // Bloque: Venta y pagos
  { from: 'test', body: '485000' },        // precio venta
  { from: 'test', body: '75000' },         // enganche
  { from: 'test', body: '22500' },         // pago mensual
  { from: 'test', body: 'si' },            // ¿hay anualidades?
  { from: 'test', body: '15000' },         // monto anualidad
  { from: 'test', body: '3' },             // CUÁNTAS anualidades (número, no texto)
  { from: 'test', body: 'febrero' },       // mes de vencimiento (o "2")
  { from: 'test', body: 'siguiente mes' }, // regla 15/30
  { from: 'test', body: '2' },             // moratorios (2%)
  { from: 'test', body: '1.5' },           // interés anual (1.5%)
  
  // Confirmación bloque venta
  { from: 'test', body: '1' }, // Continuar
  
  // Bloque: Cliente/deudor + vendedor
  { from: 'test', body: 'Marina Hernández Olvera' },           // beneficiario
  { from: 'test', body: 'Roberto Carlos Méndez Soto' },        // vendedor nombre
  { from: 'test', body: 'Calle Primavera 128, Col. Jardines del Sol' }, // vendedor domicilio
  { from: 'test', body: 'Ana Sofía Ramírez Castro' },          // deudor
  { from: 'test', body: '2' },                                 // género (2 = mujer)
  { from: 'test', body: 'Av. Insurgentes Sur 3847 Depto 402, Col. Tlalpan Centro' }, // dirección deudor
  { from: 'test', body: 'Tlalpan, CDMX, C.P. 14000' },         // población
  { from: 'test', body: 'Chalco, Estado de México' },          // expedición
  { from: 'test', body: 'No' },                                // lugar pago diferente
  { from: 'test', body: 'Texcoco, Edo. Méx.' },                // lugar pago específico
  { from: 'test', body: '5587654321' },                        // teléfono
  
  // Confirmación bloque cliente/deudor
  { from: 'test', body: '1' }, // Continuar
  
  // Bloque: Predio y testigos
  { from: 'test', body: 'Terreno Las Flores' },                              // nombre predio
  { from: 'test', body: 'Camino Real a San Miguel km 2.5, Paraje El Cerrito' }, // ubicación
  { from: 'test', body: 'Chalco' },                                          // municipio
  { from: 'test', body: 'Manzana 14 Lote 22' },                              // manzana y lote
  { from: 'test', body: '320' },                                             // superficie m2
  { from: 'test', body: '10 | con camino vecinal' },                         // norte
  { from: 'test', body: '10 | con lote 23' },                                // sur
  { from: 'test', body: '32 | con terreno ejidal' },                         // oriente
  { from: 'test', body: '32 | con barranca' },                               // poniente
  { from: 'test', body: 'María González Pérez | Carlos Alberto Ruiz Montes' }, // testigos
  
  // Confirmación predio/testigos
  { from: 'test', body: '1' }, // Continuar
  
  // Menú final: aprobar y generar
  { from: 'test', body: '1' }  // Aprobar y generar documentos
];

let idx = 0;

function next() {
  if (idx >= msgs.length) {
    console.log('\n✅ Flujo de prueba completado exitosamente.\n');
    console.log('📊 Total de mensajes procesados:', msgs.length);
    return;
  }
  
  const m = msgs[idx++];
  console.log(`\n[${idx}/${msgs.length}] Enviando: "${m.body}"`);
  
  Promise.resolve(handleMessage(mockClient, m))
    .then(() => setTimeout(next, 200))
    .catch(err => {
      console.error(`\n❌ Error en mensaje #${idx}:`, err.message);
      console.error('Contexto:', m);
      process.exit(1);
    });
}

console.log('🚀 Iniciando prueba con datos renovados...\n');
next();