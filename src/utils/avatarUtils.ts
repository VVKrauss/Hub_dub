// utils/avatarUtils.ts

export const AVAILABLE_AVATARS = Array.from({ length: 90 }, (_, i) => `${i + 1}.png`);

export const BASE_AVATAR_URL = 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/avatars/';

/**
 * Получить URL случайного аватара
 */
export const getRandomAvatarUrl = (): string => {
  const randomNumber = Math.floor(Math.random() * 90) + 1;
  return BASE_AVATAR_URL + `${randomNumber}.png`;
};

/**
 * Получить полный URL аватара по номеру
 */
export const getAvatarUrl = (avatarNumber: number): string => {
  return BASE_AVATAR_URL + `${avatarNumber}.png`;
};

/**
 * Проверить, является ли URL валидным аватаром из нашей коллекции
 */
export const isValidAvatarUrl = (url: string): boolean => {
  if (!url.startsWith(BASE_AVATAR_URL)) return false;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  const match = fileName.match(/^(\d+)\.png$/);
  
  if (!match) return false;
  
  const number = parseInt(match[1]);
  return number >= 1 && number <= 90;
};

/**
 * Получить номер аватара из полного URL
 */
export const getAvatarNumber = (url: string): number | null => {
  if (!url.startsWith(BASE_AVATAR_URL)) return null;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  const match = fileName.match(/^(\d+)\.png$/);
  
  return match ? parseInt(match[1]) : null;
};

/**
 * Получить все доступные URL аватаров
 */
export const getAllAvatarUrls = (): string[] => {
  return AVAILABLE_AVATARS.map(avatar => BASE_AVATAR_URL + avatar);
};// utils/avatarUtils.ts

export const AVAILABLE_AVATARS = Array.from({ length: 90 }, (_, i) => `${i + 1}.png`);

export const BASE_AVATAR_URL = 'https://jfvinriqydjtwsmayxix.supabase.co/storage/v1/object/public/images/avatars/';

/**
 * Получить URL случайного аватара
 */
export const getRandomAvatarUrl = (): string => {
  const randomNumber = Math.floor(Math.random() * 90) + 1;
  return BASE_AVATAR_URL + `${randomNumber}.png`;
};

/**
 * Получить полный URL аватара по номеру
 */
export const getAvatarUrl = (avatarNumber: number): string => {
  return BASE_AVATAR_URL + `${avatarNumber}.png`;
};

/**
 * Проверить, является ли URL валидным аватаром из нашей коллекции
 */
export const isValidAvatarUrl = (url: string): boolean => {
  if (!url.startsWith(BASE_AVATAR_URL)) return false;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  const match = fileName.match(/^(\d+)\.png$/);
  
  if (!match) return false;
  
  const number = parseInt(match[1]);
  return number >= 1 && number <= 90;
};

/**
 * Получить номер аватара из полного URL
 */
export const getAvatarNumber = (url: string): number | null => {
  if (!url.startsWith(BASE_AVATAR_URL)) return null;
  
  const fileName = url.replace(BASE_AVATAR_URL, '');
  const match = fileName.match(/^(\d+)\.png$/);
  
  return match ? parseInt(match[1]) : null;
};

/**
 * Получить все доступные URL аватаров
 */
export const getAllAvatarUrls = (): string[] => {
  return AVAILABLE_AVATARS.map(avatar => BASE_AVATAR_URL + avatar);
};