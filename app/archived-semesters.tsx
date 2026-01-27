import React, { useEffect, useState } from "react";
import { StyleSheet, View, FlatList, Alert, ScrollView } from "react-native";
import {
  Text,
  Card,
  ActivityIndicator,
  List,
  Appbar,
  Modal,
  Portal,
  Provider,
  Button,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { supabase } from "../utils/supabase";
import { Colors } from "../constants/theme";

export default function ArchivedSemestersScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<any[]>([]);

  // Report Card State
  const [selectedSem, setSelectedSem] = useState<any>(null);
  const [reportCard, setReportCard] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetchArchives();
  }, []);

  async function fetchArchives() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", false) // Only inactive ones
        .order("created_at", { ascending: false });

      if (data) setSemesters(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate Stats for a specific semester
  async function openReportCard(sem: any) {
    setSelectedSem(sem);
    setVisible(true);
    setReportLoading(true);

    try {
      // 1. Get Subjects
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("semester_id", sem.id);

      // 2. Get Logs
      const { data: logs } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("semester_id", sem.id);

      // 3. Calculate Scores
      const report = (subjects || []).map((sub) => {
        const subLogs =
          logs?.filter(
            (l) =>
              l.subject_id === sub.id &&
              l.status !== "CANCELLED" &&
              l.status !== "POSTPONED",
          ) || [];
        const total = subLogs.length;
        const present = subLogs.filter((l) => l.status === "PRESENT").length;
        const pct = total === 0 ? 100 : Math.round((present / total) * 100);
        return { name: sub.name, pct };
      });

      setReportCard(report);
    } catch (error) {
      Alert.alert("Error", "Could not generate report.");
    } finally {
      setReportLoading(false);
    }
  }

  // Restore Logic (Swap active semester)
  async function handleRestore() {
    Alert.alert(
      "Restore Semester?",
      "This will archive your CURRENT semester and make this one active.",
      [
        { text: "Cancel" },
        {
          text: "Restore",
          onPress: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Archive everything
            await supabase
              .from("semesters")
              .update({ is_active: false })
              .eq("user_id", user.id);

            // 2. Activate this one
            await supabase
              .from("semesters")
              .update({ is_active: true })
              .eq("id", selectedSem.id);

            setVisible(false);
            router.replace("/(tabs)"); // Go to dashboard
          },
        },
      ],
    );
  }

  return (
    <Provider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: Colors.light.background }]}
      >
        <Appbar.Header style={{ backgroundColor: "transparent" }}>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Past Semesters" />
        </Appbar.Header>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={semesters}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <Card style={styles.card} onPress={() => openReportCard(item)}>
                <Card.Title
                  title={item.name}
                  subtitle={`Ended: ${new Date(item.end_date || item.created_at).toLocaleDateString()}`}
                  left={(props) => <List.Icon {...props} icon="archive" />}
                  right={(props) => (
                    <List.Icon {...props} icon="chevron-right" />
                  )}
                />
              </Card>
            )}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", marginTop: 50, opacity: 0.5 }}
              >
                No archived semesters.
              </Text>
            }
          />
        )}

        {/* REPORT CARD MODAL */}
        <Portal>
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={styles.modal}
          >
            {reportLoading ? (
              <ActivityIndicator />
            ) : (
              <View>
                <Text
                  variant="headlineSmall"
                  style={{ fontWeight: "bold", marginBottom: 5 }}
                >
                  {selectedSem?.name}
                </Text>
                <Text style={{ color: "#666", marginBottom: 20 }}>
                  Final Report Card
                </Text>

                <ScrollView style={{ maxHeight: 300 }}>
                  {reportCard.map((item, index) => (
                    <View key={index}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                        }}
                      >
                        <Text variant="bodyLarge">{item.name}</Text>
                        <Text
                          variant="bodyLarge"
                          style={{
                            fontWeight: "bold",
                            color: item.pct < 75 ? "red" : "green",
                          }}
                        >
                          {item.pct}%
                        </Text>
                      </View>
                      <Divider />
                    </View>
                  ))}
                </ScrollView>

                <Button
                  mode="contained"
                  onPress={handleRestore}
                  style={{ marginTop: 20 }}
                  buttonColor={Colors.light.tint}
                >
                  Restore as Active
                </Button>
                <Button
                  mode="text"
                  onPress={() => setVisible(false)}
                  style={{ marginTop: 10 }}
                >
                  Close
                </Button>
              </View>
            )}
          </Modal>
        </Portal>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginBottom: 10, backgroundColor: "white" },
  modal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
});
