export const countWords = (text: string): number => {
  const normalized = text.replace(/[\u2014\u2013]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;
  return normalized.split(' ').length;
};
