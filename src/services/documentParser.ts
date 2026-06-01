import fs from 'fs';
import path from 'path';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export async function parseDocumentBuffer(buffer: Buffer, originalName: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } 
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_csv(sheet) + '\n';
      }
      return text;
    }
    
    if (ext === '.txt' || ext === '.md' || ext === '.json') {
      return buffer.toString('utf-8');
    }

    return `[System] Unsupported text extraction for file type: ${ext}`;
  } catch (error: any) {
    console.error(`Error parsing ${originalName}:`, error);
    return `[System] Extraction failed for ${originalName}: ${error.message}`;
  }
}

export async function parseDocumentFromUrl(blobUrl: string, originalName: string): Promise<string> {
  try {
    const res = await fetch(blobUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch blob: ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return await parseDocumentBuffer(buffer, originalName);
  } catch (error: any) {
    console.error(`Error fetching/parsing ${originalName} from url:`, error);
    return `[System] Extraction failed for ${originalName}: ${error.message}`;
  }
}

export async function parseDocument(filePath: string, originalName: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    return `[System] File not found: ${originalName}`;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    return await parseDocumentBuffer(buffer, originalName);
  } catch (error: any) {
    console.error(`Error reading ${originalName} from file:`, error);
    return `[System] Extraction failed for ${originalName}: ${error.message}`;
  }
}
