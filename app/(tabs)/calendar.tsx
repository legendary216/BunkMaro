import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, Divider, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../utils/supabase';
import { Colors } from '../../constants/theme';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    fetchLogsForDate(selectedDate);
    fetchMonthHighlights(); // Optional: Load dots for the whole month
  }, [selectedDate]);

  // 1. Fetch details for the specific clicked day
  const fetchLogsForDate = async (date: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch logs + Subject Name
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*, subjects(name)')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('slot_time');

      if (error) throw error;
      setLogs(data || []);
    } catch (e: any) {
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. (Optional) Fetch all logs to show colored dots on the calendar
  const fetchMonthHighlights = async () => {
    // This is a "nice to have" - it puts little dots on days with data
    // For now, we will just keep the selected color logic simple
    setMarkedDates({
      [selectedDate]: { selected: true, selectedColor: Colors.light.tint }
    });
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'PRESENT': return <Chip icon="check" style={{ backgroundColor: '#e8f5e9' }} textStyle={{ color: '#2e7d32' }}>Present</Chip>;
      case 'BUNKED': return <Chip icon="close" style={{ backgroundColor: '#ffebee' }} textStyle={{ color: '#d32f2f' }}>Bunked</Chip>;
      case 'HOLIDAY': return <Chip icon="beach" style={{ backgroundColor: '#e0f7fa' }} textStyle={{ color: '#006064' }}>Holiday</Chip>;
      case 'POSTPONED': return <Chip icon="clock" style={{ backgroundColor: '#fff3e0' }} textStyle={{ color: '#e65100' }}>Postponed</Chip>;
      default: return <Chip>{status}</Chip>;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent' }}>
        <Appbar.Content title="History Log" />
      </Appbar.Header>

      <View style={{ padding: 10 }}>
        <Calendar
          // Current selected day
          current={selectedDate}
          // Handler
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          // Styling
          markedDates={markedDates}
          theme={{
            todayTextColor: Colors.light.tint,
            arrowColor: Colors.light.tint,
            selectedDayBackgroundColor: Colors.light.tint,
            selectedDayTextColor: '#ffffff',
          }}
        />
      </View>

      <Divider />

      <View style={styles.listContainer}>
        <Text variant="titleMedium" style={styles.dateTitle}>
          Logs for {new Date(selectedDate).toDateString()}
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Content style={styles.cardRow}>
                  <View>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.subjects?.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#666' }}>{item.slot_time?.slice(0, 5) || 'No time'}</Text>
                  </View>
                  {renderStatus(item.status)}
                </Card.Content>
              </Card>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No classes recorded for this date.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1, padding: 20 },
  dateTitle: { fontWeight: 'bold', marginBottom: 15, color: '#666' },
  card: { marginBottom: 10, backgroundColor: 'white' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontStyle: 'italic' }
});