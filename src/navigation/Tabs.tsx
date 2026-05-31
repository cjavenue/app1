import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { MapTab } from '../screens/MapTab';
import { ProfileTab } from '../screens/ProfileTab';
import { StatusesTab } from '../screens/StatusesTab';
import { ListTab } from '../screens/ListTab';
import { PlaceholderTab } from '../screens/PlaceholderTab';

const Tab = createBottomTabNavigator();

const ChatsTab = () => <PlaceholderTab title="Chats" icon="chatbubble-outline" />;

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  Map: { on: 'map', off: 'map-outline' },
  List: { on: 'list', off: 'list-outline' },
  Statuses: { on: 'radio', off: 'radio-outline' },
  Chats: { on: 'chatbubble', off: 'chatbubble-outline' },
  Profile: { on: 'person', off: 'person-outline' },
};

export function Tabs() {
  const insets = useSafeAreaInsets();
  const { meetups } = useApp();
  const pendingJoins = meetups.incoming.length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.controlBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarBadgeStyle: {
          backgroundColor: colors.turquoise,
          color: colors.black,
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          const set = ICONS[route.name];
          return <Ionicons name={focused ? set.on : set.off} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapTab} />
      <Tab.Screen name="List" component={ListTab} />
      <Tab.Screen
        name="Statuses"
        component={StatusesTab}
        options={{ tabBarBadge: pendingJoins > 0 ? pendingJoins : undefined }}
      />
      <Tab.Screen name="Chats" component={ChatsTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}
