import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>My App</Text>
        <Text style={styles.subtitle}>Welcome to your new iPhone app</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tap Counter</Text>
        <Text style={styles.count}>{count}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setCount(count + 1)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Tap me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCount(0)}
          activeOpacity={0.6}
        >
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Edit App.tsx to start building
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0b8',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  cardTitle: {
    fontSize: 18,
    color: '#a0a0b8',
    marginBottom: 12,
  },
  count: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#e94560',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#e94560',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    color: '#a0a0b8',
    fontSize: 14,
    marginTop: 4,
  },
  footer: {
    color: '#4a4a6a',
    fontSize: 14,
    marginTop: 40,
  },
});
