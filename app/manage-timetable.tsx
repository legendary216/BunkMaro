import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Appbar, List, Modal, Portal, Provider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ManageTimetableScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Modal State
  const [visible, setVisible] = useState(false);
  const [newSlotSubject, setNewSlotSubject] = useState<number | null>(null);
  
  // Time State
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  // ... (Initial Load and Fetch Logic remains the same) ...
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (semesterId) fetchSlots(semesterId, selectedDay); }, [selectedDay, semesterId]);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sem } = await supabase.from('semesters').select('id').eq('user_id', user.id).eq('is_active', true).single();
      if (!sem) { router.back(); return; }
      setSemesterId(sem.id);
      const { data: subData } = await supabase.from('subjects').select('id, name').eq('semester_id', sem.id);
      if (subData) setSubjects(subData);
    } catch (error) { console.log(error); }
  }

  async function fetchSlots(semId: number, day: number) {
    setLoading(true);
    const { data } = await supabase
      .from('timetable_slots')
      .select('*, subjects(name)')
      .eq('semester_id', semId)
      .eq('day_of_week', day)
      .order('start_time');
    setLoading(false);
    if (data) setSlots(data);
  }

  const showTimePicker = (mode: 'start' | 'end') => {
    DateTimePickerAndroid.open({
      value: mode === 'start' ? startTime : endTime,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          if (mode === 'start') setStartTime(date);
          else setEndTime(date);
        }
      },
      mode: 'time', is24Hour: false,
    });
  };

  async function handleAddSlot() {
    if (!newSlotSubject || !semesterId) {
      Alert.alert('Validation', 'Please select a subject.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('timetable_slots').insert({
        semester_id: semesterId,
        subject_id: newSlotSubject,
        day_of_week: selectedDay,
        start_time: startTime.toLocaleTimeString('en-US', { hour12: false }),
        end_time: endTime.toLocaleTimeString('en-US', { hour12: false })
      });

      if (error) throw error;

      setVisible(false);
      
      // FIX 1: Reset the selected subject for the next entry
      setNewSlotSubject(null); 
      
      fetchSlots(semesterId, selectedDay);
      
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await supabase.from('timetable_slots').delete().eq('id', id);
    if (semesterId) fetchSlots(semesterId, selectedDay);
  }

  return (
    <Provider>
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
        <Appbar.Header style={{ backgroundColor: 'transparent' }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Edit Timetable" />
        </Appbar.Header>

        <View style={styles.dayTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dayButton, selectedDay === index && { backgroundColor: Colors.light.tint }]}
                onPress={() => setSelectedDay(index)}
              >
                <Text style={{ color: selectedDay === index ? '#fff' : '#000' }}>{day}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={slots}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={() => semesterId && fetchSlots(semesterId, selectedDay)}
          renderItem={({ item }) => (
            <List.Item
              title={item.subjects?.name || 'Unknown Subject'}
              description={`${item.start_time.slice(0,5)} - ${item.end_time.slice(0,5)}`}
              left={props => <List.Icon {...props} icon="clock-outline" />}
              right={props => <Button textColor="red" onPress={() => handleDelete(item.id)}>Remove</Button>}
              style={styles.listItem}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No classes on {DAYS[selectedDay]}.</Text>}
        />

        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => setVisible(true)}
          style={styles.fab}
          buttonColor={Colors.light.tint}
        >
          Add Class to {DAYS[selectedDay]}
        </Button>

        <Portal>
          <Modal visible={visible} onDismiss={() => setVisible(false)} contentContainerStyle={styles.modal}>
            <Text variant="titleLarge" style={{ marginBottom: 20 }}>Add Class</Text>
            
            <Text style={{ marginBottom: 10, opacity: 0.7 }}>Select Subject:</Text>
            
            {/* FIX 2: Replaced ScrollView with a wrapping View */}
            <View style={styles.subjectContainer}>
              {subjects.map((sub) => (
                <TouchableOpacity 
                  key={sub.id} 
                  style={[
                    styles.chip, 
                    newSlotSubject === sub.id && { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint }
                  ]}
                  onPress={() => setNewSlotSubject(sub.id)}
                >
                  <Text style={{ color: newSlotSubject === sub.id ? '#fff' : '#000' }}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View>
                <Text>Start Time</Text>
                <Button mode="outlined" onPress={() => showTimePicker('start')}>
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Button>
              </View>
              <View>
                <Text>End Time</Text>
                <Button mode="outlined" onPress={() => showTimePicker('end')}>
                  {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Button>
              </View>
            </View>

            <Button mode="contained" onPress={handleAddSlot} style={{ marginTop: 20 }}>
              Save Class
            </Button>
          </Modal>
        </Portal>

      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayTabs: { paddingVertical: 10, paddingLeft: 10 },
  dayButton: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginRight: 8,
    backgroundColor: '#eee',
  },
  listContent: { padding: 20 },
  listItem: { backgroundColor: 'white', marginBottom: 8, borderRadius: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, opacity: 0.5 },
  fab: { margin: 20 },
  modal: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 10 },
  
  // Updated Styles for Subjects
  subjectContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', // Allows items to wrap to next line
    marginBottom: 20 
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, 
    marginRight: 8, marginBottom: 8, // Spacing between chips
    backgroundColor: '#f0f0f0', 
    borderWidth: 1, borderColor: '#ddd',
  },
  
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' }
});