import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInput } from './ChatInput';
import { PromptChips } from './PromptChips';
import { useProject } from '@/app/context/ProjectContext';
import { generatorService } from '../../../lib/ai/GeneratorService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function ChatFloatingPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promptText, setPromptText] = useState('');
  const { currentProject, adapter } = useProject();
  const navigate = useNavigate();

  const handlePromptSelect = (text: string) => {
    setPromptText(text);
  };

  const handleSend = async (text: string, file?: File) => {
    if (!currentProject) {
      toast.error('請先選擇專案');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Generate Suggestions (不立即建立 Artifact)
      const artifactType = file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text';
      const content = text || (file ? `[File: ${file.name}]` : '');
      
      const suggestions = await generatorService.generateSuggestions(content, artifactType);

      // 2. Create Items with status 'suggestion'
      // 暫時儲存原始內容到 meta 中，等確認入庫時再建立 Artifact
      let createdCount = 0;
      for (const suggestion of suggestions) {
        const { data, error } = await adapter.createItem({
          project_id: currentProject.id,
          type: suggestion.type,
          status: 'suggestion',
          title: suggestion.title,
          description: suggestion.description,
          source_artifact_id: null, // 暫時不連結 Artifact
          due_date: suggestion.due_date,
          assignee_id: suggestion.assignee_id,
          meta: { 
            confidence: suggestion.confidence,
            ...suggestion.meta,
            // 暫存原始內容，等確認入庫時再建立 Artifact
            _pending_artifact: {
              type: artifactType,
              content: content,
              source_info: file ? file.name : new Date().toLocaleString()
            }
          }
        });

        if (!error && data) {
          createdCount++;
        }
      }

      toast.success(`已產生 ${createdCount} 張建議卡`, {
        action: {
          label: '前往 Inbox',
          onClick: () => navigate('/inbox')
        }
      });

      // Reset and close
      setPromptText('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error processing input:', error);
      toast.error('處理失敗，請重試');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center shadow-[var(--elevation-sm)] z-50"
        aria-label="開啟對話輸入"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[480px] max-w-[calc(100vw-48px)] bg-card border border-border rounded-lg shadow-[var(--elevation-sm)] z-50 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3>對話輸入</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-muted-foreground mb-4">
          貼上會議記錄、訊息內容，或描述您的需求，AI 會自動產生建議卡供您確認。
        </p>
        <PromptChips onSelect={handlePromptSelect} />
      </div>

      {/* Footer - Input */}
      <ChatInput 
        onSend={handleSend} 
        isLoading={isProcessing}
        defaultValue={promptText}
      />
    </div>
  );
}