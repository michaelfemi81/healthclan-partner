import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ApiStateCard } from '../../components/api-state';
import { CardEntryForm } from '../../components/card-entry-form';
import { SettingsDetailScreen, SettingsNotice, SettingsRow } from '../../components/settings-detail-screen';
import { emitPartnerRefresh, subscribePartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

export default function PaymentMethods() {
  const [cards, setCards] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [fetching, setFetching] = useState(true);

  const loadCards = useCallback(() => {
    setFetching(true);
    partnerApi.cards()
      .then(items => {
        setCards(Array.isArray(items) ? items : []);
      })
      .catch(error => {
        setCards([]);
        setMessage(error instanceof Error ? error.message : 'Unable to load saved cards from HealthClan.');
      })
      .finally(() => setFetching(false));
  }, []);

  useFocusEffect(loadCards);

  useEffect(() => subscribePartnerRefresh(['cards', 'payments'], loadCards), [loadCards]);

  async function handleCardSaved(card: any) {
    const latest = await partnerApi.cards().catch(() => card ? [card] : []);
    setCards(Array.isArray(latest) ? latest : []);
    emitPartnerRefresh('cards', 'card-saved', latest);
    emitPartnerRefresh('payments', 'card-saved', latest);
    setMessage('Card verified by Stripe and saved for reuse.');
  }

  return (
    <SettingsDetailScreen title="Payment Methods" subtitle="Cards used to unlock care request information.">
      {!!message && <SettingsNotice>{message}</SettingsNotice>}
      {cards.map(card => (
        <SettingsRow key={card._id || card.last4} icon="card-outline" title={`${card.brand || 'Card'} ending ${card.last4 || '----'}`} subtitle={card.isDefault ? 'Default payment method' : 'Saved card'} right={card.isDefault ? 'Default' : undefined} />
      ))}
      {fetching ? (
        <ApiStateCard loading title="Loading cards" message="Checking payment methods from the backend." />
      ) : !cards.length && (
        <ApiStateCard icon="card-outline" title="No saved cards" message="Set up a card to unlock care request information." />
      )}
      <CardEntryForm onSaved={handleCardSaved} onMessage={setMessage} buttonTitle={cards.length ? 'Add another card' : 'Save card'} />
    </SettingsDetailScreen>
  );
}
