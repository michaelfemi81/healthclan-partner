import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardEntryForm } from '../../components/card-entry-form';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';

const grad1 = '#085161';
const grad2 = '#11a2c1';

export default function WalletCards() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [cards, setCards] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    partnerApi.cards().then(items => setCards(Array.isArray(items) ? items : [])).catch(() => setCards([]));
  }, [navigation]);

  const handleCardSaved = async (card: any) => {
    const nextCards = await partnerApi.cards().catch(() => card ? [card] : []);
    setCards(Array.isArray(nextCards) ? nextCards : []);
    setNotice('Card checked and saved. You can use it for care information unlocks.');
    emitPartnerRefresh('cards', 'card-saved', nextCards);
    emitPartnerRefresh('payments', 'card-saved', nextCards);
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <TouchableOpacity activeOpacity={0.76} style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.kicker}>Payment cards</Text>
          <Text style={styles.title}>Care information card</Text>
          <Text style={styles.subtitle}>Add a card once and HealthClan will safely save it for future care information unlocks.</Text>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.formHeader}>
            <View style={styles.icon}><Ionicons name="card-outline" size={22} color={grad1} /></View>
            <View style={styles.copy}>
              <Text style={styles.cardTitle}>{cards.length ? 'Card saved' : 'Add payment card'}</Text>
              <Text style={styles.cardMeta}>{cards.length ? `${cards.length} saved card${cards.length === 1 ? '' : 's'} available.` : 'A card is required before unlocking care requester information.'}</Text>
            </View>
          </View>
          <CardEntryForm
            onSaved={handleCardSaved}
            onMessage={setNotice}
            buttonTitle={cards.length ? 'Add another card' : 'Save card'}
          />
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { paddingHorizontal: 18 },
  header: { minHeight: 220, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  title: { color: '#fff', fontSize: 31, lineHeight: 37, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#fff', fontSize: 14, lineHeight: 21, fontWeight: '700', opacity: 0.9, marginTop: 10 },
  card: { borderRadius: 18, backgroundColor: '#fff', padding: 14, gap: 12, marginTop: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#252525', fontSize: 16, fontWeight: '900' },
  cardMeta: { color: '#58727A', fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 4 },
  notice: { color: grad1, fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center', marginTop: 14 },
});
