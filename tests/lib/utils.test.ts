import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Lib: Utils', () => {
    describe('cn (className merge)', () => {
        it('should merge multiple class names', () => {
            const result = cn('class1', 'class2', 'class3');
            expect(result).toBe('class1 class2 class3');
        });

        it('should handle conditional classes', () => {
            const isActive = true;
            const isDisabled = false;

            const result = cn(
                'base-class',
                isActive && 'active',
                isDisabled && 'disabled'
            );

            expect(result).toContain('base-class');
            expect(result).toContain('active');
            expect(result).not.toContain('disabled');
            expect(result).not.toContain('false');
        });

        it('should merge Tailwind conflicting classes correctly', () => {
            // tailwind-merge should resolve conflicts
            const result = cn('px-2', 'px-4');
            expect(result).toBe('px-4'); // Later class should win
        });

        it('should handle array of classes', () => {
            const result = cn(['class1', 'class2']);
            expect(result).toBe('class1 class2');
        });

        it('should handle object syntax', () => {
            const result = cn({
                'active': true,
                'disabled': false,
                'visible': true,
            });
            expect(result).toContain('active');
            expect(result).toContain('visible');
            expect(result).not.toContain('disabled');
        });

        it('should handle undefined and null values', () => {
            const result = cn('class1', undefined, null, 'class2');
            expect(result).toBe('class1 class2');
        });

        it('should handle empty inputs', () => {
            const result = cn();
            expect(result).toBe('');
        });

        it('should handle empty string', () => {
            const result = cn('', 'class1', '');
            expect(result).toBe('class1');
        });

        it('should merge responsive Tailwind classes', () => {
            const result = cn('text-sm', 'md:text-lg', 'lg:text-xl');
            expect(result).toContain('text-sm');
            expect(result).toContain('md:text-lg');
            expect(result).toContain('lg:text-xl');
        });

        it('should handle complex Tailwind patterns', () => {
            const result = cn(
                'bg-red-500',
                'hover:bg-blue-500',
                'focus:ring-2',
                'dark:bg-gray-800'
            );
            expect(result).toContain('bg-red-500');
            expect(result).toContain('hover:bg-blue-500');
            expect(result).toContain('focus:ring-2');
            expect(result).toContain('dark:bg-gray-800');
        });

        it('should resolve Tailwind spacing conflicts', () => {
            const result = cn('m-2', 'm-4');
            expect(result).toBe('m-4');
        });

        it('should resolve Tailwind color conflicts', () => {
            const result = cn('bg-red-500', 'bg-blue-500');
            expect(result).toBe('bg-blue-500');
        });

        it('should not conflict different Tailwind properties', () => {
            const result = cn('p-2', 'm-4');
            expect(result).toContain('p-2');
            expect(result).toContain('m-4');
        });
    });
});
