import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { BuildingType, BUILDINGS } from './types';

const BUILD_ORDER: BuildingType[] = [
  'residential',
  'commercial',
  'industrial',
  'park',
  'road',
  'power',
  'empty',
];

interface ToolbarProps {
  selected: BuildingType;
  money: number;
  onSelect: (type: BuildingType) => void;
}

export default function Toolbar({ selected, money, onSelect }: ToolbarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {BUILD_ORDER.map((type) => {
          const info = BUILDINGS[type];
          const isSelected = selected === type;
          const canAfford = money >= info.cost;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.item,
                isSelected && styles.itemSelected,
                !canAfford && type !== 'empty' && styles.itemDisabled,
              ]}
              onPress={() => onSelect(type)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>
                {type === 'empty' ? '🗑️' : type === 'road' ? '🛣️' : info.emoji}
              </Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {info.label}
              </Text>
              {info.cost > 0 && (
                <Text style={[styles.cost, !canAfford && styles.costRed]}>
                  ${info.cost}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1629',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
    gap: 6,
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: '#e94560',
    backgroundColor: '#2a1a2e',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  labelSelected: {
    color: '#e94560',
  },
  cost: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  costRed: {
    color: '#f87171',
  },
});
