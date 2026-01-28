import React, { useState } from 'react';
import { StyleSheet, View, Keyboard, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Appbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
};

export default function SemesterSetupScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());

  // 1. Simple Date Change Handler
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate);
    }
  };

  // 2. Open Android Dialog directly
  const showDatepicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      onChange: onDateChange,
      mode: 'date',
      is24Hour: true,
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter a semester name (e.g., Sem 6)');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Deactivate old semesters
      await supabase
        .from('semesters')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Create new one
      const { error } = await supabase
        .from('semesters')
        .insert({
          user_id: user.id,
          name: name,
          start_date: date.toISOString(),
          is_active: true,
        });

      if (error) throw error;

      // Navigate to Dashboard
      router.replace('/(tabs)');

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: THEME.bg }]}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor={THEME.textPrimary} size={24} onPress={() => router.back()} />
        <Text variant="titleLarge" style={{ fontWeight: "bold", color: THEME.textPrimary }}>
          New Semester
        </Text>
        <View style={{ width: 48 }} /> 
      </View>

      <View style={styles.content}>
        
        {/* Helper Text */}
        <Text style={styles.helperText}>
            Give your new semester a name to start tracking attendance fresh.
        </Text>

        <Text style={styles.label}>Semester Name</Text>
        <TextInput
          placeholder="e.g. Semester 6"
          placeholderTextColor={THEME.textSecondary}
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          textColor={THEME.textPrimary}
          outlineColor={THEME.divider}
          activeOutlineColor={THEME.accent}
          theme={{ colors: { background: THEME.cardBg, onSurfaceVariant: THEME.textSecondary } }}
        />

        <Text style={styles.label}>Start Date</Text>
        
        {/* Android Date Input Trigger */}
        <View>
            <TextInput
            value={date.toLocaleDateString()}
            mode="outlined"
            editable={false}
            style={styles.input}
            textColor={THEME.textPrimary}
            outlineColor={THEME.divider}
            theme={{ colors: { background: THEME.cardBg, onSurfaceVariant: THEME.textSecondary } }}
            right={<TextInput.Icon icon="calendar" color={THEME.accent} onPress={showDatepicker} />}
            />
            {/* Invisible button to catch clicks over the input */}
            <TouchableOpacity 
                style={styles.dateOverlay} 
                onPress={showDatepicker}
            />
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor={THEME.accent}
          textColor="#000000" // Black text on Purple button
          labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
        >
          Start Semester
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  content: {
    padding: 24,
  },
  helperText: {
      color: THEME.textSecondary,
      marginBottom: 30,
      fontSize: 14,
      lineHeight: 20
  },
  label: {
    marginBottom: 8,
    color: THEME.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  input: {
    marginBottom: 24,
    backgroundColor: THEME.cardBg,
  },
  dateOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 24, // bottom matches input margin
  },
  button: {
    marginTop: 20,
    borderRadius: 12,
  }
});