export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function parseDob(value: string) {
  const [day, month, year] = value.split(/[/-]/).map(part => Number(part));

  if (!day || !month || !year) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getTime() < Date.now();

  return valid ? date.toISOString() : null;
}

export function isAllowedVerificationFile(type: string, name: string) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const allowedExtensions = /\.(jpe?g|png|webp|pdf)$/i;

  return allowedTypes.includes(type) || allowedExtensions.test(name);
}

export function isValidCardExpiry(value: string) {
  if (!/^\d{2}\/\d{2}$/.test(value)) return false;

  const month = Number(value.slice(0, 2));
  const year = Number(`20${value.slice(3)}`);
  if (month < 1 || month > 12) return false;

  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth > new Date();
}
