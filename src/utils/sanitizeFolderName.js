/**
 * Utilidad centralizada para sanitizar nombres de carpetas de clientes.
 * Asegura consistencia entre la creación de carpetas y la generación de paths.
 * 
 * Reglas de sanitización:
 * - Convierte a minúsculas
 * - Elimina acentos (normalización NFD)
 * - Reemplaza espacios por guiones
 * - Solo permite caracteres alfanuméricos y guiones
 * - Colapsa múltiples guiones en uno solo
 * - Elimina guiones al inicio y final
 * 
 * @param {string} name - Nombre del cliente a sanitizar
 * @returns {string} - Nombre sanitizado seguro para usar como nombre de carpeta
 * 
 * @example
 * sanitizeFolderName("Juan Pérez García") // "juan-perez-garcia"
 * sanitizeFolderName("Ana María") // "ana-maria"
 * sanitizeFolderName("Bob Esponja") // "bob-esponja"
 */
function sanitizeFolderName(name) {
  if (!name || typeof name !== 'string') {
    return 'cliente-sin-nombre';
  }
  
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')             // Espacios → guiones
    .replace(/[^a-z0-9\-]/g, '')      // Solo alfanuméricos y guiones
    .replace(/-+/g, '-')              // Múltiples guiones → uno solo
    .replace(/^-+|-+$/g, '');         // Eliminar guiones al inicio/final
}

module.exports = { sanitizeFolderName };
