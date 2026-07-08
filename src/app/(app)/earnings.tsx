import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiStateCard } from '../../components/api-state';
import { CardEntryForm } from '../../components/card-entry-form';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import { formatMoney, globalCountries, globalCurrencies, normalizeCurrency } from '../../lib/global-options';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const accountTypes = ['checking', 'savings', 'current', 'business'];

function firstNumber(...values: any[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function firstValue(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

export default function Earnings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const [cardSaved, setCardSaved] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [bankCountry, setBankCountry] = useState('NG');
  const [bankCurrency, setBankCurrency] = useState('NGN');
  const [walletCurrency, setWalletCurrency] = useState('GBP');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [notice, setNotice] = useState('');
  const [earnings, setEarnings] = useState<any>(null);
  const [earningsRows, setEarningsRows] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [editingBank, setEditingBank] = useState(true);
  const [openDropdown, setOpenDropdown] = useState('');
  const walletPreferenceLoaded = useRef(false);

  const normalizedAccountNumber = accountNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const normalizedRoutingNumber = routingNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const normalizedCountry = bankCountry.trim().toUpperCase();
  const normalizedCurrency = bankCurrency.trim().toUpperCase();
  const defaultBankAccount = bankAccounts.find(bank => bank?.isDefault) || bankAccounts[0];
  const hasSavedBank = Boolean(defaultBankAccount?._id);
  const enteringBankDetails = editingBank || !hasSavedBank;
  const availableBalance = Number(earnings?.availableBalance || earnings?.available || 0);
  const bankReady = enteringBankDetails
    ? bankName.trim().length > 2 && normalizedAccountNumber.length >= 6 && normalizedCountry.length === 2 && normalizedCurrency.length === 3
    : hasSavedBank;
  const withdrawalReady = bankReady && Number(withdrawAmount) > 0;

  const savedBankLast4 = String(defaultBankAccount?.last4 || defaultBankAccount?.accountNumberLast4 || defaultBankAccount?.accountNumber || '').slice(-4);
  const savedBankCurrency = String(defaultBankAccount?.currency || normalizedCurrency || 'NGN').toUpperCase();
  const savedBankCountry = String(defaultBankAccount?.country || normalizedCountry || 'NG').toUpperCase();
  const displayCurrency = normalizeCurrency(walletCurrency, savedBankCurrency);
  const displayAvailableBalance = availableBalance;
  const formattedWithdrawAmount = withdrawAmount ? formatMoney(withdrawAmount, displayCurrency) : formatMoney(0, displayCurrency);
  const grossEarnings = firstNumber(
    earnings?.grossEarnings,
    earnings?.grossAppointments,
    earnings?.totalGross,
    earnings?.grossAmount,
    earnings?.totalRevenue,
  );
  const platformFee = firstNumber(
    earnings?.platformFee,
    earnings?.platformFees,
    earnings?.commission,
    earnings?.commissionAmount,
    earnings?.adminFee,
    earnings?.healthclanFee,
  );
  const netDoctorEarnings = firstNumber(
    earnings?.netEarnings,
    earnings?.doctorEarnings,
    earnings?.doctorShare,
    earnings?.netAmount,
    earnings?.availableBalance,
    earnings?.available,
  );
  const commissionRate = firstValue(
    earnings?.commissionRate,
    earnings?.platformFeeRate,
    earnings?.adminCommissionRate,
    earnings?.doctorCommissionRate,
  );
  const pendingPayouts = firstNumber(earnings?.pendingPayouts, earnings?.pendingWithdrawal, earnings?.pendingWithdrawals);

  const validateBankDetails = () => {
    if (!enteringBankDetails) {
      return '';
    }

    if (bankName.trim().length < 3) {
      return 'Enter the bank name before continuing.';
    }

    if (normalizedAccountNumber.length < 6 || normalizedAccountNumber.length > 34) {
      return 'Enter a valid bank account number or IBAN.';
    }

    if (!accountTypes.includes(accountType)) {
      return 'Select a valid account type.';
    }

    if (normalizedCountry.length !== 2) {
      return 'Enter a valid 2-letter country code.';
    }

    if (normalizedCurrency.length !== 3) {
      return 'Enter a valid 3-letter currency code.';
    }

    if (['US', 'CA', 'GB', 'AU'].includes(normalizedCountry) && normalizedRoutingNumber.length < 6) {
      return 'Enter a valid routing number, sort code, or transit number for this country.';
    }

    return '';
  };

  const setPresetAmount = (ratio: number) => {
    const amount = Math.floor(displayAvailableBalance * ratio);
    if (amount > 0) {
      setWithdrawAmount(String(amount));
    }
  };

  const applyEarningsSummary = (summary: any, currencyHint = walletCurrency) => {
    setEarnings(summary);
    const available = Number(summary?.availableBalance || summary?.available || 0);
    const summaryCurrency = normalizeCurrency(summary?.currency || currencyHint || summary?.defaultBankAccount?.currency || bankCurrency, 'GBP');
    setWalletCurrency(summaryCurrency);
    setCardSaved(Array.isArray(summary?.cards) && summary.cards.length > 0);
    setWithdrawAmount(available > 0 ? String(available) : '');
    if (!hasSavedBank) setBankCurrency(summaryCurrency);

    const summaryBanks = [
      ...(Array.isArray(summary?.bankAccounts) ? summary.bankAccounts : []),
      ...(summary?.defaultBankAccount ? [summary.defaultBankAccount] : []),
    ].filter(Boolean);

    if (summaryBanks.length) {
      setBankAccounts(summaryBanks);
      setEditingBank(false);
      const summaryBank = summaryBanks.find(bank => bank?.isDefault) || summaryBanks[0];
      if (summaryBank?.country) setBankCountry(String(summaryBank.country).toUpperCase());
      if (summaryBank?.currency) setBankCurrency(String(summaryBank.currency).toUpperCase());
    }

    const gross = firstNumber(summary?.grossEarnings, summary?.grossAppointments, summary?.totalGross, summary?.grossAmount, summary?.totalRevenue);
    const fee = firstNumber(summary?.platformFee, summary?.platformFees, summary?.commission, summary?.commissionAmount, summary?.adminFee, summary?.healthclanFee);
    const net = firstNumber(summary?.netEarnings, summary?.doctorEarnings, summary?.doctorShare, summary?.netAmount, summary?.availableBalance, summary?.available);
    const rate = firstValue(summary?.commissionRate, summary?.platformFeeRate, summary?.adminCommissionRate, summary?.doctorCommissionRate);

    setEarningsRows([
      { label: 'Gross appointment payments', detail: 'Total paid by patients before HealthClan/admin fee', amount: gross, hidden: !gross },
      { label: 'HealthClan/admin fee', detail: rate ? `Admin-set rate: ${Number(rate) > 1 ? `${rate}%` : `${Number(rate) * 100}%`}` : 'Deducted using the fee set by admin', amount: fee, hidden: !fee && !rate },
      { label: 'Doctor net earnings', detail: 'Your cut after HealthClan applies the admin-set fee', amount: net || available },
      { label: 'Available balance', detail: 'Ready for withdrawal', amount: available },
      { label: 'Completed consultations', detail: 'Paid appointments', value: String(summary?.completedAppointments || 0) },
      { label: 'Pending payouts', detail: 'Awaiting admin approval', amount: Number(summary?.pendingPayouts || 0) },
    ].filter(row => !row.hidden));
  };

  const updateWalletCurrency = (currency: string) => {
    const nextCurrency = normalizeCurrency(currency, walletCurrency);
    walletPreferenceLoaded.current = true;
    setWalletCurrency(nextCurrency);
    setOpenDropdown('');
    setLoadingEarnings(true);
    partnerApi.earnings({ currency: nextCurrency })
      .then(summary => applyEarningsSummary(summary, nextCurrency))
      .catch(() => setNotice('Unable to load wallet totals in the selected currency.'))
      .finally(() => setLoadingEarnings(false));
    partnerApi.savePreferences({ walletCurrency: nextCurrency, currency: nextCurrency })
      .then(() => emitPartnerRefresh('preferences', 'wallet-currency-updated', { currency: nextCurrency }))
      .catch(() => setNotice('Wallet currency updated on this device, but could not be saved yet.'));
  };

  const handleCardSaved = async (card: any) => {
    const cards = await partnerApi.cards().catch(() => card ? [card] : []);
    setCardSaved(Array.isArray(cards) && cards.length > 0);
    setNotice('Card verified by Stripe and saved for care information unlocks.');
    emitPartnerRefresh('cards', 'card-saved', cards);
    emitPartnerRefresh('payments', 'card-saved', cards);
  };

  const requestWithdrawal = async () => {
    if (withdrawing) return;

    if (!approved) {
      setNotice('Admin verification is required before requesting withdrawals.');
      return;
    }

    if (!withdrawalReady) {
      setNotice(hasSavedBank ? 'Enter a withdrawal amount first.' : 'Add bank details and withdrawal amount first.');
      return;
    }

    const bankValidationError = validateBankDetails();
    if (bankValidationError) {
      setNotice(bankValidationError);
      return;
    }

    const amount = Number(withdrawAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a valid withdrawal amount.');
      return;
    }

    if (displayAvailableBalance > 0 && amount > displayAvailableBalance) {
      setNotice('Withdrawal amount cannot exceed your available balance.');
      return;
    }

    setWithdrawing(true);

    try {
      let payoutBank = defaultBankAccount;
      let payoutCurrency = savedBankCurrency;
      let payoutBankName = defaultBankAccount?.bankName || 'your saved bank';

      if (enteringBankDetails) {
        const savedBank = await partnerApi.saveBankAccount({
          bankName: bankName.trim(),
          accountNumber: normalizedAccountNumber,
          routingNumber: normalizedRoutingNumber,
          accountType,
          accountHolderName: 'HealthClan Partner',
          accountHolderType: 'individual',
          currency: normalizedCurrency,
          country: normalizedCountry,
          isDefault: true,
        });
        const banks = await partnerApi.bankAccounts().catch(() => []);
        const bankConfirmed = Array.isArray(banks) && banks.some(bank => {
          const savedId = (savedBank as any)?._id;
          const bankAccount = String(bank.accountNumber || bank.last4 || bank.accountNumberLast4 || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return (savedId && bank._id === savedId) || bankAccount.endsWith(normalizedAccountNumber.slice(-4));
        });

        if (!bankConfirmed) {
          throw new Error('Bank details could not be confirmed. Please check the account details before requesting withdrawal.');
        }

        setBankAccounts(Array.isArray(banks) ? banks : []);
        payoutBank = (Array.isArray(banks) && (banks.find(bank => bank?.isDefault) || banks[0])) || savedBank;
        payoutCurrency = normalizedCurrency;
        payoutBankName = bankName.trim();
        setEditingBank(false);
      }

      const payoutAmount = payoutCurrency === displayCurrency
        ? amount
        : await partnerApi.convertCurrency({
          amount,
          from: displayCurrency,
          to: payoutCurrency,
        }).then(result => result.convertedAmount);

      await partnerApi.requestPayout({
        amount: payoutAmount,
        grossAmount: payoutAmount,
        netAmount: payoutAmount,
        currency: payoutCurrency,
        purpose: 'doctor_appointment',
        bankAccount: payoutBank?._id,
      });
      setNotice(`${formattedWithdrawAmount} withdrawal requested to ${payoutBankName}.`);
      setWithdrawAmount('');
      emitPartnerRefresh('payments', 'payout-requested', { amount: payoutAmount, currency: payoutCurrency, bankAccount: payoutBank?._id });
      emitPartnerRefresh('dashboard', 'payout-requested', { amount: payoutAmount, currency: payoutCurrency });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    partnerApi.earnings({ currency: walletCurrency })
      .then(summary => {
        applyEarningsSummary(summary, walletCurrency);
      })
      .catch(() => setNotice('Unable to load live earnings.'))
      .finally(() => setLoadingEarnings(false));

    partnerApi.bankAccounts()
      .then(banks => {
        if (Array.isArray(banks) && banks.length) {
          setBankAccounts(banks);
          setEditingBank(false);
          const bank = banks.find(item => item?.isDefault) || banks[0];
          if (bank?.country) setBankCountry(String(bank.country).toUpperCase());
          if (bank?.currency) setBankCurrency(String(bank.currency).toUpperCase());
        }
      })
      .catch(() => null);

    partnerApi.preferences()
      .then(preferences => {
        const preferredCurrency = normalizeCurrency(preferences?.walletCurrency || preferences?.currency, '');
        if (preferredCurrency) {
          walletPreferenceLoaded.current = true;
          setWalletCurrency(preferredCurrency);
          setLoadingEarnings(true);
          partnerApi.earnings({ currency: preferredCurrency })
            .then(summary => applyEarningsSummary(summary, preferredCurrency))
            .catch(() => null)
            .finally(() => setLoadingEarnings(false));
        }
      })
      .catch(() => null);

    partnerApi.profile()
      .then(payload => {
        const profileCurrency = normalizeCurrency(payload?.profile?.currency, '');
        if (profileCurrency && !walletPreferenceLoaded.current) setWalletCurrency(profileCurrency);
      })
      .catch(() => null);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 116 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.kicker}>Partner wallet</Text>
              <Text style={styles.amount}>{formatMoney(displayAvailableBalance, displayCurrency)}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={25} color="#fff" />
            </View>
          </View>
          <Text style={styles.subtitle}>Available balance from completed consultations after HealthClan applies the fee set by admin.</Text>
          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatLabel}>Gross paid</Text>
              <Text style={styles.walletStatValue}>{grossEarnings ? formatMoney(grossEarnings, displayCurrency) : 'Tracked'}</Text>
            </View>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatLabel}>Fee</Text>
              <Text style={styles.walletStatValue}>{platformFee ? formatMoney(platformFee, displayCurrency) : commissionRate ? `${Number(commissionRate) > 1 ? commissionRate : Number(commissionRate) * 100}%` : 'Admin set'}</Text>
            </View>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatLabel}>Doctor cut</Text>
              <Text style={styles.walletStatValue}>{formatMoney(netDoctorEarnings || displayAvailableBalance, displayCurrency)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.payoutCard}>
          <View style={styles.bankIcon}><Ionicons name="shield-checkmark-outline" size={22} color={grad1} /></View>
          <View style={styles.payoutText}>
            <Text style={styles.payoutTitle}>Earnings calculated by HealthClan</Text>
            <Text style={styles.payoutMeta}>Your balance already reflects the fee set by admin. The app shows the final amount HealthClan has recorded for you.</Text>
          </View>
          <Text style={styles.verified}>{pendingPayouts ? 'Pending' : 'Active'}</Text>
        </View>

        <View style={styles.preferenceCard}>
          <View style={styles.preferenceText}>
            <Text style={styles.payoutTitle}>Wallet currency</Text>
            <Text style={styles.payoutMeta}>Used for wallet totals and withdrawal display</Text>
          </View>
          <Dropdown
            label="Currency"
            value={walletCurrency}
            options={globalCurrencies}
            open={openDropdown === 'walletCurrency'}
            onToggle={() => setOpenDropdown(openDropdown === 'walletCurrency' ? '' : 'walletCurrency')}
            onChange={updateWalletCurrency}
            compact
          />
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionStack}>
          <TouchableOpacity activeOpacity={0.76} style={styles.actionRow} onPress={() => router.push('/withdraw-to-bank' as any)}>
            <View style={styles.bankIcon}><Ionicons name="cash-outline" size={21} color={grad1} /></View>
            <View style={styles.payoutText}>
              <Text style={styles.payoutTitle}>Withdraw to bank</Text>
              <Text style={styles.payoutMeta}>{hasSavedBank ? `${defaultBankAccount?.bankName || 'Saved bank'}${savedBankLast4 ? ` ending ${savedBankLast4}` : ''}` : 'Add bank details and request a payout'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={grad1} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.76} style={styles.actionRow} onPress={() => router.push('/wallet-cards' as any)}>
            <View style={styles.bankIcon}><Ionicons name="card-outline" size={21} color={grad1} /></View>
            <View style={styles.payoutText}>
              <Text style={styles.payoutTitle}>Payment cards</Text>
              <Text style={styles.payoutMeta}>{cardSaved ? 'Card saved for care information unlocks' : 'Add a card for care information unlocks'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={grad1} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Breakdown</Text>
        {loadingEarnings ? (
          <ApiStateCard loading title="Loading earnings" message="Fetching wallet balance, payout status, and card state from HealthClan." />
        ) : !earningsRows.length ? (
          <ApiStateCard icon="wallet-outline" title="No earnings yet" message="Completed paid consultations and payouts will appear here once HealthClan records them." />
        ) : earningsRows.map(row => (
          <View key={row.label} style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowDetail}>{row.detail}</Text>
            </View>
            <Text style={styles.rowValue}>{row.amount === undefined ? row.value : formatMoney(row.amount, displayCurrency)}</Text>
          </View>
        ))}

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>
    </View>
  );
}

