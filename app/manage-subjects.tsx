import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Keyboard, Alert } from 'react-native';
import { Text, TextInput, Button, IconButton, Appbar, List, Divider,ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';

export default function ManageSubjectsScreen() {
  const router = useRouter();
  const [semesterId, setSemesterId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Get Active Semester & Subjects on Load
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find active semester
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
      
      // Fetch Subjects for this semester
      const { data: subjectList } = await supabase
        .from('subjects')
        .select('*')
        .eq('semester_id', sem.id)
        .order('id', { ascending: true });
        
      if (subjectList) setSubjects(subjectList);

    } catch (error) {
      console.log(error);
    }
    finally{
      setLoading(false);
    }
  }

  // 2. Add New Subject (Simple Insert)
  async function handleAdd() {
    if (!newSubject.trim() || !semesterId) return;
    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          semester_id: semesterId,
          name: newSubject.trim(),
          min_attendance_req: 75
        })
        .select() // Return the new row so we can add it to the list
        .single();

      if (error) throw error;

      // Update UI instantly
      setSubjects([...subjects, data]); 
      setNewSubject('');

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  // 3. Delete Subject
  async function handleDelete(id: number) {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (!error) {
      // Remove from UI instantly
      setSubjects(subjects.filter(s => s.id !== id));
    }
  }

  if (loading && subjects.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Manage Subjects" />
      </Appbar.Header>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View>
            <List.Item
              title={item.name}
              description={`Target: ${item.min_attendance_req}%`}
              left={props => <List.Icon {...props} icon="book-open-variant" />}
              right={props => (
                <IconButton 
                  {...props} 
                  icon="trash-can-outline" 
                  onPress={() => handleDelete(item.id)}
                />
              )}
            />
            <Divider />
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No subjects yet.</Text>}
      />

      <View style={styles.inputContainer}>
        <TextInput
          label="New Subject Name"
          placeholder="e.g. Mathematics"
          value={newSubject}
          onChangeText={setNewSubject}
          mode="outlined"
          style={styles.input}
          activeOutlineColor={Colors.light.tint}
          right={<TextInput.Icon icon="plus-circle" onPress={handleAdd} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 40, opacity: 0.5 },
  inputContainer: { padding: 16, backgroundColor: 'white', elevation: 4 },
  input: { backgroundColor: 'white' },
});