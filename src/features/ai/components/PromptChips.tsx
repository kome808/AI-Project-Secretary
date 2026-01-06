import { Badge } from "@/components/ui/badge";

interface PromptChipsProps {
  onSelect: (text: string) => void;
}

export const PromptChips = ({ onSelect }: PromptChipsProps) => {
  const chips = [
    "產生晨間簡報",
    "找出逾期與風險",
    "把貼上內容變成待辦/待確認",
    "建立變更需求（CR）"
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {chips.map((chip) => (
        <Badge 
          key={chip} 
          variant="outline" 
          className="cursor-pointer hover:bg-accent hover:text-accent-foreground whitespace-nowrap px-3 py-1.5 transition-colors border-accent/30 text-accent"
          onClick={() => onSelect(chip)}
        >
          {chip}
        </Badge>
      ))}
    </div>
  );
};