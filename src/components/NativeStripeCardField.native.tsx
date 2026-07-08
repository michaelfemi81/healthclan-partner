import { StyleSheet } from 'react-native';
import { CardField, useConfirmSetupIntent } from '@stripe/stripe-react-native';

const grad1 = '#085161';
const fieldBg = '#E9F6FE';

export function useNativeSetupIntent() {
  const { confirmSetupIntent } = useConfirmSetupIntent();
  return confirmSetupIntent;
}

export function NativeStripeCardField({ onCompleteChange }: { onCompleteChange: (complete: boolean) => void }) {
  return (
    <CardField
      postalCodeEnabled={false}
      placeholders={{ number: '4242 4242 4242 4242', expiration: 'MM/YY', cvc: 'CVC' }}
      cardStyle={{
        backgroundColor: fieldBg,
        borderRadius: 14,
        fontSize: 15,
        placeholderColor: '#7F98A0',
        textColor: '#252525',
        textErrorColor: '#B42318',
      }}
      style={styles.field}
      onCardChange={(details) => onCompleteChange(Boolean(details.complete))}
    />
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 52, borderRadius: 14, backgroundColor: fieldBg, borderWidth: 1, borderColor: 'rgba(8,81,97,0.08)' },
});
