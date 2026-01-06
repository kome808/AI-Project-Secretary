import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, X, File as FileIcon, AtSign, Users, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Member } from '../../../lib/storage/types';
import { cn } from '@/components/ui/utils';

interface ChatInputProps {
  onSend: (text: string, file?: File) => void;
  isLoading?: boolean;
  defaultValue?: string;
  placeholder?: string;
  members?: Member[];
  processingStatus?: string; // 新增：處理狀態訊息（用於漸進式 UI）
  suggestions?: string[]; // 新增：AI 建議選項
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  defaultValue = '',
  placeholder = '貼上文字、會議記錄或描述需求...',
  members = [],
  processingStatus,
  suggestions = [],
  onSuggestionClick,
  className
}: ChatInputProps) {
  const [text, setText] = useState(defaultValue);
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Update text if defaultValue changes (e.g. from chips)
  useEffect(() => {
    if (defaultValue) setText(defaultValue);
  }, [defaultValue]);

  // Close mention menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentions]);

  const handleSend = () => {
    if (!text.trim() && !file) return;
    onSend(text, file || undefined);
    setText('');
    setFile(null);
    setImagePreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention menu navigation
    if (showMentions) {
      const filteredMembers = getFilteredMembers();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
      } else if (e.key === 'Enter' && filteredMembers.length > 0) {
        e.preventDefault();
        handleMentionSelect(filteredMembers[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        setMentionSearch('');
        setSelectedMentionIndex(0);
      }
      return;
    }

    // Allow Shift+Enter for new line, Enter alone does nothing (use button to submit)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Do not auto-submit, user must click the button
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      if (e.target.files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    }
  };

  const getFilteredMembers = () => {
    if (!mentionSearch) return members;
    const search = mentionSearch.toLowerCase();
    return members.filter(m =>
      m.name.toLowerCase().includes(search) ||
      m.email.toLowerCase().includes(search)
    );
  };

  const handleMentionSelect = (member: Member) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const textAfterCursor = text.substring(cursorPos);

    // Find the @ symbol position
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex === -1) return;

    // Replace @search with @name
    const beforeAt = text.substring(0, atIndex);
    const mention = `@${member.name} `;
    const newText = beforeAt + mention + textAfterCursor;

    setText(newText);
    setShowMentions(false);
    setMentionSearch('');
    setSelectedMentionIndex(0);

    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = beforeAt.length + mention.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPos = e.target.selectionStart;

    setText(newText);

    // Check if we should show mention menu
    const textBeforeCursor = newText.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Check if there's a space before @ or it's at the start
      const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      const isValidTrigger = charBeforeAt === ' ' || charBeforeAt === '\n' || atIndex === 0;

      if (isValidTrigger) {
        const searchText = textBeforeCursor.substring(atIndex + 1);
        // Only show if there's no space in the search (still typing the mention)
        if (!searchText.includes(' ') && !searchText.includes('\n')) {
          setMentionSearch(searchText);
          setShowMentions(true);
          setSelectedMentionIndex(0);
          return;
        }
      }
    }

    // Hide mention menu if conditions not met
    setShowMentions(false);
    setMentionSearch('');
  };

  const handleToggleMentionMenu = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (showMentions) {
      setShowMentions(false);
    } else {
      // Insert @ at cursor position
      const cursorPos = textarea.selectionStart;
      const textBefore = text.substring(0, cursorPos);
      const textAfter = text.substring(cursorPos);
      const newText = textBefore + '@' + textAfter;

      setText(newText);
      setShowMentions(true);
      setMentionSearch('');
      setSelectedMentionIndex(0);

      // Move cursor after @
      setTimeout(() => {
        textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
        textarea.focus();
      }, 0);
    }
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      if (files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(files[0]);
      }
    }
  };

  const filteredMembers = getFilteredMembers();

  return (
    <div className={cn("flex flex-col gap-2 p-3 border-t border-border bg-background relative", className)}>
      {/* Processing Status (漸進式 UI) */}
      {processingStatus && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 p-3 rounded-[var(--radius)] text-sm mb-2">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
            <label className="font-medium">{processingStatus}</label>
          </div>
        </div>
      )}

      {/* AI Suggestions Chips */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-1">
          {suggestions.map((option, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick?.(option)}
              className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium rounded-full transition-colors flex items-center gap-1"
            >
              <span>{option}</span>
            </button>
          ))}
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative">
          <img
            src={imagePreview}
            alt="預覽"
            className="max-h-32 rounded-[var(--radius)] border border-border object-contain bg-muted"
          />
          <button
            onClick={() => {
              setFile(null);
              setImagePreview(null);
            }}
            className="absolute top-1 right-1 bg-background/90 hover:bg-background p-1 rounded-full shadow-[var(--elevation-sm)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* File Info (non-image) */}
      {file && !imagePreview && (
        <div className="flex items-center gap-2 bg-muted p-2 rounded-[var(--radius)] text-sm">
          <FileIcon className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={() => {
              setFile(null);
              setImagePreview(null);
            }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative">
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-[var(--radius)] backdrop-blur-sm pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-8 w-8" />
              <label className="font-medium">拖曳檔案至此上傳</label>
            </div>
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] pr-24 resize-none"
          disabled={isLoading}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />

        <div className="absolute bottom-2 right-2 flex gap-1">
          {/* @ Mention Button */}
          {members.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleToggleMentionMenu}
              disabled={isLoading}
              title="提及成員 (@)"
            >
              <AtSign className="h-4 w-4" />
            </Button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="附加檔案"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={handleSend}
            disabled={(!text.trim() && !file) || isLoading}
            title="傳送"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mention Menu */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          ref={mentionMenuRef}
          className="absolute bottom-full mb-2 left-3 right-3 bg-background border border-border rounded-[var(--radius-lg)] shadow-[var(--elevation-lg)] max-h-48 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1 mb-1 text-muted-foreground">
              <Users className="h-3 h-3" />
              <label className="text-xs">選擇成員提及</label>
            </div>
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                className={`w-full flex items-start gap-3 p-2 rounded-[var(--radius)] text-left transition-colors ${index === selectedMentionIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
                  }`}
                onClick={() => handleMentionSelect(member)}
                onMouseEnter={() => setSelectedMentionIndex(index)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
                  <label className="font-medium">{member.name[0]}</label>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{member.name}</div>
                  <div className="text-muted-foreground truncate">{member.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint when no members */}
      {showMentions && filteredMembers.length === 0 && (
        <div
          ref={mentionMenuRef}
          className="absolute bottom-full mb-2 left-3 right-3 bg-background border border-border rounded-[var(--radius-lg)] shadow-[var(--elevation-lg)] z-50"
        >
          <div className="p-4 text-center text-muted-foreground">
            <label>找不到符合的成員</label>
          </div>
        </div>
      )}
    </div>
  );
}