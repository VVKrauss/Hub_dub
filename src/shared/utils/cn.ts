// src/shared/utils/cn.ts
import { type ClassValue, clsx } from 'clsx';

/**
 * Утилита для объединения CSS классов с поддержкой условной логики
 * Использует clsx для гибкого объединения классов
 * 
 * @param inputs - Массив классов, объектов или условных выражений
 * @returns Строка с объединенными классами
 * 
 * @example
 * cn('base-class', condition && 'conditional-class', { 'active': isActive })
 * cn('px-4 py-2', variant === 'primary' && 'bg-blue-500', { 'opacity-50': disabled })
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}