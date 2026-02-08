import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Building, BuildingType, BUILDINGS, GRID_SIZE } from './types';

const TILE_SIZE = 44;

const TILE_COLORS: Record<BuildingType, string> = {
  empty: '#2d5a27',
  residential: '#2a4a7f',
  commercial: '#7a6a2a',
  industrial: '#6a3a2a',
  park: '#1a6a2a',
  road: '#555555',
  power: '#5a4a1a',
};

interface GameMapProps {
  grid: Building[][];
  onTilePress: (row: number, col: number) => void;
}

export default function GameMap({ grid, onTilePress }: GameMapProps) {
  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      horizontal={false}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
      >
        <View>
          {grid.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((cell, c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.tile,
                    { backgroundColor: TILE_COLORS[cell.type] },
                  ]}
                  onPress={() => onTilePress(r, c)}
                  activeOpacity={0.7}
                >
                  {cell.type !== 'empty' && cell.type !== 'road' && (
                    <Text style={styles.emoji}>
                      {BUILDINGS[cell.type].emoji}
                    </Text>
                  )}
                  {cell.type === 'road' && (
                    <View style={styles.road} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  gridContainer: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  road: {
    width: TILE_SIZE - 8,
    height: TILE_SIZE - 8,
    backgroundColor: '#777',
    borderRadius: 2,
  },
});
