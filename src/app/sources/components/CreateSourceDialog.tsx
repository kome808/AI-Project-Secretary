import React, { useState, useRef } from 'react';
import { useProject } from '@/app/context/ProjectContext';
import { getStorageClient } from '../../../lib/storage';
import {
  FileText,
  Link2,
  MessageSquare,
  AlertCircle,
  Loader2,
  Upload,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

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

    // For text files, read content
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    } else {
      // For other files, we'll store the file info
      setContent(`[檔案: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)} KB]`);
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
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Basic type validation using ACCEPTED_FILE_TYPES keys
      // Note: This is a loose check, mainly relying on processFile logic later or user understanding
      processFile(file);
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
    // ... (rest of handleCreate remains same, so we don't need to replace it entirely if we scope correctly, but here we are replacing a larger chunk including handleFileSelect)

    // Validate based on source type
    if (sourceType === 'file' && !selectedFile) {
      toast.error('請選擇要上傳的檔案');
      return;
    }
    if (sourceType !== 'file' && !content.trim()) {
      toast.error('請輸入內容');
      return;
    }

    setIsCreating(true);
    try {
      const storage = getStorageClient();

      let contentType = 'text/plain';
      let finalContent = content.trim();
      let storagePath: string | undefined;
      let fileUrl: string | undefined;
      let fileSize: number | undefined;

      if (sourceType === 'conversation') {
        contentType = 'text/conversation';
      } else if (sourceType === 'link') {
        contentType = 'text/uri-list';
      } else if (sourceType === 'file' && selectedFile) {
        contentType = selectedFile.type;
        fileSize = selectedFile.size;

        // 檔案與圖片：上傳到 Storage
        if (selectedFile.type.startsWith('application/') || selectedFile.type.startsWith('image/')) {
          toast.loading('上傳檔案中...', { id: 'upload' });

          const uploadResult = await storage.uploadFile(currentProject.id, selectedFile);

          if (uploadResult.error) {
            toast.dismiss('upload');
            throw uploadResult.error;
          }

          if (uploadResult.data) {
            storagePath = uploadResult.data.storagePath;
            fileUrl = uploadResult.data.fileUrl;
            finalContent = ''; // 檔案不存 original_content

            toast.dismiss('upload');
            toast.loading('建立文件記錄...', { id: 'create' });
          }
        } else {
          // 純文字檔案：讀取內容存入 original_content
          if (selectedFile.type.startsWith('text/')) {
            const text = await selectedFile.text();
            finalContent = text;
          }
        }
      }

      const { data, error } = await storage.createArtifact({
        project_id: currentProject.id,
        content_type: contentType,
        original_content: finalContent,
        masked_content: finalContent, // TODO: Implement masking
        storage_path: storagePath,
        file_url: fileUrl,
        file_size: fileSize,
        meta: {
          source_info: sourceInfo || undefined,
          channel,
          file_name: selectedFile?.name,
          is_manual: true // Mark as valid manual import
        }
      });

      if (error) throw error;

      // 🔥 Trigger RAG Embedding
      toast.loading('正在建立 RAG 索引...', { id: 'embed' });
      try {
        await storage.embedContent(
          finalContent,
          data.id,
          'artifact',
          currentProject.id,
          {
            ...data.meta,
            storage_path: storagePath, // Ensure storage_path is passed for file parsing
            file_url: fileUrl
          }
        );
        toast.dismiss('embed');
      } catch (embedError) {
        console.error('Embedding failed (background):', embedError);
        // Don't fail the UI, just warn
        toast.error('索引建立失敗，但文件已儲存');
      }

      toast.dismiss('create');
      toast.success('✓ 文件已匯入並開始索引');
      handleClose();
      onCreated();
    } catch (error) {
      console.error('Failed to create artifact:', error);
      toast.error('匯入失敗：' + (error as Error).message);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={
            isCreating ||
            (sourceType === 'file' ? !selectedFile : !content.trim())
          }>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <label>處理中...</label>
              </>
            ) : (
              <label>匯入專案</label>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}