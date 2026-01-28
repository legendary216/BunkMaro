import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions
} from "react-native";
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  Portal,
  Modal,
  IconButton,
  Provider,
  Surface,
  Divider,
  Avatar,
  Chip
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "../../utils/supabase";

// --- THEME CONSTANTS (Consistent with Dashboard) ---
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

export default function SubjectDetailsScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Data
  const [subject, setSubject] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState({ present: 0, total: 0, percentage: 100 });
  const [prediction, setPrediction] = useState<{ text: string, type: 'safe' | 'danger' }>({ text: '', type: 'safe' });

  // Edit Modal
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchSubjectData();
  }, [id]);

  const fetchSubjectData = async () => {
    try {
      setLoading(true);

      const { data: sub } = await supabase.from("subjects").select("*").eq("id", id).single();
      setSubject(sub);

      const { data: history } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("subject_id", id)
        .order("date", { ascending: false })
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
    const validLogs = history.filter((l) => l.status === "PRESENT" || l.status === "BUNKED");
    const total = validLogs.length;
    const present = validLogs.filter((l) => l.status === "PRESENT").length;
    const pct = total === 0 ? 100 : Math.round((present / total) * 100);

    setStats({ present, total, percentage: pct });

    // Prediction Logic
    if (pct < 75) {
      const needed = 3 * total - 4 * present;
      setPrediction({
        text: `Attend next ${Math.max(1, needed)} classes to hit 75%`,
        type: 'danger'
      });
    } else {
      const buffer = Math.floor((4 * present) / 3 - total);
      if (buffer > 0) {
        setPrediction({
            text: `Safe to bunk ${buffer} classes`,
            type: 'safe'
        });
      } else {
        setPrediction({
            text: `On the edge! Don't bunk next class`,
            type: 'danger' // Warning color
        });
      }
    }
  };

  // --- EDIT LOGIC ---
  const handleEdit = async (newStatus: string) => {
    if (!selectedLog) return;
    const { error } = await supabase.from("attendance_logs").update({ status: newStatus }).eq("id", selectedLog.id);
    if (!error) {
      setModalVisible(false);
      fetchSubjectData(); 
    } else {
      Alert.alert("Error", error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog) return;
    const { error } = await supabase.from("attendance_logs").delete().eq("id", selectedLog.id);
    if (!error) {
      setModalVisible(false);
      fetchSubjectData();
    }
  };

  const openEditModal = (log: any) => {
    setSelectedLog(log);
    setModalVisible(true);
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

  if (loading)
    return (
      <View style={[styles.center, { backgroundColor: THEME.bg }]}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );

  return (
    <Provider>
      <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <IconButton icon="arrow-left" iconColor={THEME.textPrimary} size={24} onPress={() => router.back()} />
          <Text variant="titleLarge" style={{ fontWeight: "bold", color: THEME.textPrimary, flex: 1, textAlign: 'center' }}>
            {subject?.name}
          </Text>
          <View style={{ width: 48 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* --- 1. HERO STAT CARD --- */}
          <Surface style={styles.heroCard} elevation={4}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <View>
                    <Text variant="labelMedium" style={{ color: THEME.textSecondary, letterSpacing: 1 }}>CURRENT STATUS</Text>
                    <Text variant="displayMedium" style={{ fontWeight: "bold", color: stats.percentage < 75 ? THEME.danger : THEME.success }}>
                        {stats.percentage}%
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                     {/* Circular Progress Placeholder or Icon */}
                     <Avatar.Icon 
                        size={50} 
                        icon={stats.percentage < 75 ? "alert" : "shield-check"} 
                        style={{ backgroundColor: stats.percentage < 75 ? THEME.danger + '20' : THEME.success + '20' }}
                        color={stats.percentage < 75 ? THEME.danger : THEME.success}
                     />
                </View>
            </View>

            {/* Progress Bar */}
            <View style={{ height: 6, backgroundColor: '#333', borderRadius: 3, marginBottom: 15, overflow: 'hidden' }}>
                <View style={{ width: `${stats.percentage}%`, height: '100%', backgroundColor: stats.percentage < 75 ? THEME.danger : THEME.success }} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: THEME.textSecondary, fontSize: 13 }}>
                    Attended <Text style={{ color: THEME.textPrimary, fontWeight: 'bold' }}>{stats.present}</Text> of {stats.total} classes
                </Text>
                
                {/* Prediction Pill */}
                {stats.total > 0 && (
                     <View style={{ 
                         backgroundColor: prediction.type === 'danger' ? THEME.danger + '20' : THEME.success + '20',
                         paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12
                     }}>
                        <Text style={{ 
                            fontSize: 11, fontWeight: 'bold', 
                            color: prediction.type === 'danger' ? THEME.danger : THEME.success 
                        }}>
                            {prediction.text}
                        </Text>
                     </View>
                )}
            </View>
          </Surface>

          {/* --- 2. HISTORY TIMELINE --- */}
          <Text variant="titleMedium" style={styles.sectionTitle}>History Log</Text>
          
          {logs.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                <IconButton icon="history" size={40} iconColor={THEME.textSecondary} />
                <Text style={{ color: THEME.textSecondary }}>No attendance records yet.</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
                {logs.map((log, index) => {
                    const isLast = index === logs.length - 1;
                    const color = getStatusColor(log.status);

                    return (
                        <View key={log.id} style={{ flexDirection: 'row' }}>
                            {/* Left: Date */}
                            <View style={{ width: 60, alignItems: 'flex-end', marginRight: 15 }}>
                                <Text style={{ color: THEME.textPrimary, fontWeight: 'bold', fontSize: 14 }}>
                                    {new Date(log.date).getDate()}
                                </Text>
                                <Text style={{ color: THEME.textSecondary, fontSize: 12, textTransform: 'uppercase' }}>
                                    {new Date(log.date).toLocaleString('default', { month: 'short' })}
                                </Text>
                            </View>

                            {/* Middle: Line & Dot */}
                            <View style={{ alignItems: 'center' }}>
                                <View style={{ 
                                    width: 12, height: 12, borderRadius: 6, 
                                    backgroundColor: color, 
                                    borderWidth: 2, borderColor: THEME.bg,
                                    zIndex: 1
                                }} />
                                {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: '#333', marginVertical: -2 }} />}
                            </View>

                            {/* Right: Card */}
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={() => openEditModal(log)}
                                style={{ flex: 1, paddingBottom: 20, paddingLeft: 15 }}
                            >
                                <View style={styles.historyCard}>
                                    <View>
                                        <Text style={{ color: color, fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
                                            {log.status}
                                        </Text>
                                        <Text style={{ color: THEME.textSecondary, fontSize: 12 }}>
                                            {log.slot_time.slice(0, 5)} Slot
                                        </Text>
                                    </View>
                                    <IconButton icon="pencil" size={16} iconColor="#666" style={{ margin: 0 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
          )}

        </ScrollView>

        {/* --- EDIT MODAL --- */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modal}
          >
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: THEME.textPrimary }}>Edit Record</Text>
                <IconButton icon="close" size={20} iconColor={THEME.textSecondary} onPress={() => setModalVisible(false)} />
            </View>
            
            <Text style={{ color: THEME.textSecondary, marginBottom: 20 }}>
              {selectedLog && new Date(selectedLog.date).toDateString()} • {selectedLog?.slot_time.slice(0, 5)}
            </Text>

            <View style={{ gap: 10 }}>
                <Button 
                    mode="outlined" 
                    textColor={THEME.success}
                    style={{ borderColor: THEME.success }}
                    onPress={() => handleEdit("PRESENT")}
                    icon="check"
                >
                Mark as Present
                </Button>
                
                <Button 
                    mode="outlined" 
                    textColor={THEME.danger}
                    style={{ borderColor: THEME.danger }}
                    onPress={() => handleEdit("BUNKED")}
                    icon="close"
                >
                Mark as Bunked
                </Button>

                <Button 
                    mode="outlined" 
                    textColor={THEME.warning}
                    style={{ borderColor: THEME.warning }}
                    onPress={() => handleEdit("POSTPONED")}
                    icon="clock-outline"
                >
                Mark as Postponed
                </Button>
            </View>

            <Divider style={{ marginVertical: 20, backgroundColor: THEME.divider }} />

            <Button
              mode="contained"
              buttonColor={THEME.cardBg}
              textColor={THEME.danger}
              onPress={handleDelete}
              icon="trash-can-outline"
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
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  scrollContent: { padding: 20 },
  
  // HERO CARD
  heroCard: { 
      backgroundColor: THEME.cardBg, 
      borderRadius: 24, 
      padding: 24, 
      marginBottom: 30,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8
  },
  
  sectionTitle: { fontWeight: "bold", color: THEME.textPrimary, marginBottom: 20, marginLeft: 10 },
  
  // TIMELINE
  timelineContainer: {
      paddingLeft: 10
  },
  historyCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#333'
  },

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
});