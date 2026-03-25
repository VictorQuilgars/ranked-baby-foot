// sans I, O, 0, 1 pour éviter les confusions visuelles
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateMatchCode(): string {
  return Array.from(
    { length: 6 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}
