
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Initialize PDF Worker using Vite's URL import
// This avoids CORS issues and version mismatches by serving the worker locally
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text from various file formats
 */
export const FileParser = {
    /**
     * Parse text from PDF
     */
    parsePDF: async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n\n';
            }
            return fullText.trim();
        } catch (error) {
            console.error('PDF Parse Error:', error);
            // Re-throw to let the caller handle the fallback
            throw new Error('無法讀取 PDF 內容');
        }
    },

    /**
     * Parse text from Word (.docx)
     */
    parseWord: async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value.trim();
        } catch (error) {
            console.error('Word Parse Error:', error);
            throw new Error('無法讀取 Word 內容');
        }
    },

    /**
     * Parse text from Excel (.xlsx, .xls)
     */
    parseExcel: async (file: File): Promise<string> => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });

            let fullText = '';
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                fullText += `--- Sheet: ${sheetName} ---\n`;
                jsonData.forEach((row: any) => {
                    fullText += row.join(' ') + '\n';
                });
                fullText += '\n';
            });

            return fullText.trim();
        } catch (error) {
            console.error('Excel Parse Error:', error);
            throw new Error('無法讀取 Excel 內容');
        }
    }
};
