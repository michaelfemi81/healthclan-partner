import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const grad1 = '#085161';
const grad2 = '#11a2c1';

export function SettingsDetailScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 116 }]}
      >
        <LinearGradient colors={[grad1, grad2]} style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </LinearGradient>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.72} disabled={!onPress} onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={grad1} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {!!right && <Text style={styles.rowRight}>{right}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={grad1} />}
    </TouchableOpacity>
  );
}

export function SettingsNotice({ children }: { children: ReactNode }) {
  return <Text style={styles.notice}>{children}</Text>;
}

export function SettingsSectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export const settingsColors = { grad1, grad2 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E9F6FE' },
  content: { flexGrow: 1 },
  header: { minHeight: 156, justifyContent: 'center', paddingHorizontal: 24 },
  back: { position: 'absolute', left: 12, top: 30, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  title: { color: '#fff', fontSize: 24, fontFamily: 'Poppins', fontWeight: '900', textAlign: 'center', marginTop: 20 },
  subtitle: { color: '#fff', fontSize: 13, lineHeight: 19, fontFamily: 'Poppins', fontWeight: '700', textAlign: 'center', opacity: 0.9, marginTop: 8 },
  body: { width: '90%', maxWidth: 680, alignSelf: 'center', paddingTop: 20 },
  row: { minHeight: 72, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, marginBottom: 10 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(19, 202, 214, 0.12)' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#252525', fontSize: 14, fontFamily: 'Poppins', fontWeight: '900' },
  rowSubtitle: { color: '#58727A', fontSize: 12, lineHeight: 17, fontFamily: 'Poppins', fontWeight: '700', marginTop: 3 },
  rowRight: { color: grad1, fontSize: 12, fontFamily: 'Poppins', fontWeight: '900' },
  notice: { color: grad1, fontSize: 13, lineHeight: 19, fontFamily: 'Poppins', fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  sectionTitle: { color: '#252525', fontSize: 18, fontFamily: 'Poppins', fontWeight: '900', marginBottom: 12, marginTop: 6 },
});
