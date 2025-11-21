import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

export const RadioGroup = RadixRadioGroup.Root;

export const RadioGroupItem = ({ className, ...props }: RadixRadioGroup.RadioGroupItemProps) => (
  <RadixRadioGroup.Item
    className={cn(
      'h-10 w-10 rounded-full border border-fantasy-purple/40 bg-fantasy-dark-surface flex items-center justify-center text-sm font-semibold text-foreground',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-fantasy-purple data-[state=checked]:bg-fantasy-purple data-[state=checked]:text-white',
      className
    )}
    {...props}
  />
);
