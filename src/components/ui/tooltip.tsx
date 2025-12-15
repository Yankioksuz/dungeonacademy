import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, className, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Calculate generic anchor point (center of the trigger element)
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Adjust based on position prop
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - 10; // 10px gap/margin
          left = centerX;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          left = centerX;
          break;
        case 'left':
          top = centerY;
          left = rect.left - 10;
          break;
        case 'right':
          top = centerY;
          left = rect.right + 10;
          break;
      }

      setCoords({ top, left });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Hide on scroll to prevent floating detached tooltips
  React.useEffect(() => {
    if (isVisible) {
      const handleScroll = () => setIsVisible(false);
      window.addEventListener('scroll', handleScroll, { capture: true });
      return () => window.removeEventListener('scroll', handleScroll, { capture: true });
    }
  }, [isVisible]);

  // CSS transforms to align the tooltip relative to the coordinate
  const transformMap = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  // Arrow classes preserved, but positioned relative to the tooltip box
  const arrowClasses = {
    top: "before:top-full before:left-1/2 before:-translate-x-1/2 before:border-t-fantasy-dark-card",
    bottom: "before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-b-fantasy-dark-card",
    left: "before:left-full before:top-1/2 before:-translate-y-1/2 before:border-l-fantasy-dark-card",
    right: "before:right-full before:top-1/2 before:-translate-y-1/2 before:border-r-fantasy-dark-card",
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className={cn(
            "fixed z-[9999] px-3 py-2 text-sm text-white bg-fantasy-dark-card border border-fantasy-purple/50 rounded-md shadow-lg",
            "min-w-[200px] max-w-[300px]",
            "pointer-events-none",
            arrowClasses[position],
            "before:content-[''] before:absolute before:border-4 before:border-transparent",
            className
          )}
          style={{
            top: coords.top,
            left: coords.left,
            transform: transformMap[position],
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}

