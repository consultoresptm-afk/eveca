import { type ClassValue } from 'clsx';

// Simple fallback version of cn since modern Tailwind doesn't need complex overrides, 
// or simple string concatenation if clsx is not wanted, but we list cn for standard use.
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ');
}
