import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ItemNotesProps {
  notes?: string;
  notesUpdatedAt?: string;
  notesUpdatedBy?: string;
  members: Array<{ email: string; name: string }>;
  currentUserEmail?: string;
  onSave: (notes: string) => Promise<boolean>;
  disabled?: boolean;
}

export function ItemNotes({
  notes,
  notesUpdatedAt,
  notesUpdatedBy,
  members,
  currentUserEmail = 'dev@example.com', // Local mode default
  onSave,
  disabled = false,
}: ItemNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset value when notes prop changes
  useEffect(() => {
    setValue(notes || '');
  }, [notes]);

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    const trimmedValue = value.trim();
    const success = await onSave(trimmedValue);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setValue(notes || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Esc to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const getUpdaterName = () => {
    if (!notesUpdatedBy) return null;
    const member = members.find(m => m.email === notesUpdatedBy);
    const isCurrentUser = notesUpdatedBy === currentUserEmail;
    return isCurrentUser ? '你' : (member?.name || notesUpdatedBy);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if notes need truncation (more than 2 lines)
  const needsTruncation = notes && notes.split('\n').length > 2;
  const displayNotes = isExpanded ? notes : notes?.split('\n').slice(0, 2).join('\n');

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {isEditing ? (
        // Edit Mode
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">編輯備註</span>
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] bg-background focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            placeholder="輸入備註內容... (按 Ctrl+Enter 儲存，Esc 取消)"
            disabled={isSaving}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8"
            >
              <Check className="h-4 w-4 mr-1" />
              {isSaving ? '儲存中...' : '儲存'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              取消
            </Button>
            <span className="text-muted-foreground ml-2">
              提示：Ctrl+Enter 儲存，Esc 取消
            </span>
          </div>
        </div>
      ) : (
        // Display Mode
        <div
          onClick={() => !disabled && setIsEditing(true)}
          className={`p-3 rounded-[var(--radius-md)] bg-muted/50 border border-border ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/70 hover:border-accent/30'
          } transition-colors`}
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {notes ? (
                <div className="space-y-1">
                  <p className="text-foreground whitespace-pre-wrap break-words">
                    {displayNotes}
                    {needsTruncation && !isExpanded && '...'}
                  </p>
                  {needsTruncation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                      }}
                      className="text-accent hover:underline"
                    >
                      {isExpanded ? '收起' : '展開全文'}
                    </button>
                  )}
                  {(notesUpdatedAt || notesUpdatedBy) && (
                    <div className="text-muted-foreground mt-2">
                      最後更新：{formatDate(notesUpdatedAt)}
                      {notesUpdatedBy && ` by ${getUpdaterName()}`}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">點擊新增備註</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
