import React, { useState, useEffect } from "react";
import { StyleSheet, View, Alert, ScrollView } from "react-native";
import {
  Text,
  Button,
  Avatar,
  List,
  Divider,
  ActivityIndicator,
  Surface,
  Switch,
  IconButton
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { scheduleDailyReminder, cancelReminders } from '../../utils/notifications';

import { supabase } from "../../utils/supabase";

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

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [semester, setSemester] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

  const handleToggleNotifications = async (value: boolean) => {
      setNotificationsEnabled(value);
      if (value) {
          await scheduleDailyReminder();
          Alert.alert("Notifications On", "You will be reminded daily at 9 PM.");
      } else {
          await cancelReminders();
          Alert.alert("Notifications Off", "Daily reminders cancelled.");
      }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace('/auth');
          } catch (error: any) {
            setLoading(false);
            Alert.alert('Error', error.message);
          }
        }
      }
    ]);
  };

  const handleEndSemester = async () => {
    if (!semester) return;
    Alert.alert("End Semester?", `Archive "${semester.name}"? This will move it to 'Past Semesters'.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "End It",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          const { error } = await supabase.from("semesters").update({ is_active: false }).eq("id", semester.id);
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
    Alert.alert("Reset Attendance?", "This will DELETE all attendance history for this semester. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          await supabase.from("attendance_logs").delete().eq("semester_id", semester.id);
          setLoading(false);
          Alert.alert("Reset Complete", "History cleared.");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* --- HEADER PROFILE --- */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
             <Avatar.Text 
                size={80} 
                label={userEmail.substring(0, 2).toUpperCase()} 
                style={{ backgroundColor: THEME.accent }} 
                color="#000"
                labelStyle={{ fontWeight: 'bold' }}
             />
             <View style={styles.onlineBadge} />
          </View>
          
          <Text variant="headlineSmall" style={{ marginTop: 15, fontWeight: "bold", color: THEME.textPrimary }}>
            {userEmail.split("@")[0]}
          </Text>
          <Text variant="bodyMedium" style={{ color: THEME.textSecondary }}>
            {userEmail}
          </Text>
        </View>

        <View style={styles.content}>
          
          {/* --- SECTION 1: ACTIVE SESSION --- */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Current Session</Text>
          <Surface style={styles.card} elevation={1}>
              {semester ? (
                <View>
                    <List.Item
                        title={semester.name}
                        titleStyle={{ color: THEME.textPrimary, fontWeight: 'bold' }}
                        description="Status: Active"
                        descriptionStyle={{ color: THEME.success }}
                        left={(props) => <List.Icon {...props} icon="school" color={THEME.accent} />}
                        right={(props) => <IconButton icon="archive-arrow-down" iconColor={THEME.danger} onPress={handleEndSemester} />}
                    />
                </View>
              ) : (
                 <List.Item
                    title="No Active Semester"
                    titleStyle={{ color: THEME.textSecondary }}
                    left={(props) => <List.Icon {...props} icon="alert-circle-outline" color={THEME.textSecondary} />}
                />
              )}
          </Surface>

          {/* --- SECTION 2: ACADEMICS --- */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Academics</Text>
          <Surface style={styles.card} elevation={1}>
             <List.Item
                title="Manage Subjects"
                titleStyle={{ color: THEME.textPrimary }}
                description="Add, edit or delete courses"
                descriptionStyle={{ color: THEME.textSecondary }}
                left={(props) => <List.Icon {...props} icon="book-open-variant" color={THEME.accent} />}
                onPress={() => router.push("/manage-subjects")}
                right={props => <List.Icon {...props} icon="chevron-right" color={THEME.textSecondary} />}
             />
             <Divider style={{ backgroundColor: THEME.divider }} />
             <List.Item
                title="Manage Timetable"
                titleStyle={{ color: THEME.textPrimary }}
                description="Edit your weekly schedule"
                descriptionStyle={{ color: THEME.textSecondary }}
                left={(props) => <List.Icon {...props} icon="calendar-clock" color={THEME.accent} />}
                onPress={() => router.push("/manage-timetable")}
                right={props => <List.Icon {...props} icon="chevron-right" color={THEME.textSecondary} />}
             />
             <Divider style={{ backgroundColor: THEME.divider }} />
             <List.Item
                title="Past Semesters"
                titleStyle={{ color: THEME.textPrimary }}
                description="View archived history"
                descriptionStyle={{ color: THEME.textSecondary }}
                left={(props) => <List.Icon {...props} icon="history" color={THEME.accent} />}
                onPress={() => router.push('/archived-semesters')}
                right={props => <List.Icon {...props} icon="chevron-right" color={THEME.textSecondary} />}
             />
          </Surface>

          {/* --- SECTION 3: APP SETTINGS --- */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Preferences</Text>
          <Surface style={styles.card} elevation={1}>
             <List.Item
                title="Daily Reminder"
                titleStyle={{ color: THEME.textPrimary }}
                description="Get notified at 9 PM"
                descriptionStyle={{ color: THEME.textSecondary }}
                left={(props) => <List.Icon {...props} icon="bell-ring" color={THEME.warning} />}
                right={() => (
                    <Switch 
                        value={notificationsEnabled} 
                        onValueChange={handleToggleNotifications} 
                        color={THEME.accent} 
                    />
                )}
             />
          </Surface>

          {/* --- SECTION 4: DANGER ZONE --- */}
          <Text variant="titleMedium" style={styles.sectionTitle}>Danger Zone</Text>
          <Surface style={[styles.card, { borderColor: THEME.danger, borderWidth: 1 }]} elevation={0}>
             <List.Item
                title="Reset Attendance"
                titleStyle={{ color: THEME.danger }}
                description="Clear all history for this semester"
                descriptionStyle={{ color: THEME.danger + '80' }} // 50% opacity
                left={(props) => <List.Icon {...props} icon="delete-forever" color={THEME.danger} />}
                onPress={handleResetLogs}
             />
          </Surface>

          <Button
            mode="outlined"
            textColor={THEME.textPrimary}
            style={{ marginTop: 30, borderColor: THEME.textSecondary }}
            icon="logout"
            onPress={handleLogout}
          >
            Sign Out
          </Button>
          
          <Text style={{ textAlign: 'center', color: '#444', marginTop: 20, fontSize: 12 }}>
              Version 1.0.0 • BunkMaro
          </Text>

        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: THEME.cardBg,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 5
  },
  avatarContainer: {
      position: 'relative'
  },
  onlineBadge: {
      width: 16, height: 16, borderRadius: 8, backgroundColor: THEME.success,
      position: 'absolute', bottom: 5, right: 5, borderWidth: 2, borderColor: THEME.cardBg
  },
  content: { padding: 20 },
  sectionTitle: { fontWeight: "bold", marginBottom: 10, marginTop: 10, color: THEME.textSecondary, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  
  card: {
      backgroundColor: THEME.cardBg,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 15
  },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});