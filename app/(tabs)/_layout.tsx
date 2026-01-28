import React from 'react';
// Changed from FontAwesome to MaterialCommunityIcons for a cleaner look
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

const DARK_THEME = {
  bg: '#121212',           
  tabBarBg: '#1E1E1E',     
  active: '#BB86FC',       // Purple Accent
  inactive: '#757575',     
};

/**
 * Helper component to render Tab Bar icons.
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  // Increased size slightly to 26 for better visibility
  return <MaterialCommunityIcons size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
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
            height: Platform.OS === 'ios' ? 88 : 60,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
        },
        tabBarLabelStyle: {
            fontWeight: '600',
            fontSize: 10,
        }
      }}>
      
      {/* 1. Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          // Icon: A grid view, perfect for a dashboard
          tabBarIcon: ({ color }) => <TabBarIcon name="view-dashboard" color={color} />,
        }}
      />

      {/* 2. History Tab */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'History',
          // Icon: A calendar with a checkmark (fits attendance perfectly)
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-check" color={color} />,
        }}
      />

      {/* 3. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // Icon: A clean user circle
          tabBarIcon: ({ color }) => <TabBarIcon name="account-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}