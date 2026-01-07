import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/components/ui/utils';

interface HelpTooltipProps {
    content: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    className?: string;
    iconSize?: number;
}

/**
 * 內嵌說明提示元件
 * 顯示 ? 圖示，hover 時顯示說明文字
 */
export function HelpTooltip({
    content,
    side = 'top',
    className,
    iconSize = 14
}: HelpTooltipProps) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'inline-flex items-center justify-center rounded-full p-0.5',
                            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                            'transition-colors cursor-help',
                            className
                        )}
                        aria-label="說明"
                    >
                        <HelpCircle size={iconSize} />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={side}
                    className="max-w-xs text-sm"
                >
                    <p>{content}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
