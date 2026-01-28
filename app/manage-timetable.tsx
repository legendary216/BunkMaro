import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Alert,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from "react-native";
import {
  Text,
  Button,
  Modal,
  Portal,
  Provider,
  ActivityIndicator,
  Surface,
  IconButton,
  Divider
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

import { supabase } from "../utils/supabase";

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
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ManageTimetableScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // State
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [slots, setSlots] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Refs for Swipe & Scroll
  const scrollRef = useRef<ScrollView>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  // Modal State
  const [visible, setVisible] = useState(false);
  const [newSlotSubject, setNewSlotSubject] = useState<number | null>(null);

  // Time State
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (semesterId) fetchSlots(semesterId, selectedDay);
    
    // Auto-scroll the day tabs when selectedDay changes
    if (scrollRef.current) {
        // Simple calculation: roughly 70px per tab. 
        // Centers the active tab slightly.
        scrollRef.current.scrollTo({ x: (selectedDay * 70) - (SCREEN_WIDTH / 2) + 35, animated: true });
    }
  }, [selectedDay, semesterId]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sem } = await supabase
        .from("semesters")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      if (!sem) {
        router.back();
        return;
      }
      setSemesterId(sem.id);
      const { data: subData } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("semester_id", sem.id);
      if (subData) setSubjects(subData);
    } catch (error) {
      console.log(error);
    }
    finally{
      setLoading(false);
    }
  }

  async function fetchSlots(semId: number, day: number) {
    setLoading(true);
    setSlots([]); // Clear list for "Full Loader" effect
    
    const { data } = await supabase
      .from("timetable_slots")
      .select("*, subjects(name)")
      .eq("semester_id", semId)
      .eq("day_of_week", day)
      .order("start_time");
      
    if (data) setSlots(data);
    setLoading(false);
  }

  // --- SWIPE LOGIC ---
  const handleTouchStart = (e: any) => {
      touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const handleTouchEnd = (e: any) => {
      const touchEnd = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      
      const dx = touchStart.current.x - touchEnd.x;
      const dy = touchStart.current.y - touchEnd.y;

      // 1. Check if horizontal swipe is dominant (more than vertical scroll)
      if (Math.abs(dx) > Math.abs(dy)) {
          // 2. Check threshold (must swipe at least 50px)
          if (Math.abs(dx) > 50) {
              if (dx > 0) {
                  // Swiped Left -> Next Day
                  if (selectedDay < 6) setSelectedDay(prev => prev + 1);
              } else {
                  // Swiped Right -> Prev Day
                  if (selectedDay > 0) setSelectedDay(prev => prev - 1);
              }
          }
      }
  };

  // ... (Keep existing Modal/Delete/TimePicker logic same as before) ...
  const showTimePicker = (mode: "start" | "end") => {
    DateTimePickerAndroid.open({
      value: mode === "start" ? startTime : endTime,
      onChange: (event, date) => {
        if (event.type === "set" && date) {
          if (mode === "start") setStartTime(date);
          else setEndTime(date);
        }
      },
      mode: "time",
      is24Hour: false,
    });
  };

  async function handleAddSlot() {
    if (!newSlotSubject || !semesterId) {
      Alert.alert("Validation", "Please select a subject.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("timetable_slots").insert({
        semester_id: semesterId,
        subject_id: newSlotSubject,
        day_of_week: selectedDay,
        start_time: startTime.toLocaleTimeString("en-US", { hour12: false }),
        end_time: endTime.toLocaleTimeString("en-US", { hour12: false }),
      });
      if (error) throw error;
      setVisible(false);
      setNewSlotSubject(null);
      fetchSlots(semesterId, selectedDay);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    await supabase.from("timetable_slots").delete().eq("id", id);
    if (semesterId) fetchSlots(semesterId, selectedDay);
  }

  if (loading && subjects.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg }}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  return (
    <Provider>
      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
            <IconButton icon="arrow-left" iconColor={THEME.textPrimary} size={24} onPress={() => router.back()} />
            <Text variant="titleLarge" style={{ fontWeight: "bold", color: THEME.textPrimary }}>
              Edit Timetable
            </Text>
            <View style={{ width: 48 }} /> 
        </View>

        {/* --- DAY SELECTOR --- */}
        <View style={styles.dayTabs}>
          <ScrollView 
            ref={scrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {DAYS.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayButton,
                  selectedDay === index && {
                    backgroundColor: THEME.accent + '20',
                    borderColor: THEME.accent,
                  },
                ]}
                onPress={() => setSelectedDay(index)}
              >
                <Text
                  style={{ 
                      color: selectedDay === index ? THEME.accent : THEME.textSecondary,
                      fontWeight: selectedDay === index ? 'bold' : 'normal'
                  }}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- CONTENT AREA (SWIPEABLE) --- */}
        <View 
            style={{ flex: 1 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={THEME.accent} />
                <Text style={{ marginTop: 15, color: THEME.textSecondary }}>Fetching schedule...</Text>
            </View>
            ) : (
            <FlatList
                data={slots}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                <Surface style={styles.card} elevation={1}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={styles.timeBox}>
                            <Text style={{ color: THEME.textPrimary, fontWeight: 'bold' }}>{item.start_time.slice(0, 5)}</Text>
                            <Text style={{ color: THEME.textSecondary, fontSize: 10 }}>{item.end_time.slice(0, 5)}</Text>
                        </View>
                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text 
                                variant="titleMedium" 
                                numberOfLines={1} 
                                ellipsizeMode="tail"
                                style={{ color: THEME.textPrimary, fontWeight: '600' }}
                            >
                                {item.subjects?.name || "Unknown"}
                            </Text>
                        </View>
                    </View>
                    
                    <IconButton 
                        icon="close-circle-outline" 
                        iconColor={THEME.danger} 
                        size={22}
                        onPress={() => handleDelete(item.id)}
                        style={{ margin: 0 }}
                    />
                </Surface>
                )}
                ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                    <IconButton icon="gesture-swipe" size={50} iconColor={THEME.textSecondary} />
                    <Text style={{ color: THEME.textSecondary }}>No classes on {DAYS[selectedDay]}.</Text>
                    <Text style={{ color: '#444', fontSize: 12 }}>Swipe left/right to change days</Text>
                </View>
                }
            />
            )}
        </View>

        <Button
          mode="contained"
          icon="plus"
          onPress={() => setVisible(true)}
          style={styles.fab}
          buttonColor={THEME.accent}
          textColor="#000"
        >
          Add Class to {DAYS[selectedDay]}
        </Button>

        {/* --- ADD MODAL (Same as before) --- */}
        <Portal>
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={styles.modal}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: THEME.textPrimary }}>Add Class</Text>
                <IconButton icon="close" size={20} iconColor={THEME.textSecondary} onPress={() => setVisible(false)} />
            </View>

            <Text style={{ marginBottom: 10, color: THEME.textSecondary }}>Select Subject:</Text>

            <View style={styles.subjectContainer}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[
                    styles.chip,
                    newSlotSubject === sub.id && {
                      backgroundColor: THEME.accent,
                      borderColor: THEME.accent,
                    },
                  ]}
                  onPress={() => setNewSlotSubject(sub.id)}
                >
                  <Text
                    style={{
                      color: newSlotSubject === sub.id ? "#000" : THEME.textPrimary,
                      fontWeight: newSlotSubject === sub.id ? 'bold' : 'normal'
                    }}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Divider style={{ marginVertical: 20, backgroundColor: THEME.divider }} />

            <View style={styles.timeRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: THEME.textSecondary, marginBottom: 5 }}>Start Time</Text>
                <Button 
                    mode="outlined" 
                    onPress={() => showTimePicker("start")} 
                    textColor={THEME.textPrimary}
                    style={{ borderColor: THEME.textSecondary }}
                >
                  {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Button>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: THEME.textSecondary, marginBottom: 5 }}>End Time</Text>
                <Button 
                    mode="outlined" 
                    onPress={() => showTimePicker("end")} 
                    textColor={THEME.textPrimary}
                    style={{ borderColor: THEME.textSecondary }}
                >
                  {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Button>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleAddSlot}
              style={{ marginTop: 30 }}
              buttonColor={THEME.success}
              textColor="#000"
            >
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  
  // DAY TABS
  dayTabs: { paddingVertical: 10, paddingLeft: 20 },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: THEME.cardBg,
    borderWidth: 1,
    borderColor: '#333'
  },
  
  // LIST
  listContent: { padding: 20 },
  card: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: THEME.cardBg,
      marginBottom: 12,
      borderRadius: 12,
      padding: 12,
  },
  timeBox: {
      backgroundColor: '#2A2A2A',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      alignItems: 'center',
      minWidth: 60
  },
  
  fab: { margin: 20 },
  
  // MODAL
  modal: {
    backgroundColor: THEME.cardBg,
    padding: 24,
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 10
  },
  subjectContainer: {
    flexDirection: "row",
    flexWrap: "wrap", 
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: '#333',
  },
  timeRow: { flexDirection: "row", justifyContent: "space-between" },
});