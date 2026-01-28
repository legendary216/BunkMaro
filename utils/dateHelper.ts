// utils/dateHelper.ts

export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // Returns "2026-01-28"
};

export const getDayIndex = () => {
  // Returns 0 (Sun) to 6 (Sat)
  // We use the string method to ensure it matches the Calendar logic exactly
  const today = getTodayDateString(); 
  return new Date(today + "T12:00:00").getDay();
};