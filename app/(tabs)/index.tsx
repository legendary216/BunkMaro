import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  RefreshControl,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Chip,
  Portal,
  Provider,
  Modal,
  List,
  Surface,
  IconButton,
  Avatar,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from "../../utils/supabase";
import { Colors } from "../../constants/theme";
import ScreenWrapper from '../ScreenWrapper';
import { handleSupabaseError } from '../../utils/errorHandler';
import { getTodayDateString, getDayIndex } from '../../utils/dateHelper';

// --- THEME CONSTANTS (Dark Mode Focused) ---
const THEME = {
  bg: '#121212',           // True Dark Background
  cardBg: '#1E1E1E',       // Dark Grey Card
  textPrimary: '#E0E0E0',  // Soft White
  textSecondary: '#A0A0A0',// Muted Grey
  accent: '#BB86FC',       // Purple Accent
  divider: '#2C2C2C',      // Dark Divider
  success: '#03DAC6',      // Teal for Success
  danger: '#CF6679',       // Soft Red for Error
  warning: '#FFB74D',      // Orange for Warning
};

// --- COMPONENT: MODERN CLASS CARD ---
// --- COMPONENT: MODERN CLASS CARD (Neon Outline) ---
const ClassCard = ({
  slot,
  log,
  onMark,
}: {
  slot: any;
  log: any;
  onMark: (status: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    "PRESENT" | "BUNKED" | "POSTPONED" | null
  >(null);
  const isMarkable = !log;

  const handlePress = async (status: "PRESENT" | "BUNKED" | "POSTPONED") => {
    setLoadingAction(status);
    await onMark(status);
    setLoadingAction(null);
    setExpanded(false);
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
      case "BUNKED": return "close"; // Changed to simple close for cleaner look
      case "HOLIDAY": return "beach";
      case "POSTPONED": return "clock-outline";
      default: return "help";
    }
  };

  return (
    <Surface style={styles.timelineCard} elevation={2}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)} 
        activeOpacity={0.8}
        style={{ flexDirection: 'row', borderRadius: 16, overflow: 'hidden' }}
      >
        {/* Left: Time Column */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>{slot.start_time.slice(0, 5)}</Text>
          <View style={styles.timeLine} />
          <Text style={[styles.timeText, { color: THEME.textSecondary, fontSize: 12 }]}>
            {slot.end_time.slice(0, 5)}
          </Text>
        </View>

        {/* Right: Info Column */}
        <View style={styles.infoColumn}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: "700", color: THEME.textPrimary, marginBottom: 2 }}>
                {slot.subjects?.name}
              </Text>
              <Text variant="bodySmall" style={{ color: THEME.textSecondary }}>
  {!isMarkable 
    ? "Status recorded"   // Case 1: Already Marked
    : expanded 
      ? "Select an action below" // Case 2: Pending & Open
      : "Tap to manage"   // Case 3: Pending & Closed
  }
</Text>
            </View>
            
            {/* --- NEON OUTLINE BADGE --- */}
            {log ? (
              <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderColor: getStatusColor(log.status),
                  borderWidth: 1.5,         // Slightly thicker border for neon effect
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: 'transparent'
              }}>
                 {/* Icon with no background */}
                 <Avatar.Icon 
                    size={18} 
                    icon={getStatusIcon(log.status)} 
                    color={getStatusColor(log.status)} 
                    style={{ backgroundColor: 'transparent', margin: 0, marginRight: 2 }} 
                 />
                 <Text style={{ 
                     color: getStatusColor(log.status), 
                     fontWeight: '900', // Extra Bold
                     fontSize: 10,
                     letterSpacing: 0.5,
                     textTransform: 'uppercase' 
                 }}>
                    {log.status}
                 </Text>
              </View>
            ) : (
              // Pending State
              <View style={{ 
                  flexDirection: 'row', alignItems: 'center', 
                  backgroundColor: '#252525', borderRadius: 8, 
                  paddingHorizontal: 10, paddingVertical: 6
              }}>
                 <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 10, letterSpacing: 0.5 }}>PENDING</Text>
              </View>
            )}
          </View>

          {/* Expanded Actions */}
          {isMarkable && expanded && (
            <View style={styles.expandedActions}>
              <Divider style={{ marginVertical: 12, backgroundColor: THEME.divider }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  mode="outlined"
                  onPress={() => handlePress("BUNKED")}
                  loading={loadingAction === "BUNKED"}
                  style={{ flex: 1, borderColor: THEME.danger }}
                  textColor={THEME.danger}
                  icon="bed"
                >
                  Bunk
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handlePress("PRESENT")}
                  loading={loadingAction === "PRESENT"}
                  style={{ flex: 1, backgroundColor: THEME.success }}
                  textColor="#000"
                  icon="check"
                >
                  Attend
                </Button>
              </View>
              <Button 
                mode="text" 
                compact 
                textColor={THEME.warning}
                style={{ marginTop: 8 }} 
                onPress={() => handlePress("POSTPONED")}
              >
                Mark as Postponed
              </Button>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Surface>
  );
};

