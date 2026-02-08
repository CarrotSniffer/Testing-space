import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Building, BUILDINGS, GRID_SIZE, TILE_WIDTH, TILE_HEIGHT } from './types';

// Convert grid coords to isometric screen coords
function toIso(row: number, col: number) {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

// Total canvas size for the isometric grid
const MAP_WIDTH = GRID_SIZE * TILE_WIDTH + TILE_WIDTH;
const MAP_HEIGHT = GRID_SIZE * TILE_HEIGHT + 80; // extra for building heights

interface GameMapProps {
  grid: Building[][];
  onTilePress: (row: number, col: number) => void;
}

function IsometricTile({
  building,
  row,
  col,
  onPress,
}: {
  building: Building;
  row: number;
  col: number;
  onPress: () => void;
}) {
  const info = BUILDINGS[building.type];
  const pos = toIso(row, col);
  const bHeight = info.height;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.tileContainer,
        {
          left: pos.x + MAP_WIDTH / 2 - TILE_WIDTH / 2,
          top: pos.y - bHeight,
          zIndex: row + col,
        },
      ]}
    >
      {/* Building body (left face) */}
      {bHeight > 0 && (
        <View
          style={[
            styles.buildingLeft,
            {
              height: bHeight,
              top: TILE_HEIGHT / 2,
              backgroundColor: info.leftColor,
            },
          ]}
        />
      )}

      {/* Building body (right face) */}
      {bHeight > 0 && (
        <View
          style={[
            styles.buildingRight,
            {
              height: bHeight,
              top: TILE_HEIGHT / 2,
              backgroundColor: info.rightColor,
            },
          ]}
        />
      )}

      {/* Top diamond face */}
      <View style={styles.diamondWrapper}>
        <View
          style={[
            styles.diamond,
            { backgroundColor: info.topColor },
          ]}
        />
      </View>

      {/* Emoji for buildings */}
      {building.type !== 'empty' && building.type !== 'road' && (
        <Text style={[styles.emoji, { top: -bHeight / 2 - 4 }]}>
          {info.emoji}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function GameMap({ grid, onTilePress }: GameMapProps) {
  // Flatten grid and sort by render order (back to front)
  const tiles: { row: number; col: number; building: Building }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      tiles.push({ row: r, col: c, building: grid[r][c] });
    }
  }
  tiles.sort((a, b) => (a.row + a.col) - (b.row + b.col));

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        <View style={[styles.mapContainer, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
          {tiles.map(({ row, col, building }) => (
            <IsometricTile
              key={`${row}-${col}`}
              building={building}
              row={row}
              col={col}
              onPress={() => onTilePress(row, col)}
            />
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#1a2a1a',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  horizontalContent: {
    paddingHorizontal: 20,
  },
  mapContainer: {
    position: 'relative',
  },
  tileContainer: {
    position: 'absolute',
    width: TILE_WIDTH,
    height: TILE_HEIGHT + 40,
    alignItems: 'center',
  },
  diamondWrapper: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamond: {
    width: TILE_WIDTH * 0.7,
    height: TILE_WIDTH * 0.7,
    transform: [{ rotate: '45deg' }, { scaleY: 0.5 }],
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  buildingLeft: {
    position: 'absolute',
    left: 0,
    width: TILE_WIDTH / 2,
    borderLeftWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  buildingRight: {
    position: 'absolute',
    right: 0,
    width: TILE_WIDTH / 2,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  emoji: {
    position: 'absolute',
    fontSize: 18,
    textAlign: 'center',
  },
});
