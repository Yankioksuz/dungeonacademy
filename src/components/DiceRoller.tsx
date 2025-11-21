import { useState, useEffect } from 'react';
import { Dice6, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiceRollerProps {
  isRolling: boolean;
  result: number | null;
  onRollComplete?: (result: number) => void;
  sides?: number;
}

export function DiceRoller({ isRolling, result, onRollComplete, sides = 20 }: DiceRollerProps) {
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (isRolling) {
      // Use setTimeout to avoid synchronous state update in effect
      const startTimeout = setTimeout(() => {
        setAnimating(true);
        setDisplayNumber(null);
        setShowParticles(false);
      }, 0);

      // Animate random numbers rapidly
      const interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * sides) + 1);
      }, 50);

      // Stop animation and show result
      setTimeout(() => {
        clearInterval(interval);
        setDisplayNumber(result);
        setAnimating(false);

        // Show particles for critical rolls
        if (result === 20 || result === 1) {
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 2000);
        }

        if (onRollComplete && result !== null) {
          onRollComplete(result);
        }
      }, 1500);

      return () => {
        clearTimeout(startTimeout);
        clearInterval(interval);
      };
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setDisplayNumber(result);
        setAnimating(false);
      }, 0);
    }
  }, [isRolling, result, onRollComplete, sides]);

  const getDiceColor = () => {
    if (!result || animating) return 'border-fantasy-purple/50';
    if (result === 20) return 'text-fantasy-gold border-fantasy-gold bg-fantasy-gold/20 shadow-[0_0_30px_rgba(255,215,0,0.6)]';
    if (result === 1) return 'text-red-500 border-red-500 bg-red-900/20 shadow-[0_0_30px_rgba(239,68,68,0.6)]';
    if (result >= 15) return 'text-green-400 border-green-400 bg-green-900/20 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
    if (result <= 5) return 'text-orange-400 border-orange-400 bg-orange-900/20';
    return 'text-blue-400 border-blue-400 bg-blue-900/20';
  };

  const getDiceAnimation = () => {
    if (!animating) return '';
    return 'animate-[tumble_1.5s_ease-in-out]';
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      {/* Particle effects for critical rolls */}
      {showParticles && result === 20 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-fantasy-gold animate-ping"
              style={{
                left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 60}%`,
                top: `${50 + Math.sin(i * 30 * Math.PI / 180) * 60}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      )}

      {/* The Dice */}
      <div
        className={cn(
          'relative w-40 h-40 rounded-2xl border-4 flex items-center justify-center transition-all duration-500',
          'bg-gradient-to-br from-fantasy-dark-card via-fantasy-dark-bg to-fantasy-dark-card',
          'shadow-2xl',
          getDiceAnimation(),
          getDiceColor(),
          !animating && result && 'scale-110'
        )}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        }}
      >
        {/* Dice face */}
        {displayNumber !== null ? (
          <div className={cn(
            "flex flex-col items-center transition-all duration-300",
            !animating && "animate-in zoom-in-50 duration-500"
          )}>
            <span className={cn(
              "font-bold transition-all duration-300",
              animating ? "text-5xl opacity-70" : "text-7xl"
            )}>
              {displayNumber}
            </span>
            <span className="text-xs opacity-70 mt-1">d{sides}</span>
          </div>
        ) : (
          <Dice6 className={cn(
            "h-20 w-20 opacity-50 transition-all",
            animating && "animate-pulse"
          )} />
        )}

        {/* Glow effect for high rolls */}
        {!animating && result && result >= 15 && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-white/5 to-transparent animate-pulse" />
        )}
      </div>

      {/* Result text */}
      {result === 20 && !animating && (
        <div className="text-fantasy-gold font-bold text-xl animate-bounce flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          CRITICAL SUCCESS!
          <Sparkles className="h-5 w-5" />
        </div>
      )}
      {result === 1 && !animating && (
        <div className="text-red-500 font-bold text-xl animate-bounce">
          💀 CRITICAL FAILURE! 💀
        </div>
      )}
      {result && result >= 15 && result < 20 && !animating && (
        <div className="text-green-400 font-semibold text-lg">
          Great Roll! ✨
        </div>
      )}
      {result && result <= 5 && result > 1 && !animating && (
        <div className="text-orange-400 font-semibold text-lg">
          Rough Roll... 😬
        </div>
      )}
    </div>
  );
}

