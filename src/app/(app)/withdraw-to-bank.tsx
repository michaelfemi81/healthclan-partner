import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDoctorVerification } from '../../contexts/doctor-verification';
import { emitPartnerRefresh } from '../../lib/app-events';
import { partnerApi } from '../../lib/api';
import { formatMoney, globalCountries, globalCurrencies, normalizeCurrency } from '../../lib/global-options';

const grad1 = '#085161';
const grad2 = '#11a2c1';
const accountTypes = ['checking', 'savings', 'current', 'business'];

export default function WithdrawToBank() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { approved } = useDoctorVerification();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [bankCountry, setBankCountry] = useState('NG');
  const [bankCurrency, setBankCurrency] = useState('NGN');
  const [walletCurrency, setWalletCurrency] = useState('GBP');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [earnings, setEarnings] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
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
  const savedBankCurrency = String(defaultBankAccount?.currency || normalizedCurrency || 'NGN').toUpperCase();
  const savedBankCountry = String(defaultBankAccount?.country || normalizedCountry || 'NG').toUpperCase();
  const savedBankLast4 = String(defaultBankAccount?.last4 || defaultBankAccount?.accountNumberLast4 || defaultBankAccount?.accountNumber || '').slice(-4);
  const displayCurrency = normalizeCurrency(walletCurrency, savedBankCurrency);
  const availableBalance = Number(earnings?.availableBalance || earnings?.available || 0);
  const formattedWithdrawAmount = withdrawAmount ? formatMoney(withdrawAmount, displayCurrency) : formatMoney(0, displayCurrency);
  const bankReady = enteringBankDetails
    ? bankName.trim().length > 2 && normalizedAccountNumber.length >= 6 && normalizedCountry.length === 2 && normalizedCurrency.length === 3
    : hasSavedBank;
  const withdrawalReady = bankReady && Number(withdrawAmount) > 0;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    partnerApi.earnings({ currency: walletCurrency })
      .then(summary => {
        setEarnings(summary);
        const summaryCurrency = normalizeCurrency(summary?.currency || walletCurrency || summary?.defaultBankAccount?.currency, 'GBP');
        setWalletCurrency(summaryCurrency);
        if (Number(summary?.availableBalance || summary?.available || 0) > 0) setWithdrawAmount(String(summary?.availableBalance || summary?.available));
      })
      .catch(() => setNotice('Unable to load wallet balance.'));
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
          partnerApi.earnings({ currency: preferredCurrency }).then(setEarnings).catch(() => null);
        }
      })
      .catch(() => null);
    partnerApi.profile()
      .then(payload => {
        const profileCurrency = normalizeCurrency(payload?.profile?.currency, '');
        if (profileCurrency && !walletPreferenceLoaded.current) setWalletCurrency(profileCurrency);
      })
      .catch(() => null);
  }, [navigation]);

  const validateBankDetails = () => {
    if (!enteringBankDetails) return '';
    if (bankName.trim().length < 3) return 'Enter the bank name before continuing.';
    if (normalizedAccountNumber.length < 6 || normalizedAccountNumber.length > 34) return 'Enter a valid bank account number or IBAN.';
    if (!accountTypes.includes(accountType)) return 'Select a valid account type.';
    if (normalizedCountry.length !== 2) return 'Select a valid country.';
    if (normalizedCurrency.length !== 3) return 'Select a valid currency.';
    if (['US', 'CA', 'GB', 'AU'].includes(normalizedCountry) && normalizedRoutingNumber.length < 6) return 'Enter a valid routing number, sort code, or transit number for this country.';
    return '';
  };

  const setPresetAmount = (ratio: number) => {
    const amount = Math.floor(availableBalance * ratio);
    if (amount > 0) setWithdrawAmount(String(amount));
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
    if (availableBalance > 0 && amount > availableBalance) {
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
        if (!bankConfirmed) throw new Error('Bank details could not be confirmed. Please check the account details before requesting withdrawal.');

        setBankAccounts(Array.isArray(banks) ? banks : []);
        payoutBank = (Array.isArray(banks) && (banks.find(bank => bank?.isDefault) || banks[0])) || savedBank;
        payoutCurrency = normalizedCurrency;
        payoutBankName = bankName.trim();
        setEditingBank(false);
      }

      const payoutAmount = payoutCurrency === displayCurrency
        ? amount
        : await partnerApi.convertCurrency({ amount, from: displayCurrency, to: payoutCurrency }).then(result => result.convertedAmount);

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
      partnerApi.earnings({ currency: displayCurrency }).then(setEarnings).catch(() => null);
      emitPartnerRefresh('payments', 'payout-requested', { amount: payoutAmount, currency: payoutCurrency, bankAccount: payoutBank?._id });
      emitPartnerRefresh('dashboard', 'payout-requested', { amount: payoutAmount, currency: payoutCurrency });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to request withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}>
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <TouchableOpacity activeOpacity={0.76} style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.kicker}>Withdraw</Text>
          <Text style={styles.amount}>{formatMoney(availableBalance, displayCurrency)}</Text>
          <Text style={styles.subtitle}>Available to send to your bank account.</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          {hasSavedBank && (
            <View style={styles.savedBankCard}>
              <View style={styles.bankIcon}><Ionicons name="business-outline" size={21} color={grad1} /></View>
              <View style={styles.payoutText}>
                <Text style={styles.savedBankTitle}>{defaultBankAccount?.bankName || 'Saved bank account'}</Text>
                <Text style={styles.savedBankMeta}>{savedBankCountry} {savedBankCurrency}{savedBankLast4 ? ` - **** ${savedBankLast4}` : ''}</Text>
              </View>
              <TouchableOpacity style={styles.smallButton} onPress={() => setEditingBank(value => !value)}>
                <Text style={styles.smallButtonText}>{editingBank ? 'Use saved' : 'Change'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {enteringBankDetails && (
            <>
              <Text style={styles.inputLabel}>Bank name</Text>
              <TextInput value={bankName} onChangeText={setBankName} placeholder="Bank name" placeholderTextColor="#7F98A0" style={styles.input} />
              <Text style={styles.inputLabel}>Account number</Text>
              <TextInput value={accountNumber} onChangeText={setAccountNumber} autoCapitalize="characters" placeholder="Account number or IBAN" placeholderTextColor="#7F98A0" style={styles.input} />
              <Text style={styles.inputLabel}>Routing / sort / transit number</Text>
              <TextInput value={routingNumber} onChangeText={setRoutingNumber} autoCapitalize="characters" placeholder="Routing number, sort code, or transit number" placeholderTextColor="#7F98A0" style={styles.input} />
              <Text style={styles.inputLabel}>Account type</Text>
              <View style={styles.optionRow}>
                {accountTypes.map(type => {
                  const active = accountType === type;
                  return (
                    <TouchableOpacity key={type} activeOpacity={0.75} style={[styles.optionButton, active && styles.optionButtonActive]} onPress={() => setAccountType(type)}>
                      <Text style={[styles.optionText, active && styles.optionTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.inlineFields}>
                <Dropdown label="Country" value={bankCountry} displayValue={`${bankCountry} - ${globalCountries.find(country => country.code === bankCountry)?.label || 'Selected country'}`} options={globalCountries.map(country => `${country.code} - ${country.label}`)} open={openDropdown === 'country'} onToggle={() => setOpenDropdown(openDropdown === 'country' ? '' : 'country')} onChange={value => { setBankCountry(value.split(' - ')[0]); setOpenDropdown(''); }} flex />
                <Dropdown label="Currency" value={bankCurrency} options={globalCurrencies} open={openDropdown === 'currency'} onToggle={() => setOpenDropdown(openDropdown === 'currency' ? '' : 'currency')} onChange={value => { setBankCurrency(value); setOpenDropdown(''); }} flex />
              </View>
            </>
          )}

          <View style={styles.amountHeader}>
            <Text style={styles.inputLabel}>Amount</Text>
            <Text style={styles.balanceText}>Available {formatMoney(availableBalance, displayCurrency)}</Text>
          </View>
          <TextInput value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="number-pad" placeholder="Amount" placeholderTextColor="#7F98A0" style={styles.input} />
          <View style={styles.presetRow}>
            <TouchableOpacity style={styles.presetButton} onPress={() => setPresetAmount(0.25)}><Text style={styles.presetText}>25%</Text></TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => setPresetAmount(0.5)}><Text style={styles.presetText}>50%</Text></TouchableOpacity>
            <TouchableOpacity style={styles.presetButton} onPress={() => setPresetAmount(1)}><Text style={styles.presetText}>All</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.button, (!withdrawalReady || withdrawing || !approved) && styles.buttonDisabled]} onPress={requestWithdrawal} disabled={withdrawing || !withdrawalReady || !approved}>
            {withdrawing ? <ActivityIndicator color="#fff" /> : <Ionicons name="cash-outline" size={19} color="#fff" />}
            <Text style={styles.buttonText}>{withdrawing ? 'Requesting withdrawal' : !approved ? 'Verification required' : `Withdraw ${formattedWithdrawAmount}`}</Text>
          </TouchableOpacity>
        </View>

        {!!notice && <Text style={styles.notice}>{notice}</Text>}
      </ScrollView>
    </View>
  );
}

function Dropdown({ label, value, displayValue, options, open, onToggle, onChange, flex }: { label: string; value: string; displayValue?: string; options: string[]; open: boolean; onToggle: () => void; onChange: (value: string) => void; flex?: boolean }) {
  return (
    <View style={[styles.dropdownBlock, flex && styles.flexField]}>
      <Text style={styles.inputLabel}>{label}</Text>
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
              <TouchableOpacity key={option} activeOpacity={0.72} style={[styles.dropdownOption, active && styles.dropdownOptionActive]} onPress={() => onChange(option)}>
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
  header: { minHeight: 220, borderRadius: 24, padding: 22, justifyContent: 'space-between' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  kicker: { color: 'rgba(255,255,255,0.84)', fontSize: 13, fontWeight: '900' },
  amount: { color: '#fff', fontSize: 40, lineHeight: 46, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#fff', fontSize: 14, lineHeight: 21, fontWeight: '700', opacity: 0.9, marginTop: 8 },
  formCard: { borderRadius: 18, backgroundColor: '#fff', padding: 14, gap: 10, marginTop: 16 },
  bankIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  payoutText: { flex: 1, minWidth: 0 },
  savedBankCard: { minHeight: 68, borderRadius: 16, backgroundColor: '#E9F6FE', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedBankTitle: { color: '#252525', fontSize: 14, fontWeight: '900' },
  savedBankMeta: { color: '#58727A', fontSize: 12, fontWeight: '800', marginTop: 4 },
  smallButton: { minHeight: 34, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  smallButtonText: { color: grad1, fontSize: 12, fontWeight: '900' },
  inputLabel: { color: grad1, fontSize: 12, fontWeight: '900' },
  input: { minHeight: 46, borderRadius: 14, backgroundColor: '#E9F6FE', color: '#252525', fontSize: 14, fontWeight: '800', paddingHorizontal: 12 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  flexField: { flex: 1, minWidth: 0 },
  dropdownBlock: { gap: 6 },
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
  amountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  balanceText: { color: '#58727A', fontSize: 12, fontWeight: '800' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetButton: { flex: 1, minHeight: 38, borderRadius: 12, backgroundColor: '#E9F6FE', alignItems: 'center', justifyContent: 'center' },
  presetText: { color: grad1, fontSize: 13, fontWeight: '900' },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: grad1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  notice: { color: grad1, fontSize: 13, lineHeight: 18, fontWeight: '900', textAlign: 'center', marginTop: 14 },
});
