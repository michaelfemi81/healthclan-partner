import { createElement, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStripeCardField, useNativeSetupIntent } from './NativeStripeCardField';
import { partnerApi } from '../lib/api';

const grad1 = '#085161';
const fieldBg = '#E9F6FE';
const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => any;
  }
}

let stripeScriptPromise: Promise<void> | null = null;

function loadStripeJs() {
  if (Platform.OS !== 'web') {
    return Promise.reject(new Error('Card entry is unavailable on this device.'));
  }

  if (typeof window !== 'undefined' && window.Stripe) return Promise.resolve();

  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');

      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Unable to load secure card entry.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load secure card entry.'));
      document.body.appendChild(script);
    });
  }

  return stripeScriptPromise;
}

function cardErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/stripe|payment processor|native|sdk|ioexception|unable to resolve host/i.test(message)) {
    return 'Unable to save this card right now. Please try again shortly.';
  }
  return message || 'Unable to save card.';
}

export function CardEntryForm({
  onSaved,
  onMessage,
  buttonTitle = 'Save card',
}: {
  onSaved?: (card: any) => void;
  onMessage?: (message: string) => void;
  buttonTitle?: string;
}) {
  const confirmNativeSetupIntent = useNativeSetupIntent();
  const stripeContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<any>(null);
  const cardElementRef = useRef<any>(null);
  const [name, setName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [message, setMessage] = useState('');
  const [stripeReady, setStripeReady] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [nativeCardComplete, setNativeCardComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  const notify = (nextMessage: string) => {
    setMessage(nextMessage);
    onMessage?.(nextMessage);
  };

  useEffect(() => {
    let active = true;

    async function mountStripeElement() {
      if (!stripePublishableKey) {
        notify('Card payments are not available yet.');
        return;
      }

      if (Platform.OS !== 'web') return;

      try {
        await loadStripeJs();
        if (!active || !window.Stripe || !stripeContainerRef.current) return;

        const stripe = window.Stripe(stripePublishableKey);
        const elements = stripe.elements();
        const cardElement = elements.create('card', {
          hidePostalCode: true,
          style: {
            base: {
              color: '#252525',
              fontFamily: 'Poppins, Arial, sans-serif',
              fontSize: '15px',
              fontWeight: '700',
              '::placeholder': { color: '#7F98A0' },
            },
            invalid: { color: '#B42318' },
          },
        });

        cardElement.mount(stripeContainerRef.current);
        cardElement.on('change', (event: any) => {
          setCardComplete(Boolean(event.complete));
          if (event.error?.message) notify(event.error.message);
          if (!event.error && event.complete) notify('');
        });

        stripeRef.current = stripe;
        cardElementRef.current = cardElement;
        setStripeReady(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Unable to load secure card entry.');
      }
    }

    mountStripeElement();

    return () => {
      active = false;
      cardElementRef.current?.destroy?.();
      cardElementRef.current = null;
      stripeRef.current = null;
    };
  }, []);

  async function saveCard() {
    if (loading) return;

    notify('');

    if (name.trim().length < 3) {
      notify('Enter the cardholder name.');
      return;
    }

    if (postalCode.trim().length < 3) {
      notify('Enter the billing postcode.');
      return;
    }

    if (!stripePublishableKey) {
      notify('Card payments are not available yet.');
      return;
    }

    if (Platform.OS === 'web' && (!stripeReady || !stripeRef.current || !cardElementRef.current || !cardComplete)) {
      notify('Enter complete card details.');
      return;
    }

    if (Platform.OS !== 'web' && !nativeCardComplete) {
      notify('Enter complete card details.');
      return;
    }

    setLoading(true);

    try {
      notify('Preparing secure card setup...');
      const setupIntent = await partnerApi.createCardSetupIntent();

      if (!setupIntent.setupIntentId || !setupIntent.clientSecret) {
        throw new Error('Unable to start secure card setup.');
      }

      notify('Checking card securely...');
      let paymentMethodId = '';

      if (Platform.OS === 'web') {
        const result = await stripeRef.current.confirmCardSetup(setupIntent.clientSecret, {
          payment_method: {
            card: cardElementRef.current,
            billing_details: {
              name: name.trim(),
              address: { postal_code: postalCode.trim() },
            },
          },
        });

        if (result.error) {
          throw new Error('This card could not be verified. Please check the details and try again.');
        }

        paymentMethodId = String(result.setupIntent?.payment_method || '');

        if (!paymentMethodId || result.setupIntent?.status !== 'succeeded') {
          throw new Error('This card could not be verified. Please try another card.');
        }
      } else {
        const result = await confirmNativeSetupIntent(setupIntent.clientSecret, {
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {
              name: name.trim(),
              address: { postalCode: postalCode.trim() },
            },
          },
        });

        if (result.error) {
          throw new Error('This card could not be verified. Please check the details and try again.');
        }

        const nativeSetupIntent: any = result.setupIntent;
        paymentMethodId = String(nativeSetupIntent?.paymentMethodId || nativeSetupIntent?.paymentMethod?.id || '');

        if (!paymentMethodId || nativeSetupIntent?.status !== 'Succeeded') {
          throw new Error('This card could not be verified. Please try another card.');
        }
      }

      notify('Saving card to HealthClan...');
      const card = await partnerApi.saveCard({
        providerPaymentMethodId: paymentMethodId,
        setupIntentId: setupIntent.setupIntentId,
        isDefault: saveAsDefault,
      });

      setName('');
      setPostalCode('');
      setCardComplete(false);
      setNativeCardComplete(false);
      cardElementRef.current?.clear?.();
      notify('Card verified and saved.');
      onSaved?.(card);
    } catch (error) {
      notify(cardErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        <View>
          <Text style={styles.previewBrand}>Payment card</Text>
          <Text style={styles.previewNumber}>Your card details are protected</Text>
        </View>
        <Text style={styles.previewName}>{name || 'Cardholder name'}</Text>
      </View>

      <Field label="Cardholder name" value={name} onChangeText={setName} placeholder="Name on card" />
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Card details</Text>
        {Platform.OS === 'web' ? (
          createElement('div', {
            ref: stripeContainerRef,
            style: stripeElementStyle,
          })
        ) : (
          <NativeStripeCardField
            onCompleteChange={(complete) => {
              setNativeCardComplete(complete);
              if (complete) notify('');
            }}
          />
        )}
      </View>
      <Field label="Billing ZIP / postcode" value={postalCode} onChangeText={setPostalCode} placeholder="Billing postcode" />

      <Pressable style={styles.checkRow} onPress={() => setSaveAsDefault(current => !current)}>
        <View style={[styles.checkbox, saveAsDefault && styles.checkboxOn]}>
          {saveAsDefault ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.checkText}>Save as default payment method</Text>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={saveCard} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : null}
        <Text style={styles.buttonText}>{loading ? 'Saving securely...' : buttonTitle}</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7F98A0"
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const stripeElementStyle = {
  minHeight: 52,
  borderRadius: 14,
  backgroundColor: fieldBg,
  padding: '17px 14px',
  boxSizing: 'border-box',
  border: '1px solid rgba(8,81,97,0.08)',
} as const;

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  preview: { minHeight: 138, borderRadius: 16, backgroundColor: grad1, padding: 16, justifyContent: 'space-between' },
  previewBrand: { color: '#fff', fontSize: 15, fontWeight: '900' },
  previewNumber: { color: '#fff', fontSize: 20, lineHeight: 26, fontWeight: '900', marginTop: 22 },
  previewName: { color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  fieldBlock: { width: '100%' },
  label: { color: grad1, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 52, borderRadius: 14, backgroundColor: fieldBg, color: '#252525', fontSize: 14, fontWeight: '800', paddingHorizontal: 12, outlineStyle: 'none' as any },
  checkRow: { minHeight: 46, borderRadius: 14, backgroundColor: fieldBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, borderColor: grad1, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: grad1 },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  checkText: { color: '#252525', fontSize: 13, fontWeight: '800' },
  message: { color: '#B36B00', fontSize: 12, lineHeight: 18, fontWeight: '900', textAlign: 'center' },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
