import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface ScreenWrapperProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
  style?: any;
}

export default function ScreenWrapper({ onSwipeLeft, onSwipeRight, children, style }: ScreenWrapperProps) {
  const touchStart = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: any) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };

  const handleTouchEnd = (e: any) => {
    const touchEnd = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };

    const dx = touchStart.current.x - touchEnd.x;
    const dy = touchStart.current.y - touchEnd.y;

    // 1. Check if swipe is horizontal (moves more X than Y)
    if (Math.abs(dx) > Math.abs(dy)) {
      // 2. Threshold check (must swipe at least 50px)
      if (Math.abs(dx) > 50) {
        if (dx > 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (dx < 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    }
  };

  return (
    <View 
      style={[styles.container, style]} 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});