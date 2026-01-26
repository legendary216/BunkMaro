import React, { useState } from 'react';
import { StyleSheet, View, Keyboard, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';

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

      Alert.alert('Success', 'Semester created!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Appbar.Header style={{ backgroundColor: 'transparent' }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="New Semester" />
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={styles.label}>What semester is this?</Text>
        <TextInput
          label="Semester Name"
          placeholder="e.g. Sem 6"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          activeOutlineColor={Colors.light.tint}
        />

        <Text style={styles.label}>When does it start?</Text>
        
        {/* Android Date Input Trigger */}
        <View>
            <TextInput
            label="Start Date"
            value={date.toLocaleDateString()}
            mode="outlined"
            editable={false}
            right={<TextInput.Icon icon="calendar" onPress={showDatepicker} />}
            style={styles.input}
            />
            {/* Invisible button to catch clicks over the input */}
            <Button 
                style={styles.dateOverlay} 
                onPress={showDatepicker}
            >
                Pick Date
            </Button>
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          style={[styles.button, { backgroundColor: Colors.light.tint }]}
          contentStyle={{ paddingVertical: 8 }}
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
  content: {
    padding: 24,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  },
  input: {
    marginBottom: 24,
    backgroundColor: 'white',
  },
  dateOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    height: '100%',
    opacity: 0,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
  }
});