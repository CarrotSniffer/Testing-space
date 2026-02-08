import { StyleSheet, View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Building, BUILDINGS, GRID_SIZE } from './types';

const TW = 56; // tile width
const TH = 28; // tile height (half of width for 2:1 iso ratio)
const MAX_BH = 36; // max building height

// Isometric coordinate conversion
function toScreen(row: number, col: number) {
  return {
    x: (col - row) * (TW / 2),
    y: (col + row) * (TH / 2),
  };
}

const OFFSET_X = (GRID_SIZE - 1) * (TW / 2);
const MAP_W = (GRID_SIZE - 1) * TW + TW;
const MAP_H = (GRID_SIZE - 1) * TH + TH + MAX_BH + 20;

interface GameMapProps {
  grid: Building[][];
  onTilePress: (row: number, col: number) => void;
}

function Tile({
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
  const pos = toScreen(row, col);
  const bh = info.height;
  const hasBld = building.type !== 'empty';

  const topColor = hasBld ? info.topColor : ((row + col) % 2 === 0 ? '#4a8c3f' : '#509645');

  return (
    <View
      style={{
        position: 'absolute',
        left: pos.x + OFFSET_X,
        top: pos.y,
        width: TW,
        height: TH + bh + 2,
        zIndex: (row + col) * 10,
      }}
    >
      {/* Building left wall - triangle top */}
      {hasBld && bh > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: TH / 2 - bh,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderRightWidth: TW / 2,
            borderRightColor: 'transparent',
            borderBottomWidth: TH / 2,
            borderBottomColor: info.leftColor,
          }}
        />
      )}
      {/* Building left wall - rect body */}
      {hasBld && bh > 0 && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: TH - bh,
            width: TW / 2,
            height: bh,
            backgroundColor: info.leftColor,
          }}
        />
      )}
      {/* Building right wall - triangle top */}
      {hasBld && bh > 0 && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: TH / 2 - bh,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderLeftWidth: TW / 2,
            borderLeftColor: 'transparent',
            borderBottomWidth: TH / 2,
            borderBottomColor: info.rightColor,
          }}
        />
      )}
      {/* Building right wall - rect body */}
      {hasBld && bh > 0 && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: TH - bh,
            width: TW / 2,
            height: bh,
            backgroundColor: info.rightColor,
          }}
        />
      )}

      {/* Diamond top face - upper triangle */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          position: 'absolute',
          left: 0,
          top: TH / 2 - bh - TH / 2,
          width: TW,
          height: TH,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderLeftWidth: TW / 2,
            borderLeftColor: 'transparent',
            borderRightWidth: TW / 2,
            borderRightColor: 'transparent',
            borderBottomWidth: TH / 2,
            borderBottomColor: topColor,
          }}
        />
        <View
          style={{
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderLeftWidth: TW / 2,
            borderLeftColor: 'transparent',
            borderRightWidth: TW / 2,
            borderRightColor: 'transparent',
            borderTopWidth: TH / 2,
            borderTopColor: topColor,
          }}
        />
      </TouchableOpacity>

      {/* Emoji */}
      {hasBld && building.type !== 'road' && (
        <Text
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -bh - 2,
            textAlign: 'center',
            fontSize: 20,
          }}
        >
          {info.emoji}
        </Text>
      )}
    </View>
  );
}

export default function GameMap({ grid, onTilePress }: GameMapProps) {
  // Render back-to-front
  const tiles: { r: number; c: number }[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      tiles.push({ r, c });
    }
  }
  tiles.sort((a, b) => (a.r + a.c) - (b.r + b.c));

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScrollContent}
      >
        <View style={{ width: MAP_W, height: MAP_H }}>
          {tiles.map(({ r, c }) => (
            <Tile
              key={`${r}-${c}`}
              building={grid[r][c]}
              row={r}
              col={c}
              onPress={() => onTilePress(r, c)}
            />
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#1a2a1a',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  hScrollContent: {
    paddingHorizontal: 10,
  },
});
