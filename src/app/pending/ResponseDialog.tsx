import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
}

export function ResponseDialog({ open, onOpenChange, onSubmit, isSubmitting }: ResponseDialogProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content);
      setContent('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>記錄回覆內容</DialogTitle>
          <DialogDescription>
            記錄收到的回覆，這將保存在待確認事項的記錄中
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="response-content">回覆內容</Label>
            <Textarea
              id="response-content"
              placeholder="貼上收到的回覆內容、連結或說明..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? '儲存中...' : '儲存回覆'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
