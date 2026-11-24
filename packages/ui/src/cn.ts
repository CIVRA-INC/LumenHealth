import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach the merger our custom font sizes so `text-md` / `text-2xs` are not mistaken for colours.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['md', '2xs'] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
