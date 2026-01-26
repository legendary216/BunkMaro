import React, { useState } from 'react';
import { Alert, StyleSheet, View, Keyboard } from 'react-native';
import { Button, Text, TextInput, HelperText } from 'react-native-paper';
import { supabase } from '../utils/supabase';
import { Colors } from '../constants/theme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request');

  // Step 1: Send (or Resend) the OTP
  async function signInWithOtp() {
    if (!email) {
      Alert.alert("Validation", "Please enter your email first.");
      return;
    }
    
    setLoading(true);
    Keyboard.dismiss(); // Close keyboard

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      });

      if (error) throw error;

      // Success
      setStep('verify');
      Alert.alert('Code Sent!', 'Check your email (and spam folder) for the 6-digit code.');
    } catch (error: any) {
      Alert.alert('Error Sending Code', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify the Code
  async function verifyOtp() {
    if (!otp || otp.length < 8) {
      Alert.alert("Validation", "Please enter the full 8-digit code.");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;
      
      // If we get here, Supabase updates the session automatically.
      // The _layout.tsx will detect this and switch screens.

    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: Colors.light.text }]}>
        {step === 'request' ? 'Bunk Maro' : 'Verify Identity'}
      </Text>
      
      <Text style={[styles.subtitle, { color: Colors.light.icon }]}>
        {step === 'request' 
          ? 'Enter your email to get a one-time login code.' 
          : `We sent a code to ${email}`}
      </Text>

      {/* --- Step 1: Email Form --- */}
      {step === 'request' && (
        <>
          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            activeOutlineColor={Colors.light.tint}
          />
          <Button
            mode="contained"
            onPress={signInWithOtp}
            loading={loading}
            disabled={loading}
            buttonColor={Colors.light.tint}
            style={styles.button}
          >
            Send Code
          </Button>
        </>
      )}

      {/* --- Step 2: OTP Form --- */}
      {step === 'verify' && (
        <>
          <TextInput
            label="8-Digit Code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
            activeOutlineColor={Colors.light.tint}
            maxLength={8}
          />
          
          <Button
            mode="contained"
            onPress={verifyOtp}
            loading={loading}
            disabled={loading}
            buttonColor={Colors.light.tint}
            style={styles.button}
          >
            Verify & Login
          </Button>

          <View style={styles.row}>
            <Button 
              mode="text" 
              onPress={() => setStep('request')} 
              textColor={Colors.light.icon}
            >
              Change Email
            </Button>
            <Button 
              mode="text" 
              onPress={signInWithOtp} 
              textColor={Colors.light.tint}
              disabled={loading}
            >
              Resend Code
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    paddingVertical: 6,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  }
});