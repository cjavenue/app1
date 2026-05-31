import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { MapTab } from '../screens/MapTab';
import { ProfileTab } from '../screens/ProfileTab';
import { StatusesTab } from '../screens/StatusesTab';
import { PlaceholderTab } from '../screens/PlaceholderTab';

const Tab = createBottomTabNavigator();

const ListTab = () => <PlaceholderTab title="List" icon="list" />;
const ChatsTab = () => <PlaceholderTab title="Chats" icon="chatbubble-outline" />;

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  Map: { on: 'map', off: 'map-outline' },
  List: { on: 'list', off: 'list-outline' },
  Statuses: { on: 'radio', off: 'radio-outline' },
  Chats: { on: 'chatbubble', off: 'chatbubble-outline' },
  Profile: { on: 'person', off: 'person-outline' },
};

export function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.controlBorder,
        },
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color, size }) => {
          const set = ICONS[route.name];
          return <Ionicons name={focused ? set.on : set.off} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapTab} />
      <Tab.Screen name="List" component={ListTab} />
      <Tab.Screen name="Statuses" component={StatusesTab} />
      <Tab.Screen name="Chats" component={ChatsTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}
