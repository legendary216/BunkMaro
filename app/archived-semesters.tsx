import React, { useEffect, useState } from "react";
import { StyleSheet, View, FlatList, Alert, ScrollView } from "react-native";
import {
  Text,
  ActivityIndicator,
  List,
  Modal,
  Portal,
  Provider,
  Button,
  Divider,
  Surface,
  IconButton,
  Avatar
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { handleSupabaseError } from '../utils/errorHandler';
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
  warning: '#FFB74D',      
};

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("semesters")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", false) 
        .order("created_at", { ascending: false });

      if (data) setSemesters(data);
    } catch (error) {
      handleSupabaseError(error, "Could not fetch schedule");
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
      const { data: subjects } = await supabase.from("subjects").select("id, name").eq("semester_id", sem.id);
      const { data: logs } = await supabase.from("attendance_logs").select("*").eq("semester_id", sem.id);

      const report = (subjects || []).map((sub) => {
        const subLogs = logs?.filter(
            (l) => l.subject_id === sub.id && l.status !== "CANCELLED" && l.status !== "POSTPONED" && l.status !== "HOLIDAY"
          ) || [];
        const total = subLogs.length;
        const present = subLogs.filter((l) => l.status === "PRESENT").length;
        const pct = total === 0 ? 100 : Math.round((present / total) * 100);
        return { name: sub.name, pct };
      });

      setReportCard(report);
    } catch (error) {
      handleSupabaseError(error, "Could not fetch schedule");
      //Alert.alert("Error", "Could not generate report.");
    } finally {
      setReportLoading(false);
    }
  }

  async function handleRestore() {
    Alert.alert(
      "Restore Semester?",
      "This will archive your CURRENT semester and make this one active.",
      [
        { text: "Cancel", style: 'cancel' },
        {
          text: "Restore",
          style: 'default',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Archive everything
            await supabase.from("semesters").update({ is_active: false }).eq("user_id", user.id);

            // 2. Activate this one
            await supabase.from("semesters").update({ is_active: true }).eq("id", selectedSem.id);

            setVisible(false);
            router.replace("/(tabs)"); 
          },
        },
      ],
    );
  }

  return (
    <Provider>
      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
            <IconButton icon="arrow-left" iconColor={THEME.textPrimary} size={24} onPress={() => router.back()} />
            <Text variant="titleLarge" style={{ fontWeight: "bold", color: THEME.textPrimary }}>
              Archive Vault
            </Text>
            <View style={{ width: 48 }} /> 
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.accent} />
          </View>
        ) : (
          <FlatList
            data={semesters}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 20 }}
            renderItem={({ item }) => (
              <Surface style={styles.card} elevation={1} onTouchEnd={() => openReportCard(item)}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Avatar.Icon 
                            size={40} 
                            icon="archive" 
                            style={{ backgroundColor: '#2A2A2A' }} 
                            color={THEME.textSecondary} 
                        />
                        <View style={{ marginLeft: 15 }}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: THEME.textPrimary }}>
                                {item.name}
                            </Text>
                            <Text variant="bodySmall" style={{ color: THEME.textSecondary }}>
                                Ended: {new Date(item.end_date || item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                    <List.Icon icon="chevron-right" color={THEME.textSecondary} />
                 </View>
              </Surface>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                <IconButton icon="archive-off" size={60} iconColor={THEME.textSecondary} />
                <Text style={{ color: THEME.textSecondary, marginTop: 10 }}>No archived semesters found.</Text>
              </View>
            }
          />
        )}

        {/* --- REPORT CARD MODAL --- */}
        <Portal>
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={styles.modal}
          >
            {reportLoading ? (
              <ActivityIndicator color={THEME.accent} />
            ) : (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <View>
                        <Text variant="headlineSmall" style={{ fontWeight: "bold", color: THEME.textPrimary }}>
                        {selectedSem?.name}
                        </Text>
                        <Text style={{ color: THEME.textSecondary }}>Final Report Card</Text>
                     </View>
                     <IconButton icon="close" iconColor={THEME.textSecondary} onPress={() => setVisible(false)} />
                </View>

                <Divider style={{ backgroundColor: THEME.divider, marginBottom: 15 }} />

               <ScrollView style={{ maxHeight: 300 }}>
                  {reportCard.map((item, index) => (
                    <View key={index} style={styles.reportRow}>
                        {/* FIX: 
                           1. flex: 1 -> Takes available width but respects the badge's space
                           2. numberOfLines={1} -> Cuts off text if too long
                           3. marginRight: 10 -> Adds safety gap
                        */}
                        <Text 
                            variant="bodyLarge" 
                            style={{ color: THEME.textPrimary, flex: 1, marginRight: 10 }} 
                            numberOfLines={1} 
                            ellipsizeMode="tail"
                        >
                            {item.name}
                        </Text>
                        
                        {/* Percentage Badge (Fixed Width container optional, but usually not needed if Flex is on text) */}
                        <View style={{ 
                            backgroundColor: item.pct < 75 ? THEME.danger + '20' : THEME.success + '20',
                            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                            minWidth: 50, // Ensures badge doesn't shrink too much
                            alignItems: 'center'
                        }}>
                            <Text style={{ 
                                fontWeight: "bold", 
                                color: item.pct < 75 ? THEME.danger : THEME.success 
                            }}>
                                {item.pct}%
                            </Text>
                        </View>
                    </View>
                  ))}
                </ScrollView>

                <Button
                  mode="contained"
                  onPress={handleRestore}
                  style={{ marginTop: 25 }}
                  buttonColor={THEME.accent}
                  textColor="#000"
                  icon="backup-restore"
                >
                  Restore as Active
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  card: { 
      backgroundColor: THEME.cardBg, 
      marginBottom: 12, 
      borderRadius: 12,
      overflow: 'hidden'
  },
  
  modal: {
    backgroundColor: THEME.cardBg,
    padding: 24,
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 10
  },
  
  reportRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#2A2A2A'
  }
});