// --- MAIN SCREEN ---
export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<any>(null);

  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, any>>({});
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<Record<number, { pct: number, buffer: number }>>({});

  const [refreshing, setRefreshing] = useState(false);
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  // --- CACHE SYSTEM ---
  const CACHE_KEY = 'dashboard_cache_v1';

  const saveToCache = async (data: any) => {
    try {
      const cachePacket = {
        timestamp: getTodayDateString(),
        data: data
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cachePacket));
    } catch (e) {
      handleSupabaseError(e, "Could not fetch schedule");
      console.log('Cache Save Failed', e); }
  };

  const loadFromCache = async () => {
    try {
      const json = await AsyncStorage.getItem(CACHE_KEY);
      if (!json) return false;

      const { timestamp, data } = JSON.parse(json);
      const todayStr = getTodayDateString().split('T')[0];
      if (timestamp !== todayStr) return false;

      setSemester(data.semester);
      setSubjects(data.subjects);
      setTodaySlots(data.todaySlots);
      setTodayLogs(data.todayLogs);
      setSubjectStats(data.subjectStats);
      
      setLoading(false);
      return true;
    } catch (e) {
      handleSupabaseError(e, "Could not fetch schedule"); 
      return false; }
  };

  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sem } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (!sem) {
        setSemester(null);
        setLoading(false);
        AsyncStorage.removeItem(CACHE_KEY);
        return;
      }
      setSemester(sem);

      const todayIndex = getDayIndex();
      const { data: slots } = await supabase
        .from("timetable_slots")
        .select("*, subjects(name)")
        .eq("semester_id", sem.id)
        .eq("day_of_week", todayIndex)
        .order("start_time");
      
      const currentSlots = slots || []; 
      setTodaySlots(currentSlots);

      const todayStr = getTodayDateString();
      const { data: dailyLogs } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("date", todayStr);
      
      const dailyMap: Record<string, any> = {};
      if (dailyLogs) {
        dailyLogs.forEach((l) => { 
          const key = `${l.subject_id}_${l.slot_time}`;
          dailyMap[key] = l; 
        });
      }
      setTodayLogs(dailyMap);

      const { data: subData } = await supabase.from("subjects").select("id, name").eq("semester_id", sem.id);
      const subList = subData || [];
      const { data: allLogs } = await supabase.from("attendance_logs").select("*").eq("semester_id", sem.id);

      const statsMap: Record<number, { pct: number, buffer: number }> = {};
      subList.forEach((s) => {
          const sLogs = allLogs?.filter((l) => 
            l.subject_id === s.id && 
            l.status !== "CANCELLED" && 
            l.status !== "POSTPONED" && 
            l.status !== "HOLIDAY"
          ) || [];
          
          const total = sLogs.length;
          const present = sLogs.filter((l) => l.status === "PRESENT").length;
          const pct = total === 0 ? 100 : Math.round((present / total) * 100);

          let buffer = 0;
          if (pct >= 75) {
              buffer = Math.floor(((4 * present) / 3) - total);
          } else {
              const needed = (3 * total) - (4 * present);
              buffer = -Math.max(1, needed);
          }
          statsMap[s.id] = { pct, buffer };
      });
      setSubjectStats(statsMap);

      const todaysSubjectIds = new Set(currentSlots.map((s) => s.subject_id));
      const sortedSubjects = [...subList].sort((a, b) => {
          const statA = statsMap[a.id]?.pct ?? 100;
          const statB = statsMap[b.id]?.pct ?? 100;
          const isDangerA = statA < 75;
          const isDangerB = statB < 75;
          if (isDangerA && !isDangerB) return -1;
          if (!isDangerA && isDangerB) return 1;
          const isTodayA = todaysSubjectIds.has(a.id);
          const isTodayB = todaysSubjectIds.has(b.id);
          if (isTodayA && !isTodayB) return -1;
          if (!isTodayA && isTodayB) return 1;
          return a.name.localeCompare(b.name);
      });
      setSubjects(sortedSubjects);

      saveToCache({
        semester: sem,
        todaySlots: currentSlots,
        todayLogs: dailyMap,
        subjects: sortedSubjects,
        subjectStats: statsMap
      });

    } catch (error: any) {
      handleSupabaseError(error, "Could not fetch schedule");
      console.log("Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const hasCache = await loadFromCache();
        fetchDashboardData(hasCache);
      };
      init();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const markAttendance = async (slot: any, status: string) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user || !semester) throw new Error("User not found");

        const todayStr = getTodayDateString();
        const { data, error } = await supabase.from('attendance_logs').insert({
            user_id: user.id, semester_id: semester.id, subject_id: slot.subject_id, 
            date: todayStr, slot_time: slot.start_time, status: status
        }).select().single();

        if(error) throw error;
        const key = `${slot.subject_id}_${slot.start_time}`;
        setTodayLogs(prev => ({ ...prev, [key]: data }));
        fetchDashboardData(true); 
    } catch(e: any) { 
      handleSupabaseError(e, "Could not fetch schedule");
       // Alert.alert('Error', e.message);
    }
  };

  const handleExtraClass = async (subjectId: number, status: 'PRESENT' | 'BUNKED') => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user || !semester) throw new Error("No active semester.");

        const todayStr = getTodayDateString();
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });

        const { error } = await supabase.from('attendance_logs').insert({
            user_id: user.id, semester_id: semester.id, subject_id: subjectId, 
            date: todayStr, slot_time: timeNow, status: status
        });

        if (error) throw error;
        setExtraModalVisible(false);
        await fetchDashboardData(false);
      } catch(e: any) {
        handleSupabaseError(e, "Could not fetch schedule");
        setLoading(false);
       // Alert.alert('Error', e.message);
      }
  };

  const handleHoliday = () => {
    Alert.alert('Mark Holiday?', 'This will mark ALL remaining classes today as "Holiday".', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Yes, Enjoy! 🏖️', 
        onPress: async () => {
          setLoading(true);
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !semester) throw new Error("Active semester not found.");

            const todayStr = getTodayDateString();
            const updates = [];
            for (const slot of todaySlots) {
              if (!todayLogs[`${slot.subject_id}_${slot.start_time}`]) {
                updates.push({
                  user_id: user.id, semester_id: semester.id, subject_id: slot.subject_id,
                  date: todayStr, slot_time: slot.start_time, status: 'HOLIDAY'
                });
              }
            }
            if (updates.length > 0) {
              const { error } = await supabase.from('attendance_logs').insert(updates);
              if (error) throw error;
              await fetchDashboardData(false); 
              Alert.alert('Success', 'Holiday marked!');
            } else {
              setLoading(false); 
              Alert.alert('Info', 'All classes are already marked!');
            }
          } catch (error: any) {
            handleSupabaseError(error, "Could not fetch schedule");
            setLoading(false);
            //Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const handleBunkToday = () => {
    Alert.alert('BUNK TODAY ?', 'Mark ALL remaining classes as "BUNKED".', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'I am sleeping 😴', 
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !semester) throw new Error("Active semester not found.");

            const todayStr = getTodayDateString();
            const updates = [];
            for (const slot of todaySlots) {
              if (!todayLogs[`${slot.subject_id}_${slot.start_time}`]) {
                updates.push({
                  user_id: user.id, semester_id: semester.id, subject_id: slot.subject_id,
                  date: todayStr, slot_time: slot.start_time, status: 'BUNKED'
                });
              }
            }
            if (updates.length > 0) {
              const { error } = await supabase.from('attendance_logs').insert(updates);
              if (error) throw error;
              await fetchDashboardData(false);
              Alert.alert('Done', 'Today marked as Bunked.');
            } else {
              setLoading(false);
              Alert.alert('Info', 'All classes are already marked!');
            }
          } catch (error: any) {
            handleSupabaseError(error, "Could not fetch schedule");
            setLoading(false);
            //Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading && !refreshing)
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: THEME.bg }]}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );

  return (
    <Provider>
      <ScreenWrapper onSwipeLeft={() => router.push('/calendar')}>

      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.textPrimary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* --- HEADER --- */}
          <View style={styles.headerContainer}>
            <View>
                <Text variant="titleMedium" style={{ color: THEME.textSecondary }}>{new Date().toDateString()}</Text>
                <Text variant="headlineMedium" style={{ fontWeight: "800", color: THEME.textPrimary }}>
                    {getGreeting()}
                </Text>
            </View>
           <TouchableOpacity onPress={() => router.push('/profile')}>
  <Avatar.Icon 
    size={48} 
    icon="account" 
    style={{ backgroundColor: THEME.cardBg }} 
    color={THEME.textPrimary} 
  />
