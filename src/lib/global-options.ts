export const globalCountries = [
  { code: 'NG', label: 'Nigeria' },
  { code: 'GH', label: 'Ghana' },
  { code: 'KE', label: 'Kenya' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'SZ', label: 'Eswatini' },
  { code: 'BW', label: 'Botswana' },
  { code: 'LR', label: 'Liberia' },
  { code: 'GM', label: 'Gambia' },
  { code: 'GA', label: 'Gabon' },
  { code: 'GQ', label: 'Equatorial Guinea' },
  { code: 'CM', label: 'Cameroon' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'CV', label: 'Cabo Verde' },
  { code: 'BJ', label: 'Benin' },
  { code: 'TG', label: 'Togo' },
  { code: 'ZW', label: 'Zimbabwe' },
  { code: 'MW', label: 'Malawi' },
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'United States' },
  { code: 'NE', label: 'Niger' },
  { code: 'CG', label: 'Republic of the Congo' },
  { code: 'SS', label: 'South Sudan' },
  { code: 'ET', label: 'Ethiopia' },
  { code: 'GE', label: 'Georgia' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'PH', label: 'Philippines' },
  { code: 'VE', label: 'Venezuela' },
  { code: 'MX', label: 'Mexico' },
  { code: 'BR', label: 'Brazil' },
  { code: 'SN', label: 'Senegal' },
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'BI', label: 'Burundi' },
];

export const globalCurrencies = [
  'NGN', 'GHS', 'KES', 'RWF', 'ZAR', 'SZL', 'BWP', 'LRD', 'GMD', 'XAF',
  'XOF', 'CVE', 'ZWG', 'MWK', 'CAD', 'USD', 'SSP', 'ETB', 'GEL', 'GBP',
  'PHP', 'VES', 'MXN', 'BRL', 'BIF',
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
  SZ: 'SZL', BW: 'BWP', LR: 'LRD', GM: 'GMD', GA: 'XAF', GQ: 'XAF', CM: 'XAF',
  CI: 'XOF', CV: 'CVE', BJ: 'XOF', TG: 'XOF', ZW: 'ZWG', MW: 'MWK', NE: 'XOF',
  CG: 'XAF', SS: 'SSP', ET: 'ETB', GE: 'GEL', VE: 'VES', SN: 'XOF', BF: 'XOF', BI: 'BIF',
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
