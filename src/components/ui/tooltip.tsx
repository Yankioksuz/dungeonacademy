import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2 before:top-full before:left-1/2 before:-translate-x-1/2 before:border-t-fantasy-dark-card",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2 before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-b-fantasy-dark-card",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2 before:left-full before:top-1/2 before:-translate-y-1/2 before:border-l-fantasy-dark-card",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2 before:right-full before:top-1/2 before:-translate-y-1/2 before:border-r-fantasy-dark-card",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 px-3 py-2 text-sm text-white bg-fantasy-dark-card border border-fantasy-purple/50 rounded-md shadow-lg",
            "min-w-[200px] max-w-[300px]",
            "pointer-events-none",
            positionClasses[position],
            "before:content-[''] before:absolute before:border-4 before:border-transparent",
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

