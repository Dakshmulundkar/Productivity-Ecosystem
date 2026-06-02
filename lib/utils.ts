import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips 'undefined' values from an object recursively.
 * Firestore does not support 'undefined' and will crash if it finds one.
 */
export function cleanFirestoreData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => (v && typeof v === 'object') ? cleanFirestoreData(v) : v);
  }
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value === undefined) return;
    if (value && typeof value === "object" && !(value instanceof Date)) {
      clean[key] = cleanFirestoreData(value);
    } else {
      clean[key] = value;
    }
  });
  return clean;
}
