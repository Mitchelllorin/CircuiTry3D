import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GLView } from 'expo-gl';
import { SceneRenderer } from './three/SceneRenderer';

export default function App() {
  const rendererRef = useRef<SceneRenderer | null>(null);
  const [wireMode, setWireMode] = useState(false);
  const [rotateMode, setRotateMode] = useState(false);

  const onContextCreate = useCallback(async (gl: any) => {
    const renderer = new SceneRenderer();
    await renderer.init(gl);
    rendererRef.current = renderer;
  }, []);

  const addComponent = useCallback((type: 'battery' | 'resistor' | 'led' | 'switch') => {
    rendererRef.current?.addComponent(type);
  }, []);

  const addJunction = useCallback(() => {
    rendererRef.current?.addJunction();
  }, []);

  const toggleWire = useCallback(() => {
    setWireMode((p) => !p);
    rendererRef.current?.setWireMode(!wireMode);
  }, [wireMode]);

  const toggleRotate = useCallback(() => {
    setRotateMode((p) => !p);
    rendererRef.current?.setRotateMode(!rotateMode);
  }, [rotateMode]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          rendererRef.current?.handleResize(width, height);
        }}
        onTouchStart={(e) => {
          const touches = e.nativeEvent.touches.map(t => ({ x: t.pageX, y: t.pageY }));
          rendererRef.current?.handleGestureStart(touches);
          if (touches.length === 1) {
            rendererRef.current?.handleTap(touches[0].x, touches[0].y);
          }
        }}
        onTouchMove={(e) => {
          const touches = e.nativeEvent.touches.map(t => ({ x: t.pageX, y: t.pageY }));
          rendererRef.current?.handleGestureMove(touches);
        }}
        onTouchEnd={() => {
          rendererRef.current?.handleGestureEnd();
        }}
      />

      <View style={styles.menuBar}>
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => addComponent('battery')}><Text style={styles.btnText}>Battery</Text></Pressable>
          <Pressable style={styles.btn} onPress={() => addComponent('resistor')}><Text style={styles.btnText}>Resistor</Text></Pressable>
          <Pressable style={styles.btn} onPress={() => addComponent('led')}><Text style={styles.btnText}>LED</Text></Pressable>
          <Pressable style={styles.btn} onPress={() => addComponent('switch')}><Text style={styles.btnText}>Switch</Text></Pressable>
        </View>
        <View style={styles.row}>
          <Pressable style={[styles.btn, wireMode && styles.active]} onPress={toggleWire}><Text style={styles.btnText}>Wire</Text></Pressable>
          <Pressable style={[styles.btn, rotateMode && styles.active]} onPress={toggleRotate}><Text style={styles.btnText}>Rotate</Text></Pressable>
          <Pressable style={styles.btn} onPress={addJunction}><Text style={styles.btnText}>Junction</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  menuBar: {
    position: 'absolute', left: 0, right: 0, bottom: 16,
    paddingHorizontal: 12, gap: 8,
  },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  btn: {
    backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8,
  },
  active: { backgroundColor: '#00cc66' },
  btnText: { color: '#fff', fontWeight: '600' },
});
