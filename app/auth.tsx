import React, { useState } from 'react';
import { Alert, StyleSheet, View, Keyboard, Platform, KeyboardAvoidingView } from 'react-native'; // <--- 1. ADD IMPORTS
import { Button, Text, TextInput, Surface, IconButton } from 'react-native-paper';
import { supabase } from '../utils/supabase'; 
import { handleSupabaseError } from '../utils/errorHandler';

const THEME = {
  bg: '#121212',           
  cardBg: '#1E1E1E',       
  textPrimary: '#E0E0E0',  
  textSecondary: '#A0A0A0',
  accent: '#BB86FC',       
  divider: '#333',      
};

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'request' | 'verify'>('request');

  async function signInWithOtp() {
    if (!email) {
      Alert.alert("Validation", "Please enter your email first.");
      return;
    }
    setLoading(true);
    Keyboard.dismiss(); 

    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep('verify');
      Alert.alert('Code Sent!', 'Check your email for the code.');
    } catch (error: any) {
      handleSupabaseError(error, "Could not send code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otp || otp.length < 6) {
      Alert.alert("Validation", "Please enter the full code.");
      return;
    }
    setLoading(true);
    Keyboard.dismiss();

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
    } catch (error: any) {
      handleSupabaseError(error, "Login Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    // --- 2. WRAP EVERYTHING IN KEYBOARD AVOIDING VIEW ---
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: THEME.bg }]}>
        
        {/* --- BRANDING SECTION --- */}
        <View style={styles.brandSection}>
          <IconButton icon="ghost" iconColor={THEME.accent} size={60} style={{ margin: 0 }} />
          <Text variant="displaySmall" style={{ fontWeight: 'bold', color: THEME.textPrimary, letterSpacing: 1 }}>
              Bunk<Text style={{ color: THEME.accent }}>Maro</Text>
          </Text>
          <Text style={{ color: THEME.textSecondary, marginTop: 5, letterSpacing: 1 }}>
              ATTENDANCE TRACKER
          </Text>
        </View>

        {/* --- FORM SECTION --- */}
        <Surface style={styles.card} elevation={2}>
            
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: THEME.textPrimary, marginBottom: 5, textAlign: 'center' }}>
              {step === 'request' ? 'Welcome Back' : 'Verify Identity'}
            </Text>
            
            <Text style={{ color: THEME.textSecondary, marginBottom: 25, textAlign: 'center', fontSize: 13 }}>
              {step === 'request' 
                ? 'Enter your email to get a login code.' 
                : `Enter the code sent to ${email}`}
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
                  textColor={THEME.textPrimary}
                  style={styles.input}
                  outlineColor={THEME.divider}
                  activeOutlineColor={THEME.accent}
                  theme={{ colors: { background: THEME.bg, onSurfaceVariant: THEME.textSecondary } }}
                  left={<TextInput.Icon icon="email-outline" color={THEME.textSecondary} />}
                />
                
                <Button
                  mode="contained"
                  onPress={signInWithOtp}
                  loading={loading}
                  disabled={loading}
                  buttonColor={THEME.accent}
                  textColor="#000000"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 5 }}
                  labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                >
                  Send Code
                </Button>
              </>
            )}

            {/* --- Step 2: OTP Form --- */}
            {step === 'verify' && (
              <>
                <TextInput
                  label="Code"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  mode="outlined"
                  textColor={THEME.textPrimary}
                  style={styles.input}
                  outlineColor={THEME.divider}
                  activeOutlineColor={THEME.accent}
                  maxLength={8}
                  theme={{ colors: { background: THEME.bg, onSurfaceVariant: THEME.textSecondary } }}
                  left={<TextInput.Icon icon="lock-outline" color={THEME.textSecondary} />}
                />
                
                <Button
                  mode="contained"
                  onPress={verifyOtp}
                  loading={loading}
                  disabled={loading}
                  buttonColor={THEME.accent}
                  textColor="#000000"
                  style={styles.button}
                  contentStyle={{ paddingVertical: 5 }}
                  labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                >
                  Login
                </Button>

                <View style={styles.footerRow}>
                  <Button 
                    mode="text" 
                    compact
                    onPress={() => setStep('request')} 
                    textColor={THEME.textSecondary}
                    labelStyle={{ fontSize: 12 }}
                  >
                    Change Email
                  </Button>
                  <Button 
                    mode="text" 
                    compact
                    onPress={signInWithOtp} 
                    textColor={THEME.accent}
                    disabled={loading}
                    labelStyle={{ fontSize: 12 }}
                  >
                    Resend Code
                  </Button>
                </View>
              </>
            )}
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center', // Keeps content centered vertically
  },
  brandSection: {
      alignItems: 'center',
      marginBottom: 40,
  },
  card: {
      backgroundColor: THEME.cardBg,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: '#333'
  },
  input: {
    marginBottom: 20,
    backgroundColor: THEME.bg,
  },
  button: {
    borderRadius: 10,
    marginTop: 5
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  }
});