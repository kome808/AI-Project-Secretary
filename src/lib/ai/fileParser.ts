/**
 * 多格式文件解析器
 * 支援：圖片 (WBS)、Excel、Word、PDF
 */

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// 設定 PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export interface ParsedFileContent {
  type: 'image' | 'excel' | 'word' | 'pdf';
  content: string;
  rawData?: any;
}

/**
 * 將檔案轉換為 Base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // 移除 data URL 前綴 (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 解析圖片檔案（WBS 圖檔）
 */
export async function parseImageFile(file: File): Promise<ParsedFileContent> {
  const base64 = await fileToBase64(file);
  return {
    type: 'image',
    content: base64,
    rawData: { base64 }
  };
}

/**
 * 解析 Excel 檔案
 */
export async function parseExcelFile(file: File): Promise<ParsedFileContent> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 提取所有工作表的內容
        const sheets: any[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          sheets.push({
            name: sheetName,
            data: jsonData
          });
        });

        // 將內容格式化為文字描述
        let textContent = '';
        sheets.forEach((sheet) => {
          textContent += `\n=== 工作表: ${sheet.name} ===\n`;
          sheet.data.forEach((row: any[], rowIndex: number) => {
            textContent += `第 ${rowIndex + 1} 列: ${row.join(' | ')}\n`;
          });
        });

        resolve({
          type: 'excel',
          content: textContent,
          rawData: sheets
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析 Word 檔案
 */
export async function parseWordFile(file: File): Promise<ParsedFileContent> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        resolve({
          type: 'word',
          content: result.value,
          rawData: { messages: result.messages }
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析 PDF 檔案
 */
export async function parsePDFFile(file: File): Promise<ParsedFileContent> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // 載入 PDF 文檔
        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        
        // 提取所有頁面的文字
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += `\n=== 第 ${i} 頁 ===\n${pageText}\n`;
        }

        // 如果文字內容為空或太少，可能是掃描檔，需要轉為圖片處理
        if (fullText.trim().length < 50) {
          // 將第一頁轉為圖片
          const base64 = await fileToBase64(file);
          resolve({
            type: 'image',
            content: base64,
            rawData: { isPDFScan: true, numPages: pdf.numPages }
          });
        } else {
          resolve({
            type: 'pdf',
            content: fullText,
            rawData: { numPages: pdf.numPages }
          });
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 自動偵測並解析檔案
 */
export async function parseFile(file: File): Promise<ParsedFileContent> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 圖片檔案
  if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/.test(fileName)) {
    return parseImageFile(file);
  }

  // Excel 檔案
  if (
    fileType.includes('spreadsheet') ||
    /\.(xlsx|xls|csv)$/.test(fileName)
  ) {
    return parseExcelFile(file);
  }

  // Word 檔案
  if (
    fileType.includes('word') ||
    fileType.includes('document') ||
    /\.(docx|doc)$/.test(fileName)
  ) {
    return parseWordFile(file);
  }

  // PDF 檔案
  if (fileType === 'application/pdf' || /\.pdf$/.test(fileName)) {
    return parsePDFFile(file);
  }

  throw new Error(`不支援的檔案格式: ${fileName}`);
}

/**
 * 取得檔案的描述性進度訊息
 */
export function getParsingProgressMessage(fileType: string): string[] {
  switch (fileType) {
    case 'image':
      return [
        '📷 正在掃描圖片文字與方框...',
        '🌳 正在構建任務樹狀結構...',
        '📬 正在將清單存入您的收件匣...'
      ];
    case 'excel':
      return [
        '📊 正在解析 Excel 欄位與時程邏輯...',
        '🌳 正在將功能需求與 WBS 進行階層對應...',
        '📅 資深 PM 正在計算預估工期...'
      ];
    case 'word':
      return [
        '📄 正在提取 Word 文件內容...',
        '🌳 正在識別標題與任務階層...',
        '📬 正在整理為任務清單草稿...'
      ];
    case 'pdf':
      return [
        '📑 正在讀取 PDF 文件...',
        '🌳 正在分析文件結構...',
        '📬 正在生成任務清單...'
      ];
    default:
      return [
        '📂 正在處理文件...',
        '🌳 正在分析內容...',
        '📬 正在生成任務清單...'
      ];
  }
}
