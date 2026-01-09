/**
 * 文件解析工具
 * 支援 PDF、Word、Excel 文件的文字提取
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// 1. 動態取得版本 (API 版本與 Worker 版本必須一致)
const PDFJS_VERSION = pdfjsLib.version;

// 2. 使用標準的 .mjs 路徑，避開 Vite 的 ?import 插件
// 我們使用 GlobalWorkerOptions 並確保路徑是一個純字串
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * 解析 PDF 檔案並提取文字
 */
export async function parsePDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // 3. 使用 getDocument 並禁用一些可能在 iframe 中出錯的進階功能
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      // 如果 Worker 還是載入失敗，這會強制在主線程執行（雖然較慢但保證成功）
      disableWorker: false,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    // 逐頁提取文字
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `\n--- 第 ${pageNum} 頁 ---\n${pageText}\n`;
    }

    // 檢查是否成功提取到文字
    if (!fullText.trim()) {
      throw new Error('PDF 內容為空或為掃描影像，無法提取文字。建議將 PDF 轉為圖片上傳以使用 AI 視覺辨識。');
    }

    return fullText.trim();
  } catch (error) {
    console.error('PDF 解析詳細錯誤:', error);

    // 增加一個對使用者的友善提示
    if (error instanceof Error && error.message.includes('worker')) {
      throw new Error('PDF 解析器初始化失敗，請嘗試將 PDF 轉為圖片上傳。');
    }

    throw error;
  }
}

/**
 * 解析 Word 檔案並提取文字
 */
export async function parseWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.messages.length > 0) {
      console.warn('Word 解析警告:', result.messages);
    }

    return result.value.trim();
  } catch (error) {
    console.error('Word 解析失敗:', error);
    throw new Error('Word 解析失敗');
  }
}

/**
 * 解析 Excel 檔案並提取文字
 */
export async function parseExcel(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let fullText = '';

    // 處理所有工作表
    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_csv(worksheet);

      fullText += `\n--- 工作表 ${index + 1}: ${sheetName} ---\n${sheetData}\n`;
    });

    return fullText.trim();
  } catch (error) {
    console.error('Excel 解析失敗:', error);
    throw new Error('Excel 解析失敗');
  }
}

/**
 * 根據檔案類型自動選擇解析器
 */
export async function parseDocument(file: File): Promise<{
  text: string;
  fileType: 'pdf' | 'word' | 'excel' | 'unknown';
}> {
  const fileType = file.type;

  // 🔥 檢查檔案大小限制（10MB）
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`檔案大小超過限制（最大 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB），請使用較小的檔案`);
  }

  try {
    let text = '';
    let detectedFileType: 'pdf' | 'word' | 'excel' | 'unknown' = 'unknown';

    if (fileType === 'application/pdf') {
      text = await parsePDF(file);
      detectedFileType = 'pdf';
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      text = await parseWord(file);
      detectedFileType = 'word';
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel'
    ) {
      text = await parseExcel(file);
      detectedFileType = 'excel';
    } else {
      throw new Error('不支援的檔案類型');
    }

    // 🔥 限制文字內容長度，避免 Token 超限
    const MAX_TEXT_LENGTH = 50000; // 約 50KB 文字
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`⚠️ 文件內容過長 (${text.length} 字元)，將截斷至 ${MAX_TEXT_LENGTH} 字元`);
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[... 內容過長已截斷 ...]';
    }

    return { text, fileType: detectedFileType };
  } catch (error) {
    console.error('文件解析失敗:', error);
    throw error;
  }
}

/**
 * 檢查檔案類型是否支援
 */
export function isSupportedDocumentType(file: File): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  return supportedTypes.includes(file.type);
}