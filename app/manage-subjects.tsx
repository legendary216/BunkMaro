import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Keyboard, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, ActivityIndicator, Surface, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { supabase } from '../utils/supabase';

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

export default function ManageSubjectsScreen() {
  const router = useRouter();
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sem, error } = await supabase
        .from('semesters')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !sem) {
        Alert.alert('Error', 'Please create a semester first.');
        router.back();
        return;
      }

      setSemesterId(sem.id);
      
      const { data: subjectList } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester_id', sem.id)
        .order('id', { ascending: true });
        
      if (subjectList) setSubjects(subjectList);

    } catch (error) {
      console.log(error);
    } finally{
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newSubject.trim() || !semesterId) return;
    setAdding(true);
    Keyboard.dismiss();

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          semester_id: semesterId,
          name: newSubject.trim(),
          min_attendance_req: 75
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects([...subjects, data]); 
      setNewSubject('');

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    // Optimistic Update
    const originalList = [...subjects];
    setSubjects(subjects.filter(s => s.id !== id));

    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
        // Revert if failed
        setSubjects(originalList);
        Alert.alert("Error", "Could not delete subject");
    }
  }

  if (loading && subjects.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bg }}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor={THEME.textPrimary} size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={{ fontWeight: "bold", color: THEME.textPrimary }}>
          Manage Subjects
        </Text>
        <View style={{ width: 48 }} /> 
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Surface style={styles.card} elevation={1}>
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.iconBox}>
                    <Text style={{ fontSize: 16 }}>📚</Text>
                </View>
                <View style={{ marginLeft: 15 }}>
                    <Text variant="titleMedium" style={{ color: THEME.textPrimary, fontWeight: '600' }}>
                        {item.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: THEME.textSecondary }}>
                        Target: {item.min_attendance_req}%
                    </Text>
                </View>
             </View>
             
             <IconButton 
                icon="trash-can-outline" 
                iconColor={THEME.danger} 
                size={22}
                onPress={() => handleDelete(item.id)}
             />
          </Surface>
        )}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                <Text style={{ color: THEME.textSecondary }}>No subjects added yet.</Text>
            </View>
        }
      />

      {/* --- BOTTOM INPUT --- */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
            <TextInput
            label="Add Subject (e.g. Java)"
            value={newSubject}
            onChangeText={setNewSubject}
            mode="outlined"
            style={styles.input}
            textColor={THEME.textPrimary}
            placeholderTextColor={THEME.textSecondary}
            outlineColor="#333"
            activeOutlineColor={THEME.accent}
            theme={{ colors: { background: THEME.cardBg, onSurfaceVariant: THEME.textSecondary } }}
            right={
                <TextInput.Icon 
                    icon={adding ? "loading" : "plus"} 
                    color={THEME.accent} 
                    onPress={handleAdd} 
                    disabled={adding}
                />
            }
            />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  listContent: { padding: 20, paddingBottom: 100 },
  
  // CARD STYLES
  card: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: THEME.cardBg,
      marginBottom: 12,
      borderRadius: 12,
      padding: 12,
      paddingRight: 5
  },
  iconBox: {
      width: 40, height: 40, borderRadius: 10,
      backgroundColor: '#2A2A2A',
      justifyContent: 'center', alignItems: 'center'
  },
  
  // INPUT STYLES
  inputContainer: { 
      padding: 20, 
      backgroundColor: THEME.bg, // Matches bg so it looks seamless
      borderTopWidth: 1,
      borderTopColor: '#333'
  },
  input: { 
      backgroundColor: THEME.cardBg 
  },
});