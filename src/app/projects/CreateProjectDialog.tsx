import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProject } from '../context/ProjectContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  description: string;
}

// Fixed: All form components now use forwardRef
export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { createProject } = useProject();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: FormData) => {
    console.log('Form submitted:', data);
    setError(null);
    
    try {
      const result = await createProject(data.name, data.description);
      console.log('Create project result:', result);
      
      if (result) {
        reset();
        onOpenChange(false);
      } else {
        setError("建立專案失敗，請重試。");
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError("建立專案時發生錯誤。");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onPointerDownOutside={(e) => {
          // Don't close on outside click during submission
          if (isSubmitting) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>建立專案</DialogTitle>
          <DialogDescription>
            建立新專案以開始追蹤任務和決策
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="create-project-form">
          <div className="space-y-2">
            <Label htmlFor="name">專案名稱</Label>
            <Input
              id="name"
              placeholder="我的專案"
              autoFocus
              {...register('name', { required: '請輸入專案名稱' })}
            />
            {errors.name && (
              <p className="text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">專案描述</Label>
            <Textarea
              id="description"
              placeholder="簡短描述這個專案..."
              {...register('description')}
            />
          </div>
          {error && <p className="text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button 
            type="submit" 
            form="create-project-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? '建立中...' : '建立專案'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}