import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Divider, Button, IconButton, Avatar, Surface, Provider, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../utils/supabase';

// --- THEME CONSTANTS ---
const THEME = {
  bg: '#121212',           
  cardBg: '#1E1E1E',       
  textPrimary: '#E0E0E0',  
  textSecondary: '#A0A0A0',
  accent: '#BB86FC',       
  divider: '#333',      
  success: '#03DAC6',      
  danger: '#CF6679',       
  warning: '#FFB74D',      
};

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [semesterId, setSemesterId] = useState<any>(null);

  // 1. Get Active Semester ID
  useEffect(() => {
    const getSem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('semesters').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (data) setSemesterId(data.id);
    };
    getSem();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (semesterId) fetchDataForDate(selectedDate);
  }, [selectedDate, semesterId]);

  const fetchDataForDate = async (date: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !semesterId) return;

      const dayIndex = new Date(date + "T12:00:00").getDay();

      const { data: slots } = await supabase
        .from('timetable_slots')
        .select('*, subjects(name)')
        .eq('semester_id', semesterId)
        .eq('day_of_week', dayIndex)
        .order('start_time');

      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('semester_id', semesterId)
        .eq('date', date);

      const merged = (slots || []).map(slot => {
        const foundLog = logs?.find(l => l.subject_id === slot.subject_id && l.slot_time === slot.start_time);
        return {
          ...slot,
          log: foundLog || null 
        };
      });

      setCombinedData(merged);
    } catch (e: any) {
      console.log(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Mark Attendance
  const handleMark = async (item: any, status: string) => {
    try {
      // Optimistic UI Update (Optional, but makes it snappy)
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        semester_id: semesterId,
        subject_id: item.subject_id,
        date: selectedDate,
        slot_time: item.start_time,
        status: status
      };

      const { error } = await supabase.from('attendance_logs').upsert(payload);
      if (error) throw error;
      
      await fetchDataForDate(selectedDate);

    } catch (e: any) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  const markWholeDayHoliday = () => {
    Alert.alert(
      'Mark Holiday?',
      `Mark ${new Date(selectedDate).toDateString()} as a Holiday?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Holiday 🏖️',
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user || !semesterId) return;

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

              const { error } = await supabase.from('attendance_logs').upsert(updates);
              if (error) throw error;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return THEME.success;
      case "BUNKED": return THEME.danger;
      case "HOLIDAY": return "#4FC3F7"; 
      case "POSTPONED": return THEME.warning;
      default: return "#757575";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT": return "check";
      case "BUNKED": return "close";
      case "HOLIDAY": return "beach";
      case "POSTPONED": return "clock-outline";
      default: return "help";
    }
  };

  // --- RENDER ITEM (TIMELINE STYLE) ---
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isFuture = selectedDate > todayStr;

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isPending = !item.log;
    const isLast = index === combinedData.length - 1;

    const showEditMenu = () => {
        if (isFuture) return; 
        Alert.alert("Edit Record", "Update status for this class:", [
            { text: "Cancel", style: 'cancel' },
            { text: "Present ✅", onPress: () => handleMark(item, 'PRESENT') },
            { text: "Bunked ❌", onPress: () => handleMark(item, 'BUNKED') },
            { text: "Holiday 🏖️", onPress: () => handleMark(item, 'HOLIDAY') }
         ]);
    };

    return (
      <View style={{ flexDirection: 'row', opacity: isFuture ? 0.6 : 1 }}>
        {/* Left: Time */}
        <View style={{ width: 60, alignItems: 'flex-end', marginRight: 15 }}>
            <Text style={{ color: THEME.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                {item.start_time.slice(0, 5)}
            </Text>
            <Text style={{ color: THEME.textSecondary, fontSize: 12 }}>
                {item.end_time.slice(0, 5)}
            </Text>
        </View>

        {/* Middle: Timeline */}
        <View style={{ alignItems: 'center' }}>
            <View style={{ 
                width: 12, height: 12, borderRadius: 6, 
                backgroundColor: item.log ? getStatusColor(item.log.status) : (isFuture ? '#333' : '#555'), 
                borderWidth: 2, borderColor: THEME.bg,
                zIndex: 1
            }} />
            {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: '#333', marginVertical: -2 }} />}
        </View>

        {/* Right: Content Card */}
        <TouchableOpacity 
            activeOpacity={isFuture ? 1 : 0.7}
            onLongPress={isFuture ? undefined : showEditMenu}
            style={{ flex: 1, paddingBottom: 25, paddingLeft: 15 }}
        >
            <Surface style={styles.timelineCard} elevation={1}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ color: THEME.textPrimary, fontWeight: 'bold' }}>
                            {item.subjects?.name}
                        </Text>
                        
                        {/* Logic for Status Display */}
                        <View style={{ marginTop: 8 }}>
                            {isFuture ? (
                                <View style={styles.badgePending}>
                                    <Text style={styles.badgeTextPending}>UPCOMING</Text>
                                </View>
                            ) : isPending ? (
                                // Pending: Show Buttons
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <Button 
                                        mode="contained" 
                                        compact 
                                        buttonColor={THEME.success} 
                                        textColor="#000"
                                        labelStyle={{ fontSize: 11, marginHorizontal: 10 }}
                                        onPress={() => handleMark(item, 'PRESENT')}
                                    >
                                        Attend
                                    </Button>
                                    <Button 
                                        mode="outlined" 
                                        compact 
                                        textColor={THEME.danger} 
                                        style={{ borderColor: THEME.danger }}
                                        labelStyle={{ fontSize: 11, marginHorizontal: 10 }}
                                        onPress={() => handleMark(item, 'BUNKED')}
                                    >
                                        Bunk
                                    </Button>
                                </View>
                            ) : (
                                // Marked: Show Neon Badge
                                <View style={[styles.badgeNeon, { borderColor: getStatusColor(item.log.status) }]}>
                                     <Avatar.Icon 
                                        size={16} 
                                        icon={getStatusIcon(item.log.status)} 
                                        color={getStatusColor(item.log.status)} 
                                        style={{ backgroundColor: 'transparent', margin: 0, marginRight: 4 }} 
                                     />
                                     <Text style={{ color: getStatusColor(item.log.status), fontWeight: 'bold', fontSize: 10 }}>
                                         {item.log.status}
                                     </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Surface>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
      <View style={{ padding: 15 }}>
          <Text variant="headlineMedium" style={{ fontWeight: "bold", color: THEME.textPrimary }}>History</Text>
      </View>

      {/* CALENDAR COMPONENT */}
      <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
        <Calendar
          // Force re-render if theme changes (optional but good practice)
          key={'dark-calendar'} 
          current={selectedDate}
          onDayPress={(day: any) => setSelectedDate(day.dateString)}
          markedDates={{
            [selectedDate]: { 
                selected: true, 
                selectedColor: THEME.accent, 
                selectedTextColor: '#000000' 
            }
          }}
          // CRITICAL: Explicitly set backgrounds to the Dark Hex Code
          theme={{
            backgroundColor: THEME.bg,        // #121212
            calendarBackground: THEME.bg,     // #121212
            textSectionTitleColor: THEME.textSecondary,
            selectedDayBackgroundColor: THEME.accent,
            selectedDayTextColor: '#000000',
            todayTextColor: THEME.accent,
            dayTextColor: THEME.textPrimary,  // White text
            textDisabledColor: '#333333',     // Dark grey for disabled days
            dotColor: THEME.accent,
            monthTextColor: THEME.textPrimary,
            indicatorColor: THEME.accent,
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            arrowColor: THEME.accent,
          }}
        />
      </View>

      <Divider style={{ backgroundColor: THEME.divider }} />

      <View style={styles.listContainer}>
        {/* HEADER ROW */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: THEME.textSecondary }}>
              {new Date(selectedDate).toDateString()}
            </Text>
            
            {!isFuture && (
                <TouchableOpacity onPress={markWholeDayHoliday}>
                    <Text style={{ color: '#4FC3F7', fontWeight: 'bold' }}>Set Holiday 🏖️</Text>
                </TouchableOpacity>
            )}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={THEME.accent} />
        ) : (
          <FlatList
            data={combinedData}
            keyExtractor={(item) => item.id.toString() + item.start_time}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40, opacity: 0.5 }}>
                <IconButton icon="calendar-blank" size={50} iconColor={THEME.textSecondary} />
                <Text style={{ color: THEME.textSecondary }}>No classes on this date.</Text>
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
  
  timelineCard: {
      backgroundColor: THEME.cardBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#333'
  },
  
  // Badges
  badgePending: {
      backgroundColor: '#252525', 
      borderRadius: 6, 
      alignSelf: 'flex-start',
      paddingHorizontal: 8, 
      paddingVertical: 4
  },
  badgeTextPending: {
      color: '#666', 
      fontWeight: 'bold', 
      fontSize: 10
  },
  badgeNeon: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      alignSelf: 'flex-start'
  }
});