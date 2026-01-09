export class RecursiveCharacterTextSplitter {
    chunkSize: number;
    chunkOverlap: number;
    separators: string[];

    constructor({
        chunkSize = 1000,
        chunkOverlap = 200,
        separators = ['\n\n', '\n', '。', '！', '？', '，', '、', ' ', '']
    } = {}) {
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
        this.separators = separators;
    }

    splitText(text: string): string[] {
        const finalChunks: string[] = [];

        // Find the best separator to use
        let separator = this.separators[this.separators.length - 1];
        for (const s of this.separators) {
            if (text.includes(s)) {
                separator = s;
                break;
            }
        }

        // Split text by separator
        const splits = text.split(separator);
        let currentChunk: string[] = [];
        let currentLength = 0;

        for (const split of splits) {
            const splitLen = split.length;
            if (currentLength + splitLen + (currentChunk.length > 0 ? separator.length : 0) > this.chunkSize) {
                if (currentChunk.length > 0) {
                    const doc = currentChunk.join(separator);
                    finalChunks.push(doc);

                    // Handle overlap
                    // Keep chunks from the end to form overlap
                    while (currentLength > this.chunkOverlap && currentChunk.length > 0) {
                        const removed = currentChunk.shift();
                        currentLength -= (removed?.length || 0) + (currentChunk.length > 0 ? separator.length : 0);
                    }
                }
            }
            currentChunk.push(split);
            currentLength += splitLen + (currentChunk.length > 1 ? separator.length : 0);
        }

        if (currentChunk.length > 0) {
            finalChunks.push(currentChunk.join(separator));
        }

        // Recursively process chunks that remain too large
        // (This happens if a single split block is larger than chunkSize)
        const trulyFinalChunks: string[] = [];
        for (const chunk of finalChunks) {
            if (chunk.length > this.chunkSize) {
                const currentIndex = this.separators.indexOf(separator);
                const nextSeparatorIndex = currentIndex + 1;
                if (nextSeparatorIndex < this.separators.length) {
                    const subSplitter = new RecursiveCharacterTextSplitter({
                        chunkSize: this.chunkSize,
                        chunkOverlap: this.chunkOverlap,
                        separators: this.separators.slice(nextSeparatorIndex)
                    });
                    trulyFinalChunks.push(...subSplitter.splitText(chunk));
                } else {
                    // No more separators, forced hard chop
                    // Split by character size
                    for (let i = 0; i < chunk.length; i += this.chunkSize) {
                        trulyFinalChunks.push(chunk.substring(i, i + this.chunkSize));
                    }
                }
            } else {
                trulyFinalChunks.push(chunk);
            }
        }

        return trulyFinalChunks;
    }
}
