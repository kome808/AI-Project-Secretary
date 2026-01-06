import React, { useState, useRef, useEffect } from 'react';
import { AtSign, Users, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Member } from '../../../lib/storage/types';

interface MemberInputProps {
  value: string; // member email
  onChange: (email: string, member?: Member) => void;
  members?: Member[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MemberInput({ 
  value, 
  onChange, 
  members = [], 
  placeholder = '輸入 @ 選擇成員',
  disabled = false,
  className = ''
}: MemberInputProps) {
  const [inputText, setInputText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  // Initialize display from value
  useEffect(() => {
    if (value && members.length > 0) {
      const member = members.find(m => m.email === value);
      if (member) {
        setSelectedMember(member);
        setInputText(`@${member.name}`);
      } else {
        setInputText(value);
      }
    } else {
      setSelectedMember(null);
      setInputText('');
    }
  }, [value, members]);

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

  const getFilteredMembers = () => {
    if (!mentionSearch) return members;
    const search = mentionSearch.toLowerCase();
    return members.filter(m => 
      m.name.toLowerCase().includes(search) || 
      m.email.toLowerCase().includes(search)
    );
  };

  const handleMentionSelect = (member: Member) => {
    setSelectedMember(member);
    setInputText(`@${member.name}`);
    setShowMentions(false);
    setMentionSearch('');
    setSelectedMentionIndex(0);
    onChange(member.email, member);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setInputText(newText);

    // Check if input starts with @
    if (newText.startsWith('@')) {
      const searchText = newText.substring(1);
      setMentionSearch(searchText);
      setShowMentions(true);
      setSelectedMentionIndex(0);
      setSelectedMember(null);
    } else {
      setShowMentions(false);
      setMentionSearch('');
      setSelectedMember(null);
      // Allow direct email input
      onChange(newText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    }
  };

  const handleToggleMentionMenu = () => {
    if (disabled) return;
    
    if (showMentions) {
      setShowMentions(false);
    } else {
      setInputText('@');
      setShowMentions(true);
      setMentionSearch('');
      setSelectedMentionIndex(0);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setInputText('');
    setSelectedMember(null);
    setShowMentions(false);
    onChange('');
    inputRef.current?.focus();
  };

  const filteredMembers = getFilteredMembers();

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-20"
        />
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          {/* Clear Button */}
          {inputText && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              disabled={disabled}
              title="清除"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* @ Mention Button */}
          {members.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleToggleMentionMenu}
              disabled={disabled}
              title="選擇成員 (@)"
            >
              <AtSign className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mention Menu */}
      {showMentions && filteredMembers.length > 0 && (
        <div
          ref={mentionMenuRef}
          className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-[var(--radius-lg)] shadow-[var(--elevation-lg)] max-h-48 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1 mb-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <label className="text-xs">選擇成員</label>
            </div>
            {filteredMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                className={`w-full flex items-start gap-3 p-2 rounded-[var(--radius)] text-left transition-colors ${
                  index === selectedMentionIndex 
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
                  <div className="text-sm text-muted-foreground truncate">{member.email}</div>
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
          className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-[var(--radius-lg)] shadow-[var(--elevation-lg)] z-50"
        >
          <div className="p-4 text-center text-sm text-muted-foreground">
            <label>找不到符合的成員</label>
          </div>
        </div>
      )}
    </div>
  );
}
