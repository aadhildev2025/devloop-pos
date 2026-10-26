const bwipjs = require('bwip-js');
const db = require('../config/db');

// Generate unique 12-digit barcode with checksum (EAN-13 style or Code128)
function generateUniqueBarcode() {
  const products = db.find('products');
  const existingBarcodes = new Set(products.map(p => String(p.barcode).trim()));

  let attempts = 0;
  while (attempts < 1000) {
    // Generate 12 random digits starting with retail prefix '890' or '200'
    const randomPart = Math.floor(100000000 + Math.random() * 900000000);
    const base12 = `890${randomPart}`;

    // Calculate EAN-13 checksum digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(base12[i], 10);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const candidate = `${base12}${checkDigit}`;

    if (!existingBarcodes.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  // Fallback to timestamp-based unique code
  return `890${Date.now().toString().slice(-9)}`;
}

// Generate barcode image (PNG Buffer / Data URL)
async function renderBarcodeImage(barcodeText, format = 'code128') {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: format.toLowerCase() === 'ean13' ? 'ean13' : 'code128',
        text: barcodeText,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
        backgroundcolor: 'ffffff'
      },
      (err, png) => {
        if (err) {
          // Fallback to code128 if ean13 fails
          if (format.toLowerCase() === 'ean13') {
            return bwipjs.toBuffer(
              {
                bcid: 'code128',
                text: barcodeText,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center'
              },
              (err2, png2) => {
                if (err2) reject(err2);
                else resolve(`data:image/png;base64,${png2.toString('base64')}`);
              }
            );
          }
          return reject(err);
        }
        resolve(`data:image/png;base64,${png.toString('base64')}`);
      }
    );
  });
}

module.exports = {
  generateUniqueBarcode,
  renderBarcodeImage
};
