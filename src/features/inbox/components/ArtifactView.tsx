import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Artifact } from '../../../lib/storage/types';
import { getStorageClient } from '../../../lib/storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ArtifactViewProps {
  artifactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtifactView({ artifactId, open, onOpenChange }: ArtifactViewProps) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && artifactId) {
      loadArtifact();
    }
  }, [open, artifactId]);

  const loadArtifact = async () => {
    setLoading(true);
    const storage = getStorageClient();
    const { data, error } = await storage.getArtifactById(artifactId);
    
    if (!error && data) {
      setArtifact(data);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            原始來源
          </DialogTitle>
          <DialogDescription>
            檢視產生此建議卡的原始輸入內容
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : artifact ? (
          <div className="space-y-4">
            <div>
              <div className="text-muted-foreground mb-1">類型</div>
              <div className="capitalize">{artifact.type}</div>
            </div>
            
            {artifact.source_info && (
              <div>
                <div className="text-muted-foreground mb-1">來源資訊</div>
                <div>{artifact.source_info}</div>
              </div>
            )}

            <div>
              <div className="text-muted-foreground mb-1">內容</div>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap break-words">
                {artifact.masked_content || artifact.content}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1">建立時間</div>
              <div>{new Date(artifact.created_at).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center">
            找不到來源資��
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}