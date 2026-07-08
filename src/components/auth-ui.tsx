import { router } from 'expo-router';
import { type ReactNode, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const colors = {
  aqua: 'rgba(19, 202, 214, 1)',
  bg: '#E9F6FE',
  field: 'rgba(19, 202, 214, 0.2)',
  ink: '#252525',
  muted: '#58727A',
  teal: '#085161',
  white: '#FFFFFF',
};

const pages = {
  maxWidth: 430,
  wideMaxWidth: 760,
};

export function AuthScreen({ children, bottom = 28 }: { children: ReactNode; bottom?: number }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmall = width < 390;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.content, isSmall && styles.contentSmall, { paddingBottom: insets.bottom + bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthHeader({ title, backTo }: { title: string; backTo: string }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.back} onPress={() => router.replace(backTo as any)}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = loading || disabled;

  return (
    <Pressable
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [styles.primary, isDisabled && styles.primaryDisabled, pressed && !isDisabled && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.primaryContent}>
        {loading ? <ActivityIndicator color={colors.white} size="small" /> : null}
        <Text style={styles.primaryText}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function AuthField({
  placeholder,
  secureTextEntry = false,
  value,
  onChangeText,
  rightLabel,
  onRightPress,
  inputProps,
}: {
  placeholder: string;
  secureTextEntry?: boolean;
  value?: string;
  onChangeText?: (value: string) => void;
  rightLabel?: string;
  onRightPress?: () => void;
  inputProps?: TextInputProps;
}) {
  return (
    <View style={styles.field}>
      <TextInput
        {...inputProps}
        placeholder={placeholder}
        placeholderTextColor={colors.aqua}
        secureTextEntry={secureTextEntry}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      {rightLabel ? (
        <Pressable style={styles.fieldAction} onPress={onRightPress}>
          <Text style={styles.fieldActionText}>{rightLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AuthCodeInput({
  value,
  onChangeText,
  length = 6,
}: {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
}) {
  const inputs = useRef<Array<TextInput | null>>([]);
  const digits = value.replace(/\D/g, '').slice(0, length).split('');

  function updateDigit(index: number, nextValue: string) {
    const nextDigit = nextValue.replace(/\D/g, '').slice(-1);
    const nextDigits = Array.from({ length }, (_, digitIndex) => digits[digitIndex] || '');
    nextDigits[index] = nextDigit;
    onChangeText(nextDigits.join('').slice(0, length));

    if (nextDigit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  return (
    <View style={styles.codeRow}>
      {Array.from({ length }, (_, index) => (
        <TextInput
          key={index}
          ref={input => {
            inputs.current[index] = input;
          }}
          value={digits[index] || ''}
          onChangeText={nextValue => updateDigit(index, nextValue)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
              inputs.current[index - 1]?.focus();
            }
          }}
          keyboardType="number-pad"
          maxLength={1}
          textContentType="oneTimeCode"
          style={styles.codeBox}
        />
      ))}
    </View>
  );
}

export const authColors = colors;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, width: '100%', maxWidth: pages.wideMaxWidth, alignSelf: 'center', padding: 18 },
  contentSmall: { padding: 14 },
  header: {
    minHeight: 84,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginHorizontal: -18,
    marginTop: -18,
    marginBottom: 22,
  },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.white, fontSize: 36, lineHeight: 40, fontWeight: '700' },
  headerTitle: { flex: 1, color: colors.white, fontFamily: 'Poppins', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  primary: {
    width: '100%',
    maxWidth: pages.maxWidth,
    minHeight: 54,
    borderRadius: 10,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
  },
  primaryDisabled: { opacity: 0.68 },
  primaryContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pressed: { opacity: 0.78 },
  primaryText: { color: colors.white, fontFamily: 'Poppins', fontSize: 18, fontWeight: '800' },
  field: {
    width: '100%',
    maxWidth: pages.maxWidth,
    minHeight: 50,
    borderRadius: 10,
    alignSelf: 'center',
    backgroundColor: colors.field,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, minHeight: 48, color: colors.ink, fontFamily: 'Poppins', fontSize: 14, fontWeight: '700', padding: 0 },
  fieldAction: { minHeight: 38, minWidth: 54, alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  fieldActionText: { color: colors.teal, fontFamily: 'Poppins', fontSize: 12, fontWeight: '900' },
  codeRow: { width: '100%', maxWidth: 320, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.field,
    borderWidth: 0.8,
    borderColor: 'rgba(255,255,255,0.7)',
    color: colors.ink,
    fontFamily: 'Poppins',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
});