</TouchableOpacity>
          </View>

          {!semester ? (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={{color: THEME.textPrimary}}>No active semester found.</Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => router.push("/semester-setup")} textColor={THEME.accent}>Create Semester</Button>
              </Card.Actions>
            </Card>
          ) : (
            <View>
              {/* --- SUBJECTS CAROUSEL --- */}
              {subjects.length > 0 && (
                <View style={{ marginBottom: 25 }}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Overview</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    style={{ marginHorizontal: -20 }}
                    >
                   {subjects.map((sub) => {
                     const stats = subjectStats[sub.id] || { pct: 100, buffer: 0 };
                     const { pct, buffer } = stats;
                     const isDanger = pct < 75;
                     
                     return (
                       <TouchableOpacity 
                       key={sub.id} 
                       onPress={() => router.push(`/subject/${sub.id}`)}
                       activeOpacity={0.8}
                       >
                          <Surface style={[styles.statCard, isDanger && styles.statCardDanger]} elevation={1}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                 <View>
                                    <Text variant="displaySmall" style={{ fontWeight: '800', color: isDanger ? THEME.danger : THEME.textPrimary }}>
                                        {pct}%
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: THEME.textSecondary, marginTop: -5 }}>Attendance</Text>
                                 </View>
                                 
                                 {/* Circular Icon */}
                                 <View style={[styles.iconCircle, { backgroundColor: isDanger ? THEME.danger + '20' : THEME.success + '20' }]}>
                                     <IconButton 
                                        icon={isDanger ? "alert" : "thumb-up"} 
                                        size={18} 
                                        iconColor={isDanger ? THEME.danger : THEME.success} 
                                        />
                                 </View>
                              </View>

                              {/* Progress Bar Visual */}
                              <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, marginVertical: 12, overflow: 'hidden' }}>
                                  <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: isDanger ? THEME.danger : THEME.success }} />
                              </View>

                              <View>
                                  <Text variant="titleSmall" numberOfLines={1} style={{ fontWeight: 'bold', color: THEME.textPrimary }}>
                                    {sub.name}
                                  </Text>
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: buffer < 0 ? THEME.danger : THEME.success, marginTop: 4 }}>
                                      {buffer < 0 ? `Attend next ${Math.abs(buffer)}` : `Safe to bunk ${buffer}`}
                                  </Text>
                              </View>
                          </Surface>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* --- TODAY'S SCHEDULE --- */}
              <View style={styles.scheduleHeader}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Today's Schedule</Text>
                
                {/* ACTION CHIPS ROW */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <Chip 
                        icon="bed" 
                        onPress={handleBunkToday} 
                        style={styles.actionChip} 
                        textStyle={{ fontSize: 11, color: THEME.textPrimary }}
                        >Bunk Today</Chip>
                    <Chip 
                        icon="beach" 
                        onPress={handleHoliday} 
                        style={styles.actionChip} 
                        textStyle={{ fontSize: 11, color: THEME.textPrimary }}
                        >Holiday</Chip>
                    <Chip 
                        icon="plus" 
                        onPress={() => setExtraModalVisible(true)} 
                        style={styles.actionChip} 
                        textStyle={{ fontSize: 11, color: THEME.textPrimary }}
                        >Extra</Chip>
                </ScrollView>
              </View>

              {todaySlots.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconButton icon="calendar-sleep" size={60} iconColor="#444" />
                  <Text style={{ color: THEME.textSecondary, marginTop: 10 }}>No classes scheduled today.</Text>
                  <Text style={{ color: "#555", fontSize: 12 }}>Enjoy your free time!</Text>
                </View>
              ) : (
                <View style={{ paddingBottom: 40 }}>
                    {todaySlots.map((slot) => (
                      <ClassCard
                      key={slot.id}
                      slot={slot}
                      log={todayLogs[`${slot.subject_id}_${slot.start_time}`]}
                      onMark={(status) => markAttendance(slot, status)}
                      />
                    ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* --- EXTRA CLASS MODAL --- */}
        <Portal>
          <Modal
            visible={extraModalVisible}
            onDismiss={() => setExtraModalVisible(false)}
            contentContainerStyle={styles.modal}
            >
            {/* HEADER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar.Icon size={36} icon="plus" style={{ backgroundColor: THEME.accent }} color="#000" />
                    <View>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: THEME.textPrimary }}>Extra Class</Text>
                        <Text variant="labelSmall" style={{ color: THEME.textSecondary }}>Select subject to log</Text>
                    </View>
                </View>
                <IconButton icon="close" size={20} iconColor={THEME.textSecondary} onPress={() => setExtraModalVisible(false)} />
            </View>
            
            <Divider style={{ marginBottom: 15, backgroundColor: THEME.divider }} />
            
            {/* SUBJECT LIST */}
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {subjects.map((sub) => (
                  <View key={sub.id} style={styles.subjectRow}>
                    {/* Subject Name */}
                    <Text 
                        numberOfLines={1} 
                        style={{ 
                            flex: 1, 
                            color: THEME.textPrimary, 
                            fontWeight: '600', 
                            fontSize: 15,
                            marginRight: 10 
                          }}
                          >
                        {sub.name}
                    </Text>

                    {/* Action Buttons */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <Button 
                            mode="outlined" 
                            compact 
                            textColor={THEME.danger} 
                            style={{ borderColor: THEME.danger, borderWidth: 1 }}
                            labelStyle={{ marginHorizontal: 10, fontSize: 12 }}
                            onPress={() => handleExtraClass(sub.id, "BUNKED")}
                            >
                        Bunk
                        </Button>

                        <Button 
                            mode="contained" 
                            compact 
                            buttonColor={THEME.success}
                            textColor="#000" // Black text on Teal looks sharp
                            labelStyle={{ marginHorizontal: 10, fontSize: 12, fontWeight: 'bold' }}
                            onPress={() => handleExtraClass(sub.id, "PRESENT")}
                            >
                        Attend
                        </Button>
                    </View>
                </View>
                ))}
            </ScrollView>
          </Modal>
        </Portal>
      </SafeAreaView>
</ScreenWrapper>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20 },
  headerContainer: { 
    flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 30,
      marginTop: 10
  },
  card: { marginBottom: 16, backgroundColor: THEME.cardBg, borderRadius: 12 },
  sectionTitle: { fontWeight: "800", color: THEME.textPrimary, marginBottom: 15, fontSize: 18 },
  
  // STATS CARDS
  statCard: { 
      marginRight: 12, 
      width: 160, // Increased Width slightly
      height: 160, // Increased Height so it doesn't look squashed
      backgroundColor: THEME.cardBg, 
      borderRadius: 16, 
      padding: 16, // More padding
      justifyContent: 'space-between'
  },
  statCardDanger: {
      borderWidth: 1,
      borderColor: THEME.danger
  },
  iconCircle: {
      width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', margin: -8
  },

  // SCHEDULE
  scheduleHeader: {
      flexDirection: 'column', 
      marginBottom: 15, 
      gap: 10
  },
  actionChip: {
      backgroundColor: THEME.cardBg,
      borderWidth: 1,
      borderColor: '#333'
  },
  
  // TIMELINE CARD
  timelineCard: {
      marginBottom: 16,
      backgroundColor: THEME.cardBg,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
  },
  timeColumn: {
      width: 60,
      backgroundColor: '#252525', // Slightly lighter than Card BG
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRightWidth: 1,
      borderRightColor: '#333'
  },
  timeText: {
      fontWeight: 'bold',
      fontSize: 16,
      color: THEME.textPrimary
  },
  timeLine: {
      height: 15,
      width: 2,
      backgroundColor: '#444',
      marginVertical: 4,
      borderRadius: 1
  },
  infoColumn: {
      flex: 1,
      padding: 15,
      justifyContent: 'center'
  },
  miniBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      paddingVertical: 2,
      paddingRight: 0,
      marginLeft: 5
  },
  expandedActions: {
      marginTop: 5,
  },

  // EMPTY STATE
  emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      opacity: 0.8
  },

  // MODAL
 modal: {
    backgroundColor: THEME.cardBg, // #1E1E1E
    padding: 20,
    margin: 20,
    borderRadius: 24, // Softer, more modern corners
    borderWidth: 1,
    borderColor: '#333', // Subtle border to make it pop against the dark background
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  subjectRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#2A2A2A', // Slightly lighter than modal bg
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 8,
  }
});