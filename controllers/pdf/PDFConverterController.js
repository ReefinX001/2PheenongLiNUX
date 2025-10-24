/**
 * PDF Converter Controller
 * แปลงภาพจาก PDFoooRasterController เป็นไฟล์ PDF
 */

const PDFDocument = require('pdfkit');
const { createCanvas, loadImage } = require('canvas');
const PDFoooRasterController = require('./PDFoooRasterController');

class PDFConverterController {
  /**
   * สร้าง PDF จากใบเสร็จ/ใบกำกับภาษี โดยใช้ _id
   * @param {string} documentId - MongoDB _id ของเอกสาร
   * @param {string} documentType - ประเภทเอกสาร ('RECEIPT' หรือ 'TAX_INVOICE')
   * @returns {Promise<{pdfBuffer: Buffer, fileName: string}>}
   */
  static async generatePDFFromDocument(documentId, documentType = 'RECEIPT') {
    try {
      console.log(`📄 Generating PDF for ${documentType} ID: ${documentId}`);

      // สร้างภาพผ่าน PDFoooRasterController
      const imageResult = await PDFoooRasterController.printFromDbById(documentId, documentType);

      if (!imageResult || !imageResult.base64) {
        throw new Error('Failed to generate receipt image');
      }

      // แปลง base64 เป็น buffer
      const imageBuffer = Buffer.from(imageResult.base64, 'base64');

      // โหลดภาพด้วย canvas
      const image = await loadImage(imageBuffer);

      // สร้าง PDF ด้วย PDFKit
      const doc = new PDFDocument({
        size: [image.width, image.height], // ใช้ขนาดของภาพ
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      // สร้าง array สำหรับเก็บ PDF buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      // สร้าง Promise สำหรับรอให้ PDF เสร็จสิ้น
      const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

      // เพิ่มภาพลงใน PDF
      doc.image(imageBuffer, 0, 0, {
        width: image.width,
        height: image.height
      });

      // จบการสร้าง PDF
      doc.end();

      // รอให้ PDF เสร็จสิ้น
      const pdfBuffer = await pdfPromise;

      // สร้างชื่อไฟล์ PDF
      const fileName = imageResult.fileName.replace('.png', '.pdf');

      console.log(`✅ PDF generated successfully: ${fileName} (${pdfBuffer.length} bytes)`);

      return {
        pdfBuffer,
        fileName,
        originalImageBase64: imageResult.base64
      };

    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * สร้าง PDF จากข้อมูลที่ normalize แล้ว
   * @param {Object} normalizedData - ข้อมูลที่ผ่าน normalize แล้ว
   * @returns {Promise<{pdfBuffer: Buffer, fileName: string}>}
   */
  static async generatePDFFromNormalizedData(normalizedData) {
    try {
      console.log(`📄 Generating PDF from normalized data:`, {
        documentType: normalizedData.documentType,
        receiptNumber: normalizedData.receiptNumber,
        taxInvoiceNumber: normalizedData.taxInvoiceNumber
      });

      // สร้างภาพผ่าน PDFoooRasterController
      const imageResult = await PDFoooRasterController.printReceipt(normalizedData);

      if (!imageResult || !imageResult.base64) {
        throw new Error('Failed to generate receipt image from normalized data');
      }

      // แปลง base64 เป็น buffer
      const imageBuffer = Buffer.from(imageResult.base64, 'base64');

      // โหลดภาพด้วย canvas
      const image = await loadImage(imageBuffer);

      // สร้าง PDF ด้วย PDFKit
      const doc = new PDFDocument({
        size: [image.width, image.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      // สร้าง array สำหรับเก็บ PDF buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      // สร้าง Promise สำหรับรอให้ PDF เสร็จสิ้น
      const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

      // เพิ่มภาพลงใน PDF
      doc.image(imageBuffer, 0, 0, {
        width: image.width,
        height: image.height
      });

      // จบการสร้าง PDF
      doc.end();

      // รอให้ PDF เสร็จสิ้น
      const pdfBuffer = await pdfPromise;

      // สร้างชื่อไฟล์ PDF
      const fileName = imageResult.fileName.replace('.png', '.pdf');

      console.log(`✅ PDF from normalized data generated successfully: ${fileName} (${pdfBuffer.length} bytes)`);

      return {
        pdfBuffer,
        fileName,
        originalImageBase64: imageResult.base64
      };

    } catch (error) {
      console.error('❌ Error generating PDF from normalized data:', error);
      throw error;
    }
  }

  /**
   * สร้าง PDF จากเลขเอกสาร
   * @param {string} documentNumber - เลขเอกสาร เช่น RE-680817-006, TX-680817-006
   * @returns {Promise<{pdfBuffer: Buffer, fileName: string}>}
   */
  static async generatePDFFromDocumentNumber(documentNumber) {
    try {
      console.log(`📄 Generating PDF for document number: ${documentNumber}`);

      // สร้างภาพผ่าน PDFoooRasterController
      const imageResult = await PDFoooRasterController.printFromDbByNumber(documentNumber);

      if (!imageResult || !imageResult.base64) {
        throw new Error(`Failed to generate image for document: ${documentNumber}`);
      }

      // แปลง base64 เป็น buffer
      const imageBuffer = Buffer.from(imageResult.base64, 'base64');

      // โหลดภาพด้วย canvas
      const image = await loadImage(imageBuffer);

      // สร้าง PDF ด้วย PDFKit
      const doc = new PDFDocument({
        size: [image.width, image.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      });

      // สร้าง array สำหรับเก็บ PDF buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      // สร้าง Promise สำหรับรอให้ PDF เสร็จสิ้น
      const pdfPromise = new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
      });

      // เพิ่มภาพลงใน PDF
      doc.image(imageBuffer, 0, 0, {
        width: image.width,
        height: image.height
      });

      // จบการสร้าง PDF
      doc.end();

      // รอให้ PDF เสร็จสิ้น
      const pdfBuffer = await pdfPromise;

      // สร้างชื่อไฟล์ PDF
      const fileName = imageResult.fileName.replace('.png', '.pdf');

      console.log(`✅ PDF from document number generated successfully: ${fileName} (${pdfBuffer.length} bytes)`);

      return {
        pdfBuffer,
        fileName,
        originalImageBase64: imageResult.base64
      };

    } catch (error) {
      console.error('❌ Error generating PDF from document number:', error);
      throw error;
    }
  }
}

module.exports = PDFConverterController;
