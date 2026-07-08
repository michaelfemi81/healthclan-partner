import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { router, Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const grad1 = '#085161';
const inactive = '#58727A';
const tabs = [
  { name: 'Home', href: '/', icon: 'home' },
  { name: 'Appts', href: '/calendar', icon: 'calendar' },
  { name: 'Profile', href: '/profile', icon: 'person' },
  { name: 'Settings', href: '/settings', icon: 'cog' },
] as const;

function PartnerTabBar({}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const hiddenRoutes = ['/video-room'];

  if (hiddenRoutes.some(route => pathname.startsWith(route))) return null;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBarInner}>
        {tabs.map(tab => {
          const focused = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const color = focused ? grad1 : inactive;

          return (
            <Pressable
              key={tab.href}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => router.replace(tab.href as any)}
              style={({ pressed }) => [
                styles.tabItem,
                focused && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <Ionicons name={tab.icon} size={22} color={color} />
              <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
                {tab.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      tabBar={props => <PartnerTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: grad1,
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={30} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="consultations"
        options={{
          title: 'Video',
          tabBarIcon: ({ color }) => <Ionicons name="videocam" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="video-room"
        options={{
          title: 'Video room',
          href: null,
        }}
      />
      <Tabs.Screen
        name="care-requests"
        options={{
          title: 'Care',
          tabBarIcon: ({ color }) => <Ionicons name="heart" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Availability',
          tabBarIcon: ({ color }) => <Ionicons name="time" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <Ionicons name="wallet" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Ionicons name="cog" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="doctor-profile"
        options={{
          title: 'doctor-profile',
          href: null,
        }}
      />
      {[
        'change-password',
        'trusted-devices',
        'privacy-security',
        'payment-methods',
        'help-support',
        'terms-conditions',
        'privacy-policy',
        'language',
        'edit-profile',
        'withdraw-to-bank',
        'wallet-cards',
      ].map(name => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    elevation: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2EAFF',
    borderTopColor: 'transparent',
    borderTopWidth: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#085161',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabBarInner: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabItem: {
    zIndex: 1000,
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,255,255,0.58)',
  },
  tabItemPressed: {
    opacity: 0.72,
  },
  tabLabel: {
    maxWidth: '100%',
    fontSize: 11,
    fontWeight: '900',
  },
});
