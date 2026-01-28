import React, { useState, useEffect } from "react";
import { StyleSheet, View, Alert, ScrollView } from "react-native";
import {
  Text,
  Button,
  Avatar,
  List,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { scheduleDailyReminder, cancelReminders } from '../../utils/notifications';

import { supabase } from "../../utils/supabase";
import { Colors } from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [semester, setSemester] = useState<any>(null);

  useEffect(() => {
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || "Student");
      fetchActiveSemester(user.id);
    }
  };

  const fetchActiveSemester = async (userId: string) => {
    const { data } = await supabase
      .from("semesters")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    setSemester(data);
  };

const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true); // <--- 1. Start Spinner
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/auth');
          } catch (error: any) {
            setLoading(false); // <--- Stop spinner if it fails
            Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const handleEndSemester = async () => {
    if (!semester) return;
    Alert.alert("End Semester?", `Archive "${semester.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "End It",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const { error } = await supabase
            .from("semesters")
            .update({ is_active: false })
            .eq("id", semester.id);
          setLoading(false);
          if (!error) {
            setSemester(null);
            Alert.alert("Success", "Semester ended.");
          }
        },
      },
    ]);
  };

  const handleResetLogs = async () => {
    if (!semester) return;
    Alert.alert("Reset Attendance?", "Delete all history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          await supabase
            .from("attendance_logs")
            .delete()
            .eq("semester_id", semester.id);
          setLoading(false);
          Alert.alert("Reset Complete", "History cleared.");
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors.light.background }]}
    >
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Text
            size={80}
            label={userEmail.substring(0, 2).toUpperCase()}
            style={{ backgroundColor: Colors.light.tint }}
          />
          <Text
            variant="headlineSmall"
            style={{ marginTop: 10, fontWeight: "bold" }}
          >
            {userEmail.split("@")[0]}
          </Text>
          <Text variant="bodyMedium" style={{ color: "#666" }}>
            {userEmail}
          </Text>
        </View>

        <View style={styles.content}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Current Session
          </Text>
          
          {semester ? (
            <List.Item
              title={semester.name}
              description="Status: Active"
              left={(props) => (
                <List.Icon {...props} icon="school" color={Colors.light.tint} />
              )}
              right={(props) => (
                <Button mode="text" textColor="red" onPress={handleEndSemester}>
                  End
                </Button>
              )}
              style={styles.listItem}
            />
          ) : (
            <List.Item
              title="No Active Semester"
              left={(props) => (
                <List.Icon {...props} icon="alert-circle-outline" />
              )}
            />
          )}


           <List.Item
            title="Past Semesters"
            description="View history and report cards"
            left={props => <List.Icon {...props} icon="history" />}
            onPress={() => router.push('/archived-semesters')}
            style={styles.listItem}
          />

          <Divider style={{ marginVertical: 20 }} />

          {/* NEW SECTION: ACADEMICS */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Academics & Setup
          </Text>

          <List.Item
            title="Manage Subjects"
            description="Add or remove course subjects"
            left={(props) => <List.Icon {...props} icon="book-open-variant" />}
            onPress={() => router.push("/manage-subjects")}
            style={styles.listItem}
          />

          <List.Item
            title="Manage Timetable"
            description="Edit weekly schedule"
            left={(props) => <List.Icon {...props} icon="calendar-clock" />}
            onPress={() => router.push("/manage-timetable")}
            style={styles.listItem}
          />

          <Divider style={{ marginVertical: 20 }} />
          <Text variant="titleMedium" style={styles.sectionTitle}>App Settings</Text>
          
          <List.Item
            title="Daily Reminder (9 PM)"
            description="Get notified to mark attendance"
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={props => (
              <View style={{ flexDirection: 'row' }}>
                 <Button onPress={scheduleDailyReminder}>On</Button>
                 <Button onPress={cancelReminders} textColor="#aaa">Off</Button>
              </View>
            )}
            style={styles.listItem}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Zone
          </Text>
          <List.Item
            title="Reset Attendance History"
            description="Clear all logs"
            left={(props) => <List.Icon {...props} icon="refresh" />}
            onPress={handleResetLogs}
            style={styles.listItem}
          />
         

          <Button
            mode="contained"
            buttonColor="#ef5350"
            icon="logout"
            onPress={handleLogout}
            style={{ marginTop: 30 }}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  content: { padding: 20 },
  sectionTitle: { fontWeight: "bold", marginBottom: 10, color: "#666" },
  listItem: { backgroundColor: "white", borderRadius: 10, marginBottom: 10 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});
