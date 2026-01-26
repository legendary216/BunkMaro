import React, { useCallback, useState } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import { Text, Button, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router'; // To refresh when tab opens
import { useRouter } from 'expo-router';
import { supabase } from '../../utils/supabase';
import { Colors } from '../../constants/theme';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  // Function to fetch the current active semester
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Find the active semester
      // We use .maybeSingle() because it's okay if it returns null (no semester yet)
      const { data, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setSemester(data);

    } catch (error: any) {
      console.log('Error fetching dashboard:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Run this every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // Pull-to-refresh logic
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Dashboard</Text>
          <Text variant="bodyLarge" style={{ color: Colors.light.icon }}>
            {new Date().toDateString()}
          </Text>
        </View>

        {/* STATE 1: No Semester Found (New User) */}
        {!semester ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>Welcome to Bunk Maro!</Text>
              <Text variant="bodyMedium" style={styles.cardBody}>
                You don't have an active semester yet. Set up your subjects and timetable to start tracking.
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button 
                mode="contained" 
                buttonColor={Colors.light.tint}
               onPress={() => router.push('/semester-setup')} // We will link this later
              >
                Start New Semester
              </Button>
            </Card.Actions>
          </Card>
        ) : (
          /* STATE 2: Active Semester Found (Placeholder for now) */
          <View>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">Current Semester</Text>
                <Text variant="headlineLarge" style={{ color: Colors.light.tint, fontWeight: 'bold' }}>
                  {semester.name}
                </Text>
                <Text variant="bodyMedium">Attendance tracking is active.</Text>
              </Card.Content>
            </Card>

            {/* Placeholder for the "Big Bunk Button" */}
            <Button 
              mode="contained" 
              style={{ marginTop: 20, backgroundColor: '#FF5252' }}
              labelStyle={{ fontSize: 18, paddingVertical: 5 }}
            >
              BUNK CURRENT CLASS
            </Button>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardBody: {
    marginBottom: 16,
    color: '#666',
  }
});