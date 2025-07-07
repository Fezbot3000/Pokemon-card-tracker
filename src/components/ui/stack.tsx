import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const stackVariants = cva(
  'flex',
  {
    variants: {
      direction: {
        row: 'flex-row',
        column: 'flex-col',
        'row-reverse': 'flex-row-reverse',
        'column-reverse': 'flex-col-reverse',
      },
      align: {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      },
      justify: {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
        evenly: 'justify-evenly',
      },
      gap: {
        0: 'gap-0',
        1: 'gap-1',
        2: 'gap-2',
        3: 'gap-3',
        4: 'gap-4',
        5: 'gap-5',
        6: 'gap-6',
        7: 'gap-7',
        8: 'gap-8',
        9: 'gap-9',
        10: 'gap-10',
        11: 'gap-11',
        12: 'gap-12',
        px: 'gap-px',
      },
      wrap: {
        nowrap: 'flex-nowrap',
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
      },
    },
    defaultVariants: {
      direction: 'column',
      align: 'stretch',
      justify: 'start',
      gap: 4,
      wrap: 'nowrap',
    },
  }
);

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  as?: React.ElementType;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, align, justify, gap, wrap, as: Component = 'div', ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(stackVariants({ direction, align, justify, gap, wrap, className }))}
      {...props}
    />
  )
);

Stack.displayName = 'Stack';

// Convenient aliases for common patterns
const HStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  ({ ...props }, ref) => (
    <Stack ref={ref} direction="row" {...props} />
  )
);

HStack.displayName = 'HStack';

const VStack = React.forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>(
  ({ ...props }, ref) => (
    <Stack ref={ref} direction="column" {...props} />
  )
);

VStack.displayName = 'VStack';

export { Stack, HStack, VStack, stackVariants }; 