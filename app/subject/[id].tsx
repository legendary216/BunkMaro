import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  ActivityIndicator,
  List,
  Button,
  Portal,
  Modal,
  Chip,
  IconButton,
  Provider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../utils/supabase";
import { Colors } from "../../constants/theme";

export default function SubjectDetailsScreen() {
  const { id } = useLocalSearchParams(); // Get the Subject ID from the URL
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Data
  const [subject, setSubject] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 100 });
  const [prediction, setPrediction] = useState<string>("");

  // Edit Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    try {
      setLoading(true);

      // 1. Get Subject Name
      const { data: sub } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .single();
      setSubject(sub);

      // 2. Get All Logs for this Subject
      const { data: history } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("subject_id", id)
        .order("date", { ascending: false }) // Newest first
        .order("slot_time", { ascending: false });

      if (history) {
        setLogs(history);
        calculateStats(history);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (history: any[]) => {
    // Filter out Cancelled/Postponed
    const validLogs = history.filter(
      (l) => l.status === "PRESENT" || l.status === "BUNKED",
    );
    const total = validLogs.length;
    const present = validLogs.filter((l) => l.status === "PRESENT").length;
    const pct = total === 0 ? 100 : Math.round((present / total) * 100);

    setStats({ present, total, percentage: pct });

    // --- THE "SAFETY CALC" ALGORITHM ---
    // Target is 75%
    if (pct < 75) {
      // Formula: (Present + x) / (Total + x) >= 0.75
      // Solve for x: x >= 3*Total - 4*Present
      const needed = 3 * total - 4 * present;
      setPrediction(
        `⚠️ You must attend the next ${Math.max(1, needed)} classes consecutively to hit 75%.`,
      );
    } else {
      // Formula: Present / (Total + y) >= 0.75
      // Solve for y: y <= (4*Present / 3) - Total
      const buffer = Math.floor((4 * present) / 3 - total);
      if (buffer > 0) {
        setPrediction(
          `✅ Safe! You can bunk ${buffer} classes and still stay above 75%.`,
        );
      } else {
        setPrediction(
          `⚠️ Careful. You are on the edge. Don't bunk the next one.`,
        );
      }
    }
  };

  // --- EDIT LOGIC ---
  const handleEdit = async (newStatus: string) => {
    if (!selectedLog) return;

    // Update DB
    const { error } = await supabase
      .from("attendance_logs")
      .update({ status: newStatus })
      .eq("id", selectedLog.id);

    if (!error) {
      setModalVisible(false);
      fetchSubjectData(); // Refresh everything
    } else {
      Alert.alert("Error", error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    const { error } = await supabase
      .from("attendance_logs")
      .delete()
      .eq("id", selectedLog.id);
    if (!error) {
      setModalVisible(false);
      fetchSubjectData();
    }
  };

  const openEditModal = (log: any) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  return (
    <Provider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: Colors.light.background }]}
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            {subject?.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. BIG STAT CARD */}
          <Card
            style={[
              styles.card,
              {
                backgroundColor: stats.percentage < 75 ? "#ffebee" : "#e8f5e9",
              },
            ]}
          >
            <Card.Content style={{ alignItems: "center" }}>
              <Text
                variant="displayLarge"
                style={{
                  fontWeight: "bold",
                  color: stats.percentage < 75 ? "#d32f2f" : "#2e7d32",
                }}
              >
                {stats.percentage}%
              </Text>
              <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
                Attended {stats.present} / {stats.total}
              </Text>
              <View style={styles.predictionBox}>
                <Text
                  style={{
                    textAlign: "center",
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  {prediction}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* 2. HISTORY LIST */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Attendance History
          </Text>
          {logs.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 20, opacity: 0.5 }}>
              No history yet.
            </Text>
          ) : (
            logs.map((log) => (
              <List.Item
                key={log.id}
                title={new Date(log.date).toDateString()}
                description={log.status}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      log.status === "PRESENT"
                        ? "check-circle"
                        : log.status === "BUNKED"
                          ? "close-circle"
                          : "calendar-clock"
                    }
                    color={
                      log.status === "PRESENT"
                        ? "#2e7d32"
                        : log.status === "BUNKED"
                          ? "#d32f2f"
                          : "#f57c00"
                    }
                  />
                )}
                right={(props) => (
                  <IconButton
                    {...props}
                    icon="pencil"
                    onPress={() => openEditModal(log)}
                  />
                )}
                style={styles.historyItem}
              />
            ))
          )}
        </ScrollView>

        {/* EDIT MODAL */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modal}
          >
            <Text variant="titleLarge" style={{ marginBottom: 20 }}>
              Edit Record
            </Text>
            <Text style={{ marginBottom: 20 }}>
              {selectedLog && new Date(selectedLog.date).toDateString()}
            </Text>

            <Button
              mode="outlined"
              onPress={() => handleEdit("PRESENT")}
              style={{ marginBottom: 10 }}
            >
              Change to Present 😇
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleEdit("BUNKED")}
              style={{ marginBottom: 10 }}
            >
              Change to Bunk 😈
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleEdit("POSTPONED")}
              style={{ marginBottom: 10 }}
            >
              Mark as Postponed
            </Button>

            <Button
              mode="contained"
              buttonColor="#ef5350"
              onPress={handleDelete}
              style={{ marginTop: 20 }}
            >
              Delete Record
            </Button>
          </Modal>
        </Portal>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 10,
  },
  scrollContent: { padding: 20 },
  card: { paddingVertical: 20, marginBottom: 20 },
  predictionBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  sectionTitle: { fontWeight: "bold", marginBottom: 10 },
  historyItem: { backgroundColor: "white", marginBottom: 1, borderRadius: 0 },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
});
