import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  RefreshControl,
  ScrollView,
  Alert,
  TouchableOpacity,
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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { supabase } from "../../utils/supabase";
import { Colors } from "../../constants/theme";

// ... (ClassCard remains EXACTLY the same, keep it here) ...
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
  };

  const renderStatusChip = () => {
    if (!log) return <Chip icon="clock-outline">Pending</Chip>;
    switch (log.status) {
      case "PRESENT":
        return (
          <Chip
            icon="check-circle"
            style={{ backgroundColor: "#e8f5e9" }}
            textStyle={{ color: "#2e7d32" }}
          >
            Present
          </Chip>
        );
      case "BUNKED":
        return (
          <Chip
            icon="close-circle"
            style={{ backgroundColor: "#ffebee" }}
            textStyle={{ color: "#d32f2f" }}
          >
            Bunked
          </Chip>
        );
      case "POSTPONED":
        return (
          <Chip
            icon="calendar-clock"
            style={{ backgroundColor: "#fff3e0" }}
            textStyle={{ color: "#e65100" }}
          >
            Postponed
          </Chip>
        );
      case "HOLIDAY":
        return (
          <Chip
            icon="beach"
            style={{ backgroundColor: "#e0f7fa" }}
            textStyle={{ color: "#006064" }}
          >
            Holiday
          </Chip>
        );

      default:
        return <Chip>Unknown</Chip>;
    }
  };

  return (
    <Card style={styles.classCard} onPress={() => setExpanded(!expanded)}>
      <Card.Content>
        <View style={styles.classRow}>
          <View style={styles.textContainer}>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "bold" }}
              numberOfLines={expanded ? undefined : 1}
            >
              {slot.subjects?.name}
            </Text>
            <Text variant="bodySmall" style={{ color: "#666" }}>
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </Text>
          </View>
          {renderStatusChip()}
        </View>
        {isMarkable && expanded && (
          <View>
            <View style={styles.actionRow}>
              <Button
                mode="contained"
                onPress={() => handlePress("BUNKED")}
                loading={loadingAction === "BUNKED"}
                disabled={loadingAction !== null}
                style={[styles.actionBtn, { backgroundColor: "#ef5350" }]}
              >
                Bunk 😈
              </Button>
              <Button
                mode="contained"
                onPress={() => handlePress("PRESENT")}
                loading={loadingAction === "PRESENT"}
                disabled={loadingAction !== null}
                style={[styles.actionBtn, { backgroundColor: "#66bb6a" }]}
              >
                Present 😇
              </Button>
            </View>
            <Button
              mode="text"
              textColor="#f57c00"
              compact
              onPress={() => handlePress("POSTPONED")}
              loading={loadingAction === "POSTPONED"}
              disabled={loadingAction !== null}
              style={{ marginTop: 5 }}
            >
              Lecture Postponed
            </Button>
          </View>
        )}
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
  const [todayLogs, setTodayLogs] = useState<Record<number, any>>({});
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectStats, setSubjectStats] = useState<Record<number, number>>({});

  const [refreshing, setRefreshing] = useState(false);
  const [extraModalVisible, setExtraModalVisible] = useState(false);

  // isBackground = true  -> Don't show full screen spinner (for marking attendance/refreshing)
  // isBackground = false -> Show full screen spinner (for tab switching)
  const fetchDashboardData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sem } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      setSemester(sem);

      if (!sem) {
        setSemester(null);
        setLoading(false);
        return;
      }

      if (sem) {
        const todayIndex = new Date().getDay();
        const { data: slots } = await supabase
          .from("timetable_slots")
          .select("*, subjects(name)")
          .eq("semester_id", sem.id)
          .eq("day_of_week", todayIndex)
          .order("start_time");
        if (slots) setTodaySlots(slots);

        const todaysSubjectIds = new Set(slots?.map((s) => s.subject_id));
        const todayStr = new Date().toISOString().split("T")[0];
        const { data: dailyLogs } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("date", todayStr);
        const dailyMap: Record<number, any> = {};
        if (dailyLogs)
          dailyLogs.forEach((l) => {
            dailyMap[l.subject_id] = l;
          });
        setTodayLogs(dailyMap);

        const { data: subData } = await supabase
          .from("subjects")
          .select("id, name")
          .eq("semester_id", sem.id);
        const subList = subData || [];

        const { data: allLogs } = await supabase
          .from("attendance_logs")
          .select("*")
          .eq("semester_id", sem.id);

        const statsMap: Record<number, number> = {};
        subList.forEach((s) => {
          const sLogs =
            allLogs?.filter(
              (l) =>
                l.subject_id === s.id &&
                l.status !== "CANCELLED" &&
                l.status !== "POSTPONED" &&
                l.status !== "HOLIDAY",
            ) || [];
          const total = sLogs.length;
          const present = sLogs.filter((l) => l.status === "PRESENT").length;
          statsMap[s.id] =
            total === 0 ? 100 : Math.round((present / total) * 100);
        });
        setSubjectStats(statsMap);

        const sortedSubjects = [...subList].sort((a, b) => {
          const statA = statsMap[a.id] ?? 100;
          const statB = statsMap[b.id] ?? 100;
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
      }
    } catch (error: any) {
      console.log("Error:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false);
    }, []),
  );
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

 const markAttendance = async (slot: any, status: string) => {
    try {
        // We don't set global 'setLoading(true)' here because ClassCard has its own spinner.
        // This prevents the whole screen from flashing white when you mark just one class.
        
        const { data: { user } } = await supabase.auth.getUser();
        if(!user || !semester) throw new Error("User not found");

        const todayStr = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase.from('attendance_logs').insert({
            user_id: user.id, semester_id: semester.id, subject_id: slot.subject_id, 
            date: todayStr, slot_time: slot.start_time, status: status
        }).select().single();

        if(error) throw error;
        
        // Optimistic Update: Update local state immediately
        setTodayLogs(prev => ({ ...prev, [slot.subject_id]: data }));
        
        // Background Refresh (doesn't block UI)
        fetchDashboardData(true); 

    } catch(e: any) { 
        Alert.alert('Error', e.message);
    }
  };

  const handleExtraClass = async (subjectId: number, status: 'PRESENT' | 'BUNKED') => {
      // 1. START LOADER
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user || !semester) throw new Error("No active semester.");

        const todayStr = new Date().toISOString().split('T')[0];
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });

        const { error } = await supabase.from('attendance_logs').insert({
            user_id: user.id, 
            semester_id: semester.id, 
            subject_id: subjectId, 
            date: todayStr, 
            slot_time: timeNow, 
            status: status
        });

        if (error) throw error;

        // 2. SUCCESS: Close modal and Refresh
        setExtraModalVisible(false);
        await fetchDashboardData(false); // Refreshes and then turns off spinner

      } catch(e: any) {
        // 3. ERROR
        setLoading(false);
        Alert.alert('Error', e.message);
      }
  };

  const handleHoliday = () => {
    Alert.alert('Mark Holiday?', 'This will mark ALL remaining classes today as "Holiday".', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Yes, Enjoy! 🏖️', 
        onPress: async () => {
          // 1. START LOADER (Blocks interaction)
          setLoading(true);
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !semester) throw new Error("Active semester not found.");

            const todayStr = new Date().toISOString().split('T')[0];
            const updates = [];

            // Loop through today's slots to find pending ones
            for (const slot of todaySlots) {
              if (!todayLogs[slot.subject_id]) {
                updates.push({
                  user_id: user.id,
                  semester_id: semester.id,
                  subject_id: slot.subject_id,
                  date: todayStr,
                  slot_time: slot.start_time,
                  status: 'HOLIDAY'
                });
              }
            }

            if (updates.length > 0) {
              const { error } = await supabase.from('attendance_logs').insert(updates);
              if (error) throw error; // Go to catch block if DB fails

              // 2. SUCCESS: Refresh Data (Spinner stays on until this finishes)
              await fetchDashboardData(false); 
              Alert.alert('Success', 'Holiday marked! Enjoy your day.');
            } else {
              // Nothing to update
              setLoading(false); 
              Alert.alert('Info', 'All classes are already marked!');
            }

          } catch (error: any) {
            // 3. ERROR HANDLER
            setLoading(false); // Turn off loader manually
            Alert.alert('Error', error.message || 'Something went wrong.');
          }
        }
      }
    ]);
  };

  if (loading && !refreshing)
    return (
      <View style={[styles.center, { flex: 1 }]}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );

  return (
    <Provider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: Colors.light.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={{ fontWeight: "bold" }}>
              Dashboard
            </Text>
            <Text variant="bodyLarge" style={{ color: Colors.light.icon }}>
              {new Date().toDateString()}
            </Text>
          </View>

          {!semester ? (
            <Card style={styles.card}>
              <Card.Content>
                <Text>No active semester.</Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => router.push("/semester-setup")}>
                  Start
                </Button>
              </Card.Actions>
            </Card>
          ) : (
            <View>
              {/* SMART SCROLL LIST */}
              {subjects.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: 20 }}
                  >
                    {subjects.map((sub) => {
                      const pct = subjectStats[sub.id] ?? 100;
                      const isDanger = pct < 75;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => router.push(`/subject/${sub.id}`)}
                          activeOpacity={0.8}
                        >
                          <Card
                            style={{
                              marginRight: 12,
                              width: 140,
                              backgroundColor: isDanger ? "#ffebee" : "white",
                              borderColor: isDanger ? "#ef5350" : "transparent",
                              borderWidth: isDanger ? 1 : 0,
                            }}
                          >
                            <Card.Content
                              style={{
                                alignItems: "center",
                                paddingVertical: 10,
                              }}
                            >
                              <Text
                                variant="displaySmall"
                                style={{
                                  fontWeight: "bold",
                                  color: isDanger ? "#d32f2f" : "#2e7d32",
                                }}
                              >
                                {pct}%
                              </Text>
                              <Text
                                variant="labelMedium"
                                numberOfLines={1}
                                style={{
                                  marginTop: 5,
                                  fontWeight: isDanger ? "bold" : "normal",
                                }}
                              >
                                {sub.name}
                              </Text>
                            </Card.Content>
                          </Card>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="titleLarge" style={styles.sectionTitle}>
                  Today's Classes
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setExtraModalVisible(true)}
                >
                  + Extra Class
                </Button>
                <Button
                  mode="text"
                  compact
                  onPress={handleHoliday}
                  textColor="#f57c00"
                >
                  Holiday
                </Button>
              </View>

              {todaySlots.length === 0 ? (
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={{ textAlign: "center", opacity: 0.6 }}>
                      No classes scheduled today.
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                todaySlots.map((slot) => (
                  <ClassCard
                    key={slot.id}
                    slot={slot}
                    log={todayLogs[slot.subject_id]}
                    onMark={(status) => markAttendance(slot, status)}
                  />
                ))
              )}

              {/* REMOVED: Manage Buttons are now in Profile */}
            </View>
          )}
        </ScrollView>

        <Portal>
          <Modal
            visible={extraModalVisible}
            onDismiss={() => setExtraModalVisible(false)}
            contentContainerStyle={styles.modal}
          >
            <Text variant="titleLarge" style={{ marginBottom: 15 }}>
              Log Extra Class
            </Text>
            {subjects.map((sub) => (
              <List.Item
                key={sub.id}
                title={sub.name}
                right={(props) => (
                  <View style={{ flexDirection: "row" }}>
                    <Button onPress={() => handleExtraClass(sub.id, "PRESENT")}>
                      Present
                    </Button>
                    <Button
                      onPress={() => handleExtraClass(sub.id, "BUNKED")}
                      textColor="red"
                    >
                      Bunk
                    </Button>
                  </View>
                )}
              />
            ))}
            <Button onPress={() => setExtraModalVisible(false)}>Cancel</Button>
          </Modal>
        </Portal>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20 },
  header: { marginBottom: 10 },
  card: { marginBottom: 16, backgroundColor: "white" },
  sectionTitle: { fontWeight: "bold", marginBottom: 10, marginTop: 10 },
  classCard: { marginBottom: 10, backgroundColor: "white" },
  classRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: { flex: 1, marginRight: 10 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    justifyContent: "flex-end",
  },
  actionBtn: { flex: 1 },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
});
