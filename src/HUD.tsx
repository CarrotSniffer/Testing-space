import { StyleSheet, View, Text } from 'react-native';

interface HUDProps {
  money: number;
  population: number;
  happiness: number;
  income: number;
}

export default function HUD({ money, population, happiness, income }: HUDProps) {
  const happinessColor =
    happiness >= 70 ? '#4ade80' : happiness >= 40 ? '#facc15' : '#f87171';

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.label}>Money</Text>
        <Text style={styles.value}>${money.toLocaleString()}</Text>
        <Text style={[styles.delta, { color: income >= 0 ? '#4ade80' : '#f87171' }]}>
          {income >= 0 ? '+' : ''}{income}/s
        </Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.label}>Pop</Text>
        <Text style={styles.value}>{population.toLocaleString()}</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.label}>Happy</Text>
        <Text style={[styles.value, { color: happinessColor }]}>{happiness}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#0f1629',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  delta: {
    fontSize: 12,
    marginTop: 1,
  },
});
