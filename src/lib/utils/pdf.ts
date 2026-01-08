
import * as pdfjsLib from 'pdfjs-dist';

// Ensure worker is set up
// We use a CDN-hosted worker to avoid complex build setup issues
const pdfjsVersion = pdfjsLib.version;
// Fallback to a known stable version if version is not available or strange
const workerVersion = pdfjsVersion || '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.js`;
console.log(`[PDF] Initializing worker with version: ${workerVersion}`);

/**
 * Extracts text from a PDF file
 * @param file The PDF file object
 * @returns Promise<string> The extracted text content
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';

        // Iterate through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Join text items with space and add newline for each page
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('無法讀取 PDF 內容');
    }
}
