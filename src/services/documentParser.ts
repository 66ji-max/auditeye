import fs from 'fs';
import path from 'path';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;

import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export async function parseDocument(filePath: string, originalName: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    return `[System] File not found: ${originalName}`;
  }

  const ext = path.extname(originalName).toLowerCase();
  
  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } 
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const workbook = xlsx.readFile(filePath);
      let text = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        text += xlsx.utils.sheet_to_csv(sheet) + '\n';
      }
      return text;
    }
    
    if (ext === '.txt' || ext === '.md' || ext === '.json') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    return `[System] Unsupported text extraction for file type: ${ext}`;
  } catch (error: any) {
    console.error(`Error parsing ${originalName}:`, error);
    return `[System] Extraction failed for ${originalName}: ${error.message}`;
  }
}
