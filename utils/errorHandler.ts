import { Alert } from 'react-native';

export const handleSupabaseError = (error: any, customMessage: string = "An error occurred.") => {
  const msg = error.message || '';
  
  // 1. Check for Network Issues
  if (msg.includes('Network request failed') || msg.includes('fetch failed') || msg.includes('connection error')) {
    Alert.alert("Offline 📶", "Please check your internet connection and try again.");
    return;
  }

  // 2. Check for other common Supabase errors (optional)
  if (msg.includes('JWT')) {
    Alert.alert("Session Expired", "Please login again.");
    return;
  }

  // 3. Fallback for generic errors
  console.log("Supabase Error:", msg);
  Alert.alert("Error", `${customMessage}\n(${msg})`);
};