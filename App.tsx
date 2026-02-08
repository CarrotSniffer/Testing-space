import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, SafeAreaView, View, Text, TouchableOpacity } from 'react-native';
import { BuildingType } from './src/types';
import { createInitialState, gameTick, placeBuilding, calculateIncome } from './src/gameLogic';
import GameMap from './src/GameMap';
import HUD from './src/HUD';
import Toolbar from './src/Toolbar';

export default function App() {
  const [gameState, setGameState] = useState(createInitialState);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType>('residential');
  const [message, setMessage] = useState('');
  const [paused, setPaused] = useState(false);

  // Game tick every 2 seconds
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setGameState((prev) => gameTick(prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [paused]);

  // Clear message after 2 seconds
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 2000);
    return () => clearTimeout(timeout);
  }, [message]);

  const handleTilePress = useCallback(
    (row: number, col: number) => {
      const result = placeBuilding(gameState, row, col, selectedBuilding);
      if (result) {
        setGameState(result);
        if (selectedBuilding === 'empty') {
          setMessage('Demolished!');
        } else {
          setMessage(`Placed ${selectedBuilding}`);
        }
      } else {
        if (gameState.grid[row][col].type !== 'empty' && selectedBuilding !== 'empty') {
          setMessage('Tile occupied! Use 🗑️ to clear');
        } else {
          setMessage('Not enough money!');
        }
      }
    },
    [gameState, selectedBuilding]
  );

  const income = calculateIncome(gameState.grid);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.titleBar}>
        <Text style={styles.title}>MiniCity</Text>
        <TouchableOpacity onPress={() => setPaused(!paused)} activeOpacity={0.7}>
          <Text style={styles.pauseBtn}>{paused ? '▶️' : '⏸️'}</Text>
        </TouchableOpacity>
      </View>

      <HUD
        money={gameState.money}
        population={gameState.population}
        happiness={gameState.happiness}
        income={income}
      />

      {message ? (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      <GameMap grid={gameState.grid} onTilePress={handleTilePress} />

      <Toolbar
        selected={selectedBuilding}
        money={gameState.money}
        onSelect={setSelectedBuilding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#0f1629',
  },
  title: {
    color: '#e94560',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pauseBtn: {
    fontSize: 22,
  },
  messageBanner: {
    backgroundColor: '#e94560',
    paddingVertical: 6,
    alignItems: 'center',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
