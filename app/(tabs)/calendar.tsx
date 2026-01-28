import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Chip, Divider, Appbar, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../utils/supabase';
import { Colors } from '../../constants/theme';

export default function CalendarScreen() {
  // "en-CA" format always gives YYYY-MM-DD in Local Time
const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [semesterId, setSemesterId] = useState<any>(null);

  // 1. Get Active Semester ID once on mount
  useEffect(() => {
    const getSem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('semesters').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (data) setSemesterId(data.id);
    };
    getSem();
  }, []);

  // 2. Fetch Data whenever Date or Semester changes
  useEffect(() => {
    if (semesterId) fetchDataForDate(selectedDate);
  }, [selectedDate, semesterId]);

  const fetchDataForDate = async (date: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !semesterId) return;

      // A. Calculate Day Index (0 = Sunday, 1 = Monday...)
     const dayIndex = new Date(date + "T12:00:00").getDay();

      // B. Fetch Timetable Slots for that day
      const { data: slots } = await supabase
        .from('timetable_slots')
        .select('*, subjects(name)')
        .eq('semester_id', semesterId)
        .eq('day_of_week', dayIndex)
        .order('start_time');

      // C. Fetch Logs for that specific date
      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('semester_id', semesterId)
        .eq('date', date);

      // D. MERGE THEM: "Slot + Log = ClassCard"
      const merged = (slots || []).map(slot => {
        const foundLog = logs?.find(l => l.subject_id === slot.subject_id && l.slot_time === slot.start_time);
        return {
          ...slot,
          log: foundLog || null // Attach the log if it exists
        };
      });

      setCombinedData(merged);
    
      

    } catch (e: any) {
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Mark Attendance Function
  const handleMark = async (item: any, status: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upsert: Works for both Insert (New) and Update (Edit)
      const payload = {
        user_id: user.id,
        semester_id: semesterId,
        subject_id: item.subject_id,
        date: selectedDate,
        slot_time: item.start_time,
        status: status
      };

      // We use 'upsert' to handle edits easily
      const { error } = await supabase.from('attendance_logs').upsert(payload);
      
      if (error) throw error;
      
      // Refresh to show changes
      await fetchDataForDate(selectedDate);

    } catch (e: any) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  const markWholeDayHoliday = () => {
    Alert.alert(
      'Mark Holiday?',
      `Mark ${new Date(selectedDate).toDateString()} as a Holiday? This will update ALL classes for this date.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Holiday 🏖️',
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user || !semesterId) return;

              // 1. We already have the slots in 'combinedData', let's use them
              const updates = combinedData.map(item => ({
                user_id: user.id,
                semester_id: semesterId,
                subject_id: item.subject_id,
                date: selectedDate,
                slot_time: item.start_time,
                status: 'HOLIDAY'
              }));

              if (updates.length === 0) {
                 Alert.alert("No classes to mark!");
                 setLoading(false);
                 return;
              }

              // 2. Bulk Upsert (Overwrite existing logs)
              const { error } = await supabase.from('attendance_logs').upsert(updates);
              if (error) throw error;

              // 3. Refresh
              await fetchDataForDate(selectedDate);
              Alert.alert("Success", "Date marked as Holiday!");

            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
const todayStr = new Date().toLocaleDateString('en-CA');
  const isFuture = selectedDate > todayStr;

const renderItem = ({ item }: { item: any }) => {
    const isPending = !item.log;
    
    const showEditMenu = () => {
        // Prevent editing if it's in the future
        if (isFuture) return; 

        Alert.alert("Edit Record", "Update status for this class:", [
            { text: "Cancel", style: 'cancel' },
            { text: "Present ✅", onPress: () => handleMark(item, 'PRESENT') },
            { text: "Bunked ❌", onPress: () => handleMark(item, 'BUNKED') },
            { text: "Holiday 🏖️", onPress: () => handleMark(item, 'HOLIDAY') }
         ]);
    };

    return (
      <Card 
        style={[styles.card, isFuture && { opacity: 0.7 }]} // Fade out future cards slightly
        onLongPress={isFuture ? undefined : showEditMenu}   // Disable long press for future
      >
        <Card.Content>
          <View style={styles.cardRow}>
            {/* Left: Time & Subject */}
            <View style={{ flex: 1 }}>
               <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{item.subjects?.name}</Text>
               <Text variant="bodySmall" style={{ color: '#666' }}>
                 {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
               </Text>
            </View>

            {/* Right: Actions or Status */}
            <View>
              {isFuture ? (
                 // CASE 1: Future Date -> Show "Upcoming"
                 <Chip icon="clock-outline" style={{ backgroundColor: '#f5f5f5' }} textStyle={{ color: '#888' }}>
                    Upcoming
                 </Chip>
              ) : isPending ? (
                 // CASE 2: Today/Past & No Log -> Show Buttons
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button mode="contained-tonal" compact buttonColor="#ffebee" textColor="#d32f2f" onPress={() => handleMark(item, 'BUNKED')}>
                    Bunk
                  </Button>
                  <Button mode="contained-tonal" compact buttonColor="#e8f5e9" textColor="#2e7d32" onPress={() => handleMark(item, 'PRESENT')}>
                    Present
                  </Button>
                </View>
              ) : (
                 // CASE 3: Log Exists -> Show Status Chip
                <Chip 
                  icon={item.log.status === 'PRESENT' ? 'check' : item.log.status === 'HOLIDAY' ? 'beach' : 'close'} 
                  style={{ 
                      backgroundColor: item.log.status === 'PRESENT' ? '#e8f5e9' : item.log.status === 'HOLIDAY' ? '#e0f7fa' : '#ffebee' 
                  }}
                  textStyle={{ 
                      color: item.log.status === 'PRESENT' ? '#2e7d32' : item.log.status === 'HOLIDAY' ? '#006064' : '#d32f2f' 
                  }}
                  onPress={showEditMenu}
                >
                  {item.log.status}
                </Chip>
              )}
            </View>
          </View>
          
          {/* Helper text only if editable */}
          {!isPending && !isFuture && (
            <Text style={{ fontSize: 10, color: '#aaa', marginTop: 5, textAlign: 'right' }}>
                Long press to edit
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent' }}>
        <Appbar.Content title="History & Edits" />
      </Appbar.Header>

      <View style={{ padding: 10 }}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { selected: true, selectedColor: Colors.light.tint }
          }}
          theme={{
            todayTextColor: Colors.light.tint,
            arrowColor: Colors.light.tint,
            selectedDayBackgroundColor: Colors.light.tint,
          }}
        />
      </View>

      <Divider />

     <View style={styles.listContainer}>
        {/* HEADER ROW */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#666' }}>
              {new Date(selectedDate).toDateString()}
            </Text>
            
            {/* NEW: Holiday Button */}
            <Button mode="text" compact textColor="#0097a7" onPress={markWholeDayHoliday}>
                Set Holiday 🏖️
            </Button>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={combinedData}
            keyExtractor={(item) => item.id.toString() + item.start_time} // Unique key
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                <Text variant="bodyLarge">No classes scheduled.</Text>
                <Text variant="bodySmall">It was probably a weekend or holiday.</Text>
              </View>
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
});