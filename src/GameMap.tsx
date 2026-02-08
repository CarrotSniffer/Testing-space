import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Building, BUILDINGS, GRID_SIZE } from './types';

const TILE_SIZE = 28;

const GRASS = ['#4a8c3f', '#509645'];

interface GameMapProps {
  grid: Building[][];
  onTilePress: (row: number, col: number) => void;
}

export default function GameMap({ grid, onTilePress }: GameMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.isoWrapper}>
        {grid.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const info = BUILDINGS[cell.type];
              const hasBuilding = cell.type !== 'empty';
              const grassColor = GRASS[(r + c) % 2];

              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.tile, { backgroundColor: grassColor }]}
                  onPress={() => onTilePress(r, c)}
                  activeOpacity={0.7}
                >
                  {hasBuilding && (
                    <View
                      style={[
                        styles.buildingBase,
                        {
                          backgroundColor: info.leftColor,
                          height: info.height + TILE_SIZE - 6,
                        },
                      ]}
                    >
                      {/* Top face */}
                      <View
                        style={[
                          styles.buildingTop,
                          { backgroundColor: info.topColor },
                        ]}
                      />
                      {/* Right face accent */}
                      <View
                        style={[
                          styles.buildingRight,
                          { backgroundColor: info.rightColor },
                        ]}
                      />
                      {/* Emoji */}
                      {cell.type !== 'road' && (
                        <Text style={styles.emoji}>{info.emoji}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2a1a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  isoWrapper: {
    transform: [
      { scale: 0.82 },
      { rotateX: '55deg' },
      { rotateZ: '45deg' },
    ],
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
  },
  buildingBase: {
    position: 'absolute',
    bottom: 1,
    left: 2,
    right: 2,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buildingTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  buildingRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '35%',
    opacity: 0.7,
  },
  emoji: {
    fontSize: 14,
    marginTop: 2,
  },
});
