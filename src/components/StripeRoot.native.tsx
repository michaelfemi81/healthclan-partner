import type { ReactNode } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export function StripeRoot({ children }: { children: ReactNode }) {
  if (!stripePublishableKey) {
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.healthclan.partner"
      urlScheme="healthclanpartner"
    >
      <>{children}</>
    </StripeProvider>
  );
}
