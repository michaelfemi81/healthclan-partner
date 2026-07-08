type StripeCardPayload = {
  cardholderName: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  billingPostalCode?: string;
};

function stripeKey() {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

  if (!key) {
    throw new Error('Stripe publishable key is missing. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to the app environment.');
  }

  return key;
}

function formBody(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString();
}

async function stripeRequest<T>(path: string, body: Record<string, string | number | undefined>) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message || 'Stripe could not verify this card.');
  }

  return payload as T;
}

export async function createStripeCardPaymentMethod(card: StripeCardPayload) {
  return stripeRequest<{ id: string; card?: { brand?: string; last4?: string } }>('/payment_methods', {
    type: 'card',
    'card[number]': card.cardNumber.replace(/\D/g, ''),
    'card[exp_month]': card.expMonth,
    'card[exp_year]': card.expYear,
    'card[cvc]': card.cvc,
    'billing_details[name]': card.cardholderName.trim(),
    'billing_details[address][postal_code]': card.billingPostalCode?.trim(),
  });
}

export async function confirmStripeSetupIntent({
  setupIntentId,
  clientSecret,
  paymentMethodId,
}: {
  setupIntentId: string;
  clientSecret: string;
  paymentMethodId: string;
}) {
  return stripeRequest<{ id: string; status: string; payment_method?: string }>(`/setup_intents/${setupIntentId}/confirm`, {
    client_secret: clientSecret,
    payment_method: paymentMethodId,
  });
}
