import fs from 'fs';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export async function extractFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text ? pdfData.text.trim() : '';
    const numPages = pdfData.numpages || 1;

    // If PDF text is extremely short, it might be scanned image PDF.
    if (text.length < 50) {
      return {
        text: text || "PDF contains minimal text or scanned pages without embedded text layers.",
        pageCount: numPages
      };
    }

    return {
      text,
      pageCount: numPages
    };
  } catch (error) {
    console.error("PDF Parsing error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

export async function extractFromImage(filePath) {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    const text = ret.data.text ? ret.data.text.trim() : '';

    return {
      text: text || "No text could be identified in the image.",
      pageCount: 1
    };
  } catch (error) {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
    console.error("OCR error:", error);
    throw new Error(`Failed to perform OCR on image: ${error.message}`);
  }
}

export async function extractText(filePath, mimeType) {
  if (mimeType === 'application/pdf') {
    return await extractFromPDF(filePath);
  } else if (
    mimeType.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp'].some(ext => filePath.toLowerCase().endsWith(ext))
  ) {
    return await extractFromImage(filePath);
  } else {
    // Plain text fallback
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { text: content.trim(), pageCount: 1 };
    } catch (err) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }
}
