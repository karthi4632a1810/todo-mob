import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

const CHART_WIDTH = 60;
const CHART_HEIGHT = 20;

export default function MiniLineChart({ data = [], color = '#6366f1' }) {
  // Generate sample data if none provided
  const chartData = data.length > 0 ? data : [2, 4, 3, 5, 4, 6, 5];
  const maxValue = Math.max(...chartData, 1);
  
  // Normalize data to chart height
  const points = chartData.map((value, index) => {
    const x = (index / (chartData.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Add small circles at data points */}
        {chartData.map((value, index) => {
          const x = (index / (chartData.length - 1)) * CHART_WIDTH;
          const y = CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
});
