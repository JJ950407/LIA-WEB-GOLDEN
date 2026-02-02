const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = process.argv[2] || 'templates/base.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('No existe el PDF en', pdfPath);
    process.exit(1);
  }
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  if (!fields.length) {
    console.log('Tu PDF no parece tener campos de formulario (AcroForm).');
    return;
  }
  fields.forEach(f => console.log(`${f.constructor.name} -> ${f.getName()}`));
})();
