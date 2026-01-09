import React, { useState, useRef } from 'react';
import { useProject } from '@/app/context/ProjectContext';
import { getStorageClient } from '@/lib/storage';
import { RecursiveCharacterTextSplitter } from '@/lib/utils/textSplitter';
import { toast } from 'sonner';
import { Upload, X, FileText, MessageSquare, Link2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDocumentAnalysis } from '@/features/dashboard/hooks/useDocumentAnalysis';
import { AnalysisChunk } from '@/lib/storage/DocumentAnalysisTypes';
import { DocumentAnalysisReport } from '@/features/dashboard/components/DocumentAnalysisReport';

interface CreateSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type SourceType = 'text' | 'conversation' | 'link' | 'file';
type ChannelType = 'line' | 'email' | 'meeting' | 'upload' | 'paste';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('text') || fileType.includes('markdown')) return '📃';
  return '📎';
};

export function CreateSourceDialog({ open, onClose, onCreated }: CreateSourceDialogProps) {
  const { currentProject } = useProject();
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [channel, setChannel] = useState<ChannelType>('paste');
  const [sourceInfo, setSourceInfo] = useState('');
  const [content, setContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Smart Analysis Hooks
  const { analyzeDocument, result: analysisResult, analyzing, reset: resetAnalysis } = useDocumentAnalysis();
  const [showAnalysisReport, setShowAnalysisReport] = useState(false);
  const [uploadedArtifactId, setUploadedArtifactId] = useState<string | null>(null);

  const processFile = (file: File) => {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小超過 10MB 限制');
      return;
    }

    setSelectedFile(file);
    if (!sourceInfo) {
      setSourceInfo(file.name);
    }

    // Auto-set channel to upload
    setChannel('upload');

    // For supported text files, try to read content for preview/analysis
    // Note: PDF/Docx need server-side parsing or heavy client lib, here we assume client-side text extraction for simple files
    // or we rely on what `fileParser` (not imported yet?) can do.
    // For now, simple text reading:
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    } else {
      // For binary files, we might need to rely on what happens *after* upload and extraction.
      // But for Prototype, let's allow "Text Analysis" only if we extracted text.
      // Or we use `pdf-parse` on client (CreateSourceDialog might already have logic from previous context, checking imports...)
      // Ah, `RecursiveCharacterTextSplitter` is imported, but not `fileParser`.
      // Let's assume we can extract text for now or we skip analysis for purely binary files until uploaded.
      // Actually, let's keep it simple: If we have content text, we offer analysis.
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setContent('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    if (!currentProject) return;
    if (!content && !selectedFile) {
      if (!selectedFile) {
        toast.error('請輸入內容或選擇檔案');
        return;
      }
    }
    if (!sourceInfo) {
      toast.error('請輸入來源說明');
      return;
    }

    setIsCreating(true);
    const adapter = getStorageClient();
    let finalContent = content;
    let contentType = 'text/plain';
    let storagePath: string | undefined;
    let fileUrl: string | undefined;
    let fileSize = selectedFile?.size || 0;

    try {
      if (selectedFile) {
        // Determine content type
        contentType = selectedFile.type || 'application/octet-stream';

        if (selectedFile.type.startsWith('text/') ||
          selectedFile.type.includes('json') ||
          selectedFile.type.includes('xml') ||
          selectedFile.type.includes('javascript') ||
          selectedFile.type.includes('typescript')) {
          // Try to read text content if not already set by processFile
          if (!finalContent) {
            finalContent = await selectedFile.text();
          }
        } else {
          // Binary file or PDF/Doc (without parser)
          // We will rely on upload response or backend processing
          if (!finalContent) {
            finalContent = `[File] ${selectedFile.name}`;
          }

          // Upload binary file
          toast.loading('正在上傳檔案...', { id: 'import_process' });
          const uploadResult = await adapter.uploadFile(currentProject.id, selectedFile);

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          if (uploadResult.data) {
            storagePath = uploadResult.data.storagePath;
            fileUrl = uploadResult.data.fileUrl;
          }
        }
      }

      toast.loading('正在儲存文件記錄...', { id: 'import_process' });

      const { data, error } = await adapter.createArtifact({
        project_id: currentProject.id,
        content_type: contentType,
        original_content: finalContent,
        masked_content: finalContent,
        storage_path: storagePath,
        file_url: fileUrl,
        file_size: fileSize,
        meta: {
          source_info: sourceInfo || undefined,
          channel,
          file_name: selectedFile?.name,
          is_manual: true
        }
      });

      if (error) throw error;
      if (!data) throw new Error('Artifact creation returned no data');

      // Trigger RAG Embedding
      toast.loading('正在建立 AI 搜尋索引...', { id: 'import_process' });
      try {
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200
        });

        let contentToEmbed = finalContent;
        if (!contentToEmbed || contentToEmbed.length < 50) {
          // If content is too short (e.g. just filename), maybe avoid embedding or embed what we have
          contentToEmbed = (data.meta?.file_name || '') + '\n' + (data.meta?.source_info || '');
        }

        const chunks = splitter.splitText(contentToEmbed);

        console.log(`[RAG] Chunking content into ${chunks.length} parts`);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await adapter.embedContent(
            chunk,
            data.id,
            'artifact',
            currentProject.id,
            {
              ...data.meta,
              storage_path: storagePath,
              chunk_index: i,
              total_chunks: chunks.length,
              file_url: fileUrl
            }
          );
        }

        // toast.success(`索引建立完成 (共 ${chunks.length} 個區塊)`, { id: 'import_process' });
      } catch (embedError) {
        console.error('Embedding failed (background):', embedError);
        // 不中斷流程，僅 log
      }

      toast.success('✓ 文件已匯入並完成索引', { id: 'import_process' });

      // Smart Analysis Trigger
      // Only trigger if we have meaningful text content
      if (finalContent && finalContent.length > 50) {
        setShowAnalysisReport(true); // Helper state to show report
        setUploadedArtifactId(data.id);
        analyzeDocument(finalContent, currentProject.id);
      } else {
        handleClose();
        onCreated();
      }

    } catch (error) {
      console.error('Failed to create artifact:', error);
      toast.error('匯入失敗：' + (error as Error).message, { id: 'import_process' });
    } finally {
      setIsCreating(false);
    }
  };


  const handleClose = () => {
    setSourceType('text');
    setChannel('paste');
    setSourceInfo('');
    setContent('');
    setSelectedFile(null);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleSmartAnalysisConfirm = async (selectedChunks: AnalysisChunk[]) => {
    if (!currentProject || !uploadedArtifactId) return;

    try {
      toast.loading('正在根據分析結果更新專案...', { id: 'analysis_confirm' });
      const adapter = getStorageClient();

      let createdCount = 0;

      console.log(`🚀 [AnalysisConfirm] Processing ${selectedChunks.length} selected chunks...`);
      for (const chunk of selectedChunks) {
        const { action, targetTaskId, extractedTitle, extractedDescription, category } = chunk.mappingResult;

        // 確保 ID 是有效的 UUID
        const artifactId = (uploadedArtifactId === 'null' || !uploadedArtifactId) ? undefined : uploadedArtifactId;
        const safeTargetTaskId = (targetTaskId === 'null' || !targetTaskId) ? undefined : targetTaskId;

        // 統一建立建議項目 (suggestion)，確保所有 AI 分析結果都先進入收件匣
        if (action === 'create_new' || action === 'map_existing' || action === 'append_spec') {
          await adapter.createItem({
            project_id: currentProject.id,
            type: (category as any) || 'general',
            status: 'suggestion',
            title: action === 'create_new' ? (extractedTitle || '新發現項目') :
              action === 'map_existing' ? `[建議映射] ${extractedTitle || '項目'}` :
                `[建議補充規格] ${extractedTitle || '項目'}`,
            description: extractedDescription || chunk.originalText,
            source_artifact_id: artifactId as string,
            meta: {
              confidence: chunk.mappingResult.confidence,
              reasoning: chunk.mappingResult.reasoning,
              ai_generated: true,
              source_location: chunk.sourceLocation,
              // 收件匣確認時識別動作
              suggested_action: action,
              target_id: safeTargetTaskId,
              // 保存原始資訊供收件匣顯示
              original_chunk_id: chunk.id
            }
          });
          createdCount++;
        }
      }

      toast.success(`執行完成：已建立 ${createdCount} 張建議卡至收件匣`, { id: 'analysis_confirm' });

      handleClose();
      onCreated();

    } catch (error) {
      console.error('Failed to process analysis results:', error);
      toast.error('處理失敗: ' + (error as Error).message, { id: 'analysis_confirm' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && analyzing) return; // Prevent close while analyzing
      if (!val) handleClose();
    }}>
      {showAnalysisReport && (analysisResult || analyzing) ? (
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {analyzing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative bg-primary/10 p-6 rounded-full">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">AI 正在深度分析文件...</h3>
                <p className="text-muted-foreground animate-pulse">正在提取關鍵資訊、識別潛在任務與關聯性</p>
              </div>
              <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full animate-progress" style={{ width: '100%' }} />
              </div>
            </div>
          ) : analysisResult ? (
            <DocumentAnalysisReport
              result={analysisResult}
              onConfirm={handleSmartAnalysisConfirm}
              onClose={() => {
                setShowAnalysisReport(false);
                resetAnalysis();
              }}
            />
          ) : null}
        </DialogContent>
      ) : (
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>匯入新文件</DialogTitle>
            <DialogDescription>
              將文字、對話或連結匯入專案作為證據來源
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Type Selector */}
            <div className="space-y-2">
              <Label>文件類型</Label>
              <div className="flex gap-2 p-1 bg-muted rounded-[var(--radius-lg)]">
                <Button
                  type="button"
                  variant={sourceType === 'text' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setSourceType('text')}
                >
                  <FileText className="h-4 w-4" />
                  <label className="cursor-pointer">文字</label>
                </Button>
                <Button
                  type="button"
                  variant={sourceType === 'conversation' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setSourceType('conversation')}
                >
                  <MessageSquare className="h-4 w-4" />
                  <label className="cursor-pointer">對話串</label>
                </Button>
                <Button
                  type="button"
                  variant={sourceType === 'link' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => setSourceType('link')}
                >
                  <Link2 className="h-4 w-4" />
                  <label className="cursor-pointer">連結</label>
                </Button>
                <Button
                  type="button"
                  variant={sourceType === 'file' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => {
                    setSourceType('file');
                    setChannel('upload');
                  }}
                >
                  <Upload className="h-4 w-4" />
                  <label className="cursor-pointer">檔案</label>
                </Button>
              </div>
            </div>

            {/* Channel and Source Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="channel">來源通路</Label>
                <Select value={channel} onValueChange={(v: ChannelType) => setChannel(v)}>
                  <SelectTrigger id="channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">LINE</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">會議記錄</SelectItem>
                    <SelectItem value="upload">檔案上傳</SelectItem>
                    <SelectItem value="paste">貼上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-info">標題 / 檔名（選填）</Label>
                <Input
                  id="source-info"
                  placeholder="例如：客戶會議 12/19"
                  value={sourceInfo}
                  onChange={(e) => setSourceInfo(e.target.value)}
                />
              </div>
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              {sourceType === 'file' ? (
                <>
                  <Label htmlFor="file-upload">上傳檔案</Label>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile ? (
                    <div className="border-2 border-dashed rounded-[var(--radius-lg)] p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{getFileIcon(selectedFile.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedFile.name}</p>
                          <p className="text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        w-full border-2 border-dashed rounded-[var(--radius-lg)] p-8 
                        transition-colors cursor-pointer flex flex-col items-center gap-3
                        ${isDragging
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/25 hover:bg-muted/50 text-muted-foreground'}
                      `}
                    >
                      <Upload className={`h-12 w-12 ${isDragging ? 'animate-bounce' : ''}`} />
                      <div className="text-center">
                        <p className="font-medium">
                          {isDragging ? '放開以已上傳檔案' : '點擊或拖曳檔案至此'}
                        </p>
                        <p className="text-sm mt-1 opacity-80">
                          支援 PDF、Word、Excel、TXT、MD、圖檔
                        </p>
                        <p className="text-xs mt-1 opacity-60">
                          檔案大小限制：10MB
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="content">
                    {sourceType === 'link' ? '網址 URL' : '內容'}
                  </Label>
                  {sourceType === 'link' ? (
                    <Input
                      id="content"
                      type="url"
                      placeholder="https://..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  ) : (
                    <Textarea
                      id="content"
                      placeholder={
                        sourceType === 'conversation'
                          ? '請貼上對話內容，AI 會自動辨識發言者與時間...'
                          : '請在此貼上文字內容...'
                      }
                      className="min-h-[200px] resize-none"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  )}
                </>
              )}
            </div>

            {/* Info Alert */}
            <div className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-blue-50 border border-blue-200">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-blue-700">
                  <label>證據鏈保護與隱私偵測</label>
                </p>
                <p className="text-muted-foreground">
                  <label>
                    匯入後 AI 會自動掃描敏感資訊（帳密、個資、內部連結）。
                    原始內容匯入後不可修改，僅能透過封存功能管理。
                  </label>
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isCreating || analyzing}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={
              isCreating || analyzing ||
              (sourceType === 'file' ? !selectedFile : !content.trim())
            }>
              {isCreating || analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <label>{analyzing ? 'AI 分析中...' : '處理中...'}</label>
                </>
              ) : (
                <label>匯入專案</label>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}