import React, { useCallback, useState } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { supabase } from '../../utils/supabase';
import { Colors } from '../../constants/theme';

// --- SUB-COMPONENT: The Card that expands ---
const ClassCard = ({ slot }: { slot: any }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={styles.classCard} onPress={() => setExpanded(!expanded)}>
      <Card.Content style={styles.classRow}>
        {/* Left Side: Text Area */}
        <View style={styles.textContainer}>
          <Text 
            variant="titleMedium" 
            style={{ fontWeight: 'bold' }} 
            numberOfLines={expanded ? undefined : 1} // Toggle lines
          >
            {slot.subjects?.name}
          </Text>
          <Text variant="bodySmall" style={{ color: '#666' }}>
            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
          </Text>
        </View>

        {/* Right Side: Status Chip */}
        <Chip icon="clock-outline" style={{ flexShrink: 0 }}>
          Upcoming
        </Chip>
      </Card.Content>
    </Card>
  );
};

// --- MAIN SCREEN ---
export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<any>(null);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Helper to get day name
  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sem, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setSemester(sem);

      if (sem) {
        const todayIndex = new Date().getDay();
        const { data: slots } = await supabase
          .from('timetable_slots')
          .select('*, subjects(name)')
          .eq('semester_id', sem.id)
          .eq('day_of_week', todayIndex)
          .order('start_time');

        if (slots) setTodaySlots(slots);
      }
    } catch (error: any) {
      console.log('Error:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing && !semester) {
    return (
      <View style={[styles.center, { flex: 1 }]}>
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
            {getDayName()}, {new Date().toDateString()}
          </Text>
        </View>

        {!semester ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>Welcome to Bunk Maro!</Text>
              <Text variant="bodyMedium" style={styles.cardBody}>
                You don't have an active semester yet.
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" buttonColor={Colors.light.tint} onPress={() => router.push('/semester-setup')}>
                Start New Semester
              </Button>
            </Card.Actions>
          </Card>
        ) : (
          <View>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium">Current Semester</Text>
                <Text variant="headlineLarge" style={{ color: Colors.light.tint, fontWeight: 'bold' }}>
                  {semester.name}
                </Text>
                <View style={styles.buttonRow}>
                   <Button mode="outlined" onPress={() => router.push('/manage-subjects')} style={styles.smallBtn}>
                      Subjects
                   </Button>
                   <Button mode="outlined" onPress={() => router.push('/manage-timetable')} style={styles.smallBtn}>
                      Timetable
                   </Button>
                </View>
              </Card.Content>
            </Card>

            <Text variant="titleLarge" style={styles.sectionTitle}>Today's Classes</Text>
            
            {todaySlots.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={{ textAlign: 'center', opacity: 0.6 }}>No classes scheduled for today! 🎉</Text>
                </Card.Content>
              </Card>
            ) : (
              // USE THE NEW SUB-COMPONENT HERE
              todaySlots.map((slot) => (
                <ClassCard key={slot.id} slot={slot} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20 },
  card: { marginBottom: 16, backgroundColor: 'white' },
  cardTitle: { fontWeight: 'bold', marginBottom: 8 },
  cardBody: { marginBottom: 16, color: '#666' },
  buttonRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  smallBtn: { flex: 1 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  
  // Card Styles
  classCard: { marginBottom: 10, backgroundColor: 'white' },
  classRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  }
});