import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';

export default function CurrentFlowAnimation({ width = 200, height = 10 }) {
  const flow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(flow, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = flow.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.View
        style={[
          styles.flow,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#222',
    borderRadius: 4,
  },
  flow: {
    width: '50%',
    height: '100%',
    backgroundColor: '#00eaff',
    opacity: 0.8,
  },
});
