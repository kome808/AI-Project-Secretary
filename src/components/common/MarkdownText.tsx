import React from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/components/ui/utils';

interface MarkdownTextProps {
    content: string;
    className?: string;
}

export function MarkdownText({ content, className }: MarkdownTextProps) {
    // Split content by markdown link pattern: [text](url)
    // Capturing group allows us to interleave text and links
    const parts = content.split(/(\[[^\]]+\]\([^)]+\))/g);

    return (
        <span className={cn("whitespace-pre-wrap", className)}>
            {parts.map((part, i) => {
                const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

                if (match) {
                    const [_, text, url] = match;

                    // Check if it's an internal link
                    if (url.startsWith('/') || url.startsWith('#')) {
                        // Remove # if it's hash history which we might check, 
                        // but standard react-router uses /path
                        // Our citation uses /sources/:id
                        return (
                            <Link
                                key={i}
                                to={url}
                                className="text-blue-600 hover:underline font-medium break-all"
                            >
                                {text}
                            </Link>
                        );
                    }

                    return (
                        <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium break-all"
                        >
                            {text}
                        </a>
                    );
                }

                return part;
            })}
        </span>
    );
}
