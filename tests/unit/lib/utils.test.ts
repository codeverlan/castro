import { describe, it, expect } from 'vitest';
import { cn } from '~/lib/utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz');
      expect(result).toBe('foo baz');
    });

    it('should handle undefined and null values', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle empty strings', () => {
      const result = cn('foo', '', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle arrays of class names', () => {
      const result = cn(['foo', 'bar'], 'baz');
      expect(result).toBe('foo bar baz');
    });

    it('should handle arrays with conditional classes', () => {
      const result = cn(['foo', true && 'bar', false && 'baz']);
      expect(result).toBe('foo bar');
    });

    it('should handle objects with boolean values', () => {
      const result = cn({
        foo: true,
        bar: false,
        baz: true,
      });
      expect(result).toBe('foo baz');
    });

    it('should handle nested class names', () => {
      const result = cn('foo', 'bar', {
        baz: true,
        qux: false,
      });
      expect(result).toBe('foo bar baz');
    });

    it('should handle Tailwind conflicts with tailwind-merge', () => {
      const result = cn('px-4', 'px-8');
      expect(result).toBe('px-8'); // Later class should override
    });

    it('should handle complex Tailwind class conflicts', () => {
      const result = cn('bg-red-500 hover:bg-red-600', 'bg-blue-500');
      // tailwind-merge keeps the order: modifiers come before base classes
      expect(result).toBe('hover:bg-red-600 bg-blue-500');
    });

    it('should handle multiple conflicting classes', () => {
      const result = cn(
        'p-4 m-4 text-sm',
        'p-8 text-lg',
        'm-2'
      );
      // tailwind-merge preserves order: p-8, text-lg, then m-2
      expect(result).toBe('p-8 text-lg m-2');
    });

    it('should handle responsive prefix conflicts', () => {
      const result = cn('md:px-4', 'md:px-8', 'px-2');
      expect(result).toBe('md:px-8 px-2');
    });

    it('should handle arbitrary value conflicts', () => {
      const result = cn('w-[100px]', 'w-[200px]');
      expect(result).toBe('w-[200px]');
    });

    it('should return empty string for no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should return empty string for empty array', () => {
      const result = cn([]);
      expect(result).toBe('');
    });

    it('should return empty string for empty object', () => {
      const result = cn({});
      expect(result).toBe('');
    });

    it('should handle mixed input types', () => {
      const isActive = true;
      const result = cn(
        'base-class',
        ['array-class-1', 'array-class-2'],
        {
          'conditional-class': isActive,
          'another-conditional': !isActive,
        },
        undefined,
        null,
        '',
        false && 'removed-class'
      );
      expect(result).toBe('base-class array-class-1 array-class-2 conditional-class');
    });

    it('should handle duplicate class names', () => {
      const result = cn('foo', 'foo', 'bar');
      // clsx/tailwind-merge keeps duplicates if they're not conflicting Tailwind classes
      expect(result).toBe('foo foo bar');
    });

    it('should handle class names with spaces', () => {
      const result = cn('foo bar', 'baz qux');
      expect(result).toBe('foo bar baz qux');
    });

    it('should handle dark mode variants', () => {
      const result = cn('bg-white dark:bg-gray-900', 'dark:bg-gray-800');
      expect(result).toBe('bg-white dark:bg-gray-800');
    });

    it('should handle focus variants', () => {
      const result = cn('ring-2 focus:ring-blue-500', 'focus:ring-red-500');
      expect(result).toBe('ring-2 focus:ring-red-500');
    });

    it('should handle multiple modifiers', () => {
      const result = cn(
        'hover:focus:ring-2',
        'hover:focus:ring-blue-500',
        'dark:hover:focus:ring-blue-600'
      );
      // tailwind-merge keeps all three: different modifier combinations
      expect(result).toBe('hover:focus:ring-2 hover:focus:ring-blue-500 dark:hover:focus:ring-blue-600');
    });

    it('should handle real-world component classes', () => {
      const isDisabled = false;
      const isLoading = false;
      const result = cn(
        'inline-flex items-center justify-center',
        'rounded-md text-sm font-medium',
        'transition-colors focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        isDisabled && 'opacity-50 cursor-not-allowed',
        isLoading && 'animate-pulse'
      );
      expect(result).toContain('inline-flex');
      expect(result).toContain('items-center');
      expect(result).toContain('justify-center');
      expect(result).toContain('rounded-md');
      expect(result).toContain('bg-primary');
      expect(result).toContain('hover:bg-primary/90');
      // disabled:opacity-50 is present even though isDisabled is false
      // because it's a variant class that doesn't conflict
      expect(result).toContain('disabled:opacity-50');
      expect(result).not.toContain('animate-pulse');
    });

    it('should handle spacing and layout conflicts', () => {
      const result = cn(
        'flex flex-col space-y-2',
        'flex-row space-x-4'
      );
      // tailwind-merge resolves flex-col vs flex-row, but keeps both spacing utilities
      expect(result).toBe('flex space-y-2 flex-row space-x-4');
    });

    it('should handle text size conflicts', () => {
      const result = cn('text-sm', 'text-lg', 'text-base');
      expect(result).toBe('text-base');
    });

    it('should handle color conflicts with different utilities', () => {
      const result = cn(
        'text-red-500 bg-blue-500',
        'text-green-500 bg-yellow-500'
      );
      expect(result).toBe('text-green-500 bg-yellow-500');
    });

    it('should handle arbitrary variants correctly', () => {
      const result = cn(
        '[&>*]:p-4',
        '[&>div]:bg-red-500'
      );
      expect(result).toBe('[&>*]:p-4 [&>div]:bg-red-500');
    });
  });
});
