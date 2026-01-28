import React, { useState, useEffect,useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  ActivityIndicator,
  Divider,
  Button,
  IconButton,
  Avatar,
  Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { supabase } from "../../utils/supabase";
import ScreenWrapper from "../ScreenWrapper";
import { useRouter ,useFocusEffect } from "expo-router";

// --- THEME CONSTANTS ---
const THEME = {
  bg: "#121212",
  cardBg: "#1E1E1E",
  textPrimary: "#E0E0E0",
  textSecondary: "#A0A0A0",
  accent: "#BB86FC",
  divider: "#333",
  success: "#03DAC6",
  danger: "#CF6679",
  warning: "#FFB74D",
};

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Semester State
  const [semesterId, setSemesterId] = useState<any>(null);
  const [semesterStart, setSemesterStart] = useState<string | null>(null);

  // 1. Get Active Semester & Start Date
  useEffect(() => {
    const getSem = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("semesters")
        .select("id, start_date") // <--- Fetch start_date
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        setSemesterId(data.id);
        setSemesterStart(data.start_date); // Store it

        // If today is BEFORE start date, jump to start date
        const today = new Date().toLocaleDateString("en-CA");
        if (data.start_date && today < data.start_date) {
          setSelectedDate(data.start_date);
        }
      }
    };
    getSem();
  }, []);

  // 2. Fetch Data
 useFocusEffect(
    useCallback(() => {
      if (semesterId) {
        fetchDataForDate(selectedDate);
      }
    }, [selectedDate, semesterId]) 
  );
  const fetchDataForDate = async (date: string) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !semesterId) return;

      const dayIndex = new Date(date + "T12:00:00").getDay();

      const { data: slots } = await supabase
        .from("timetable_slots")
        .select("*, subjects(name)")
        .eq("semester_id", semesterId)
        .eq("day_of_week", dayIndex)
        .order("start_time");

      const { data: logs } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("semester_id", semesterId)
        .eq("date", date);

      const merged = (slots || []).map((slot) => {
        const foundLog = logs?.find(
          (l) =>
            l.subject_id === slot.subject_id && l.slot_time === slot.start_time,
        );
        return {
          ...slot,
          log: foundLog || null,
        };
      });

      setCombinedData(merged);
    } catch (e: any) {
      if (e.message.includes('Network request failed') || e.message.includes('fetch failed')) {
         Alert.alert("Offline 📶", "Please check your internet connection.");
      } else {
         console.log(e.message); // Log other errors silently for fetch
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Mark Attendance (Guarded)
  const handleMark = async (item: any, status: string) => {
    // GUARD: Don't allow marking before semester starts
    if (semesterStart && selectedDate < semesterStart) {
      Alert.alert(
        "Hold up!",
        "You can't mark attendance before the semester starts.",
      );
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        semester_id: semesterId,
        subject_id: item.subject_id,
        date: selectedDate,
        slot_time: item.start_time,
        status: status,
      };

      const { error } = await supabase.from("attendance_logs").upsert(payload);
      if (error) throw error;

      await fetchDataForDate(selectedDate);
    } catch (e: any) {
    let msg = e.message;
      // FIX: Friendly message for network errors
      if (msg.includes('Network request failed') || msg.includes('fetch failed')) {
          msg = "Unable to save. Please check your internet connection.";
      }
      Alert.alert('Error', msg);
      setLoading(false);
    }
  };

  const markWholeDayHoliday = () => {
    // GUARD
    if (semesterStart && selectedDate < semesterStart) {
      Alert.alert(
        "Hold up!",
        "You can't mark holidays before the semester starts.",
      );
      return;
    }

    Alert.alert(
      "Mark Holiday?",
      `Mark ${new Date(selectedDate).toDateString()} as a Holiday?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Holiday 🏖️",
          onPress: async () => {
            setLoading(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user || !semesterId) return;

              const updates = combinedData.map((item) => ({
                user_id: user.id,
                semester_id: semesterId,
                subject_id: item.subject_id,
                date: selectedDate,
                slot_time: item.start_time,
                status: "HOLIDAY",
              }));

              if (updates.length === 0) {
                Alert.alert("No classes to mark!");
                setLoading(false);
                return;
              }

              const { error } = await supabase
                .from("attendance_logs")
                .upsert(updates);
              if (error) throw error;

              await fetchDataForDate(selectedDate);
              Alert.alert("Success", "Date marked as Holiday!");
            } catch (e: any) {
              let msg = e.message;
              // FIX: Friendly message for network errors
              if (msg.includes('Network request failed') || msg.includes('fetch failed')) {
                  msg = "Unable to save holiday. You seem to be offline.";
              }Alert.alert("Error", e.message);
                } 
                finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PRESENT":
        return THEME.success;
      case "BUNKED":
        return THEME.danger;
      case "HOLIDAY":
        return "#4FC3F7";
      case "POSTPONED":
        return THEME.warning;
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "check";
      case "BUNKED":
        return "close";
      case "HOLIDAY":
        return "beach";
      case "POSTPONED":
        return "clock-outline";
      default:
        return "help";
    }
  };

  // --- RENDER ITEM ---
  const todayStr = new Date().toLocaleDateString("en-CA");
  const isFuture = selectedDate > todayStr;

  // NEW: Check if date is before semester start
  const isBeforeStart = semesterStart ? selectedDate < semesterStart : false;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isPending = !item.log;
    const isLast = index === combinedData.length - 1;

    // Logic: Is this item interactable?
    // It is NOT interactable if:
    // 1. It is in the Future
    // 2. It is Before the Semester Started
    const isInteractable = !isFuture && !isBeforeStart;

    const showEditMenu = () => {
      if (!isInteractable) return;
      Alert.alert("Edit Record", "Update status for this class:", [
        { text: "Cancel", style: "cancel" },
        { text: "Present ✅", onPress: () => handleMark(item, "PRESENT") },
        { text: "Bunked ❌", onPress: () => handleMark(item, "BUNKED") },
        { text: "Holiday 🏖️", onPress: () => handleMark(item, "HOLIDAY") },
      ]);
    };

    return (
      <View style={{ flexDirection: "row", opacity: isInteractable ? 1 : 0.5 }}>
        {/* Left: Time */}
        <View style={{ width: 60, alignItems: "flex-end", marginRight: 15 }}>
          <Text
            style={{
              color: THEME.textPrimary,
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {item.start_time.slice(0, 5)}
          </Text>
          <Text style={{ color: THEME.textSecondary, fontSize: 12 }}>
            {item.end_time.slice(0, 5)}
          </Text>
        </View>

        {/* Middle: Timeline */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: item.log
                ? getStatusColor(item.log.status)
                : "#555",
              borderWidth: 2,
              borderColor: THEME.bg,
              zIndex: 1,
            }}
          />
          {!isLast && (
            <View
              style={{
                width: 2,
                flex: 1,
                backgroundColor: "#333",
                marginVertical: -2,
              }}
            />
          )}
        </View>

        {/* Right: Content Card */}
        <TouchableOpacity
          activeOpacity={isInteractable ? 0.7 : 1}
          onLongPress={isInteractable ? showEditMenu : undefined}
          style={{ flex: 1, paddingBottom: 25, paddingLeft: 15 }}
        >
          <Surface style={styles.timelineCard} elevation={1}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  variant="titleMedium"
                  style={{ color: THEME.textPrimary, fontWeight: "bold" }}
                >
                  {item.subjects?.name}
                </Text>

                <View style={{ marginTop: 8 }}>
                  {!isInteractable ? (
                    <View style={styles.badgePending}>
                      <Text style={styles.badgeTextPending}>
                        {isBeforeStart ? "NOT STARTED" : "UPCOMING"}
                      </Text>
                    </View>
                  ) : isPending ? (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Button
                        mode="contained"
                        compact
                        buttonColor={THEME.success}
                        textColor="#000"
                        labelStyle={{ fontSize: 11, marginHorizontal: 10 }}
                        onPress={() => handleMark(item, "PRESENT")}
                      >
                        Attend
                      </Button>
                      <Button
                        mode="outlined"
                        compact
                        textColor={THEME.danger}
                        style={{ borderColor: THEME.danger }}
                        labelStyle={{ fontSize: 11, marginHorizontal: 10 }}
                        onPress={() => handleMark(item, "BUNKED")}
                      >
                        Bunk
                      </Button>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.badgeNeon,
                        { borderColor: getStatusColor(item.log.status) },
                      ]}
                    >
                      <Avatar.Icon
                        size={16}
                        icon={getStatusIcon(item.log.status)}
                        color={getStatusColor(item.log.status)}
                        style={{
                          backgroundColor: "transparent",
                          margin: 0,
                          marginRight: 4,
                        }}
                      />
                      <Text
                        style={{
                          color: getStatusColor(item.log.status),
                          fontWeight: "bold",
                          fontSize: 10,
                        }}
                      >
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
    <ScreenWrapper
      onSwipeRight={() => router.push("/")}
      onSwipeLeft={() => router.push("/profile")}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        <View style={{ padding: 15 }}>
          <Text
            variant="headlineMedium"
            style={{ fontWeight: "bold", color: THEME.textPrimary }}
          >
            History
          </Text>
        </View>

        <View style={{ paddingHorizontal: 10, marginBottom: 10 }}>
          <Calendar
            key={"dark-calendar"}
            current={selectedDate}
            // --- FIX: Block dates before semester starts ---
            minDate={semesterStart || undefined}
            onDayPress={(day: any) => {
              if (day.dateString !== selectedDate) {
                setLoading(true);
                setCombinedData([]);
                setSelectedDate(day.dateString);
              }
            }}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: THEME.accent,
                selectedTextColor: "#000000",
              },
            }}
            theme={{
              backgroundColor: THEME.bg,
              calendarBackground: THEME.bg,
              textSectionTitleColor: THEME.textSecondary,
              selectedDayBackgroundColor: THEME.accent,
              selectedDayTextColor: "#000000",
              todayTextColor: THEME.accent,
              dayTextColor: THEME.textPrimary,
              textDisabledColor: "#333333", // Makes disabled dates look "off"
              dotColor: THEME.accent,
              monthTextColor: THEME.textPrimary,
              indicatorColor: THEME.accent,
              textDayFontWeight: "600",
              textMonthFontWeight: "bold",
              arrowColor: THEME.accent,
            }}
          />
        </View>

        <Divider style={{ backgroundColor: THEME.divider }} />

        <View style={styles.listContainer}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              variant="titleMedium"
              style={{ fontWeight: "bold", color: THEME.textSecondary }}
            >
              {new Date(selectedDate).toDateString()}
            </Text>

            {/* Hide Holiday button if date is not interactable */}
            {!isFuture && !isBeforeStart && (
              <TouchableOpacity onPress={markWholeDayHoliday}>
                <Text style={{ color: "#4FC3F7", fontWeight: "bold" }}>
                  Set Holiday 🏖️
                </Text>
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
                <View
                  style={{ alignItems: "center", marginTop: 40, opacity: 0.5 }}
                >
                  <IconButton
                    icon="calendar-blank"
                    size={50}
                    iconColor={THEME.textSecondary}
                  />
                  <Text style={{ color: THEME.textSecondary }}>
                    {isBeforeStart
                      ? "Semester hadn't started yet."
                      : "No classes on this date."}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </ScreenWrapper>
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
    borderColor: "#333",
  },

  badgePending: {
    backgroundColor: "#252525",
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTextPending: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 10,
  },
  badgeNeon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
