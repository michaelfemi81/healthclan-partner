import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const grad1 = '#085161';

export function ApiStateCard({
  icon = 'cloud-outline',
  title,
  message,
  loading,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        {loading ? <ActivityIndicator color={grad1} /> : <Ionicons name={icon} size={22} color={grad1} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 142,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 202, 214, 0.12)',
    marginBottom: 10,
  },
  title: {
    color: '#252525',
    fontSize: 15,
    fontFamily: 'Poppins',
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#58727A',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
});