function Dropdown({
  label,
  value,
  displayValue,
  options,
  open,
  onToggle,
  onChange,
  flex,
  compact,
}: {
  label: string;
  value: string;
  displayValue?: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  flex?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.dropdownBlock, flex && styles.flexField, compact && styles.compactDropdownBlock]}>
      {!compact && <Text style={styles.inputLabel}>{label}</Text>}
      <TouchableOpacity activeOpacity={0.75} style={styles.dropdownButton} onPress={onToggle}>
        <Text style={styles.dropdownValue} numberOfLines={1}>{displayValue || value || `Select ${label.toLowerCase()}`}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={grad1} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={styles.dropdownMenu} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {options.map(option => {
            const optionValue = option.split(' - ')[0];
            const active = option === value || optionValue === value;

            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.72}
                style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                onPress={() => onChange(option)}
              >
                <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { paddingHorizontal: 18 },
  header: { minHeight: 276, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  walletIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  amount: { color: '#fff', fontSize: 42, lineHeight: 48, fontWeight: '900', marginTop: 10 },
  subtitle: { color: '#fff', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 12, opacity: 0.92 },
  walletStats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  walletStat: { flex: 1, minHeight: 72, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.17)', padding: 11, justifyContent: 'center' },
  walletStatLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '900' },
  walletStatValue: { color: '#fff', fontSize: 13, lineHeight: 18, fontWeight: '900', marginTop: 5 },
  payoutCard: { minHeight: 82, borderRadius: 18, backgroundColor: '#fff', padding: 14, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bankIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  payoutText: { flex: 1, minWidth: 0 },
  payoutTitle: { color: '#252525', fontSize: 15, fontWeight: '900' },
  payoutMeta: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  verified: { color: grad1, fontSize: 12, fontWeight: '900' },
  sectionTitle: { color: '#252525', fontSize: 19, fontWeight: '900', marginTop: 24, marginBottom: 12 },
  actionStack: { gap: 10 },
  actionRow: { minHeight: 78, borderRadius: 18, backgroundColor: '#fff', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  formCard: { borderRadius: 18, backgroundColor: '#fff', padding: 14, gap: 10 },
  preferenceCard: { borderRadius: 18, backgroundColor: '#fff', padding: 14, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  preferenceText: { flex: 1, minWidth: 0 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  flexField: { flex: 1, minWidth: 0 },
  dropdownBlock: { gap: 6 },
  compactDropdownBlock: { width: 118 },
  amountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  balanceText: { color: '#58727A', fontSize: 12, fontWeight: '800' },
  inputLabel: { color: grad1, fontSize: 12, fontWeight: '900' },
  input: { minHeight: 46, borderRadius: 14, backgroundColor: '#E9F6FE', color: '#252525', fontSize: 14, fontWeight: '800', paddingHorizontal: 12 },
  dropdownButton: { minHeight: 46, borderRadius: 14, backgroundColor: '#E9F6FE', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dropdownValue: { flex: 1, color: '#252525', fontSize: 14, fontWeight: '800' },
  dropdownMenu: { maxHeight: 178, borderRadius: 14, backgroundColor: '#F6FBFE', borderWidth: 1, borderColor: 'rgba(8,81,97,0.12)' },
  dropdownOption: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(8,81,97,0.08)' },
  dropdownOptionActive: { backgroundColor: 'rgba(8,81,97,0.1)' },
  dropdownOptionText: { color: '#252525', fontSize: 13, fontWeight: '800' },
  dropdownOptionTextActive: { color: grad1, fontWeight: '900' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { minHeight: 38, borderRadius: 999, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  optionButtonActive: { backgroundColor: grad1 },
  optionText: { color: grad1, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  optionTextActive: { color: '#fff' },
  savedBankCard: { minHeight: 68, borderRadius: 16, backgroundColor: '#E9F6FE', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedBankTitle: { color: '#252525', fontSize: 14, fontWeight: '900' },
  savedBankMeta: { color: '#58727A', fontSize: 12, fontWeight: '800', marginTop: 4 },
  smallButton: { minHeight: 34, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  smallButtonText: { color: grad1, fontSize: 12, fontWeight: '900' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center' },
  presetText: { color: grad1, fontSize: 13, fontWeight: '900' },
  row: { minHeight: 72, borderRadius: 16, backgroundColor: '#fff', padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: '#252525', fontSize: 14, fontWeight: '900' },
  rowDetail: { color: '#58727A', fontSize: 12, fontWeight: '700', marginTop: 4 },
  rowValue: { color: grad1, fontSize: 15, fontWeight: '900' },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  buttonDone: { backgroundColor: '#11a26f' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  notice: { color: grad1, fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center', marginTop: 14 },
});
