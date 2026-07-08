export const globalCountries = [
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'AR', label: 'Argentina' },
  { code: 'AT', label: 'Austria' },
  { code: 'AU', label: 'Australia' },
  { code: 'BE', label: 'Belgium' },
  { code: 'BR', label: 'Brazil' },
  { code: 'CA', label: 'Canada' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'CN', label: 'China' },
  { code: 'DE', label: 'Germany' },
  { code: 'DK', label: 'Denmark' },
  { code: 'EG', label: 'Egypt' },
  { code: 'ES', label: 'Spain' },
  { code: 'FI', label: 'Finland' },
  { code: 'FR', label: 'France' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'GH', label: 'Ghana' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'IE', label: 'Ireland' },
  { code: 'IN', label: 'India' },
  { code: 'IT', label: 'Italy' },
  { code: 'JP', label: 'Japan' },
  { code: 'KE', label: 'Kenya' },
  { code: 'MX', label: 'Mexico' },
  { code: 'MY', label: 'Malaysia' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'NO', label: 'Norway' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'PH', label: 'Philippines' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'SE', label: 'Sweden' },
  { code: 'SG', label: 'Singapore' },
  { code: 'TR', label: 'Turkey' },
  { code: 'UG', label: 'Uganda' },
  { code: 'US', label: 'United States' },
  { code: 'ZA', label: 'South Africa' },
];

export const globalCurrencies = [
  'AED',
  'ARS',
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'DKK',
  'EGP',
  'EUR',
  'GBP',
  'GHS',
  'HKD',
  'INR',
  'JPY',
  'KES',
  'MXN',
  'MYR',
  'NGN',
  'NOK',
  'NZD',
  'PHP',
  'PKR',
  'PLN',
  'RWF',
  'SAR',
  'SEK',
  'SGD',
  'TRY',
  'UGX',
  'USD',
  'ZAR',
];

export const currencySymbols: Record<string, string> = {
  AED: 'د.إ',
  ARS: 'ARS ',
  AUD: 'A$',
  BRL: 'R$',
  CAD: 'CA$',
  CHF: 'CHF ',
  CNY: '¥',
  DKK: 'kr ',
  EGP: 'E£',
  EUR: '€',
  GBP: '£',
  GHS: 'GH₵',
  HKD: 'HK$',
  INR: '₹',
  JPY: '¥',
  KES: 'KSh',
  MXN: 'MX$',
  MYR: 'RM',
  NGN: '₦',
  NOK: 'kr ',
  NZD: 'NZ$',
  PHP: '₱',
  PKR: 'Rs ',
  PLN: 'zł',
  RWF: 'RF ',
  SAR: '﷼',
  SEK: 'kr ',
  SGD: 'S$',
  TRY: '₺',
  UGX: 'USh ',
  USD: '$',
  ZAR: 'R',
};

const countryCurrency: Record<string, string> = {
  AE: 'AED',
  AR: 'ARS',
  AT: 'EUR',
  AU: 'AUD',
  BE: 'EUR',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CN: 'CNY',
  DE: 'EUR',
  DK: 'DKK',
  EG: 'EGP',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  GH: 'GHS',
  HK: 'HKD',
  IE: 'EUR',
  IN: 'INR',
  IT: 'EUR',
  JP: 'JPY',
  KE: 'KES',
  MX: 'MXN',
  MY: 'MYR',
  NG: 'NGN',
  NL: 'EUR',
  NO: 'NOK',
  NZ: 'NZD',
  PH: 'PHP',
  PK: 'PKR',
  PL: 'PLN',
  PT: 'EUR',
  RW: 'RWF',
  SA: 'SAR',
  SE: 'SEK',
  SG: 'SGD',
  TR: 'TRY',
  UG: 'UGX',
  US: 'USD',
  ZA: 'ZAR',
};

const dialCountryDefaults: Record<string, string> = {
  '+1': 'US',
  '+20': 'EG',
  '+27': 'ZA',
  '+33': 'FR',
  '+34': 'ES',
  '+39': 'IT',
  '+41': 'CH',
  '+44': 'GB',
  '+49': 'DE',
  '+52': 'MX',
  '+55': 'BR',
  '+60': 'MY',
  '+61': 'AU',
  '+63': 'PH',
  '+65': 'SG',
  '+81': 'JP',
  '+86': 'CN',
  '+90': 'TR',
  '+91': 'IN',
  '+92': 'PK',
  '+971': 'AE',
  '+233': 'GH',
  '+234': 'NG',
  '+250': 'RW',
  '+254': 'KE',
  '+256': 'UG',
};

const countryNameToCode = globalCountries.reduce<Record<string, string>>((map, country) => {
  map[country.label.toLowerCase()] = country.code;
  return map;
}, {});

export function normalizeCurrency(value: unknown, fallback = 'GBP') {
  const currency = String(value || '').trim().toUpperCase();
  return globalCurrencies.includes(currency) ? currency : fallback;
}

export function currencyForCountryCode(countryCode: unknown, fallback = 'GBP') {
  const code = String(countryCode || '').trim().toUpperCase();
  return normalizeCurrency(countryCurrency[code], fallback);
}

export function countryCodeFromPhoneOption(label: string, dialCode: string, fallback = 'GB') {
  const countryName = label.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
  if (countryNameToCode[countryName]) return countryNameToCode[countryName];
  return dialCountryDefaults[String(dialCode || '').trim()] || fallback;
}

export function currencyForPhoneOption(label: string, dialCode: string, fallback = 'GBP') {
  return currencyForCountryCode(countryCodeFromPhoneOption(label, dialCode), fallback);
}

export function formatMoney(value: number | string | undefined, currency = 'GBP') {
  const amount = Number(value || 0);
  const code = normalizeCurrency(currency, currency.toUpperCase());
  const prefix = currencySymbols[code] || `${code} `;
  return `${prefix}${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;
}
