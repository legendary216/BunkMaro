import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Import this
import * as Haptics from 'expo-haptics';
const DARK_THEME = {
  bg: '#121212',           
  tabBarBg: '#1E1E1E',     
  active: '#BB86FC',       
  inactive: '#757575',     
};

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return <MaterialCommunityIcons size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  // Get safe area insets (this knows exactly how tall the nav bar is)
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: DARK_THEME.active,
        tabBarInactiveTintColor: DARK_THEME.inactive,
        headerShown: false,
        
        tabBarStyle: {
            backgroundColor: DARK_THEME.tabBarBg,
            borderTopWidth: 0, 
            elevation: 0,      
            // Add the bottom inset to the height
            height: 60 + insets.bottom, 
            // Add padding so icons don't sit on the bar
            paddingBottom: insets.bottom + 5, 
            paddingTop: 8,
        },
        tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 10,
        }
      }}
      screenListeners={{
        tabPress: () => {
          // 2. Trigger Light Impact on every tap
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
      >
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabBarIcon name="view-dashboard" color={color} />,
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-check" color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="account-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}