import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const maxBarHeight = 180;
const yAxisWidth = 28;

export default function BarChart({ data, labels }) {
  const theme = useTheme();
  
  // Find the maximum value to scale bars
  const maxValue = Math.max(...data, 1);
  
  // Colors for each bar
  const barColors = [
    '#6366f1',      // Pending - purple
    '#3b82f6',      // In Progress - blue
    '#10b981',      // Completed - green
    '#ef4444',      // Cancelled - red
  ];

  // Calculate Y-axis values (0, 3, 6, 9, 12 or similar based on maxValue)
  const getYAxisValues = () => {
    if (maxValue === 0) return [0, 3, 6, 9, 12];
    const step = Math.ceil(maxValue / 4);
    const values = [];
    for (let i = 0; i <= 4; i++) {
      values.push(i * step);
    }
    return values;
  };

  const yAxisValues = getYAxisValues();
  const maxYValue = yAxisValues[yAxisValues.length - 1] || 12;
  const segmentHeight = maxBarHeight / 4; // Each Y-axis segment height

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisContainer}>
          {yAxisValues.slice().reverse().map((value, idx) => {
            // Position label at the exact Y position (0 at bottom, maxYValue at top)
            // For value 0, position at bottom (0)
            // For value maxYValue, position at top (maxBarHeight)
            const labelPosition = maxYValue > 0 ? (value / maxYValue) * maxBarHeight : 0;
            return (
              <View 
                key={idx} 
                style={[
                  styles.yAxisLabelContainer,
                  { 
                    position: 'absolute',
                    bottom: labelPosition - 6, // Adjust for text centering
                    right: 0,
                  }
                ]}
              >
                <Text style={[styles.yAxisLabel, { color: theme.colors.textSecondary }]}>
                  {value}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((value, index) => {
            // Calculate bar height to match Y-axis scale
            const barHeight = maxYValue > 0 ? (value / maxYValue) * maxBarHeight : 0;
            const barColor = barColors[index] || theme.colors.primary;
            const goalHeight = maxBarHeight; // Full height for goal
            const actualHeight = barHeight;
            const goalTopHeight = goalHeight - actualHeight; // Light gray top portion
            
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={[styles.barContainer, { height: maxBarHeight }]}>
                  {/* Bar with two sections */}
                  <View style={[styles.barStack, { height: maxBarHeight }]}>
                    {/* Top section (light gray - goal) */}
                    {goalTopHeight > 0 && (
                      <View
                        style={[
                          styles.barTop,
                          {
                            height: goalTopHeight,
                            backgroundColor: '#e2e8f0',
                          },
                        ]}
                      />
                    )}
                    {/* Bottom section (colored - actual value) */}
                    {actualHeight > 0 && (
                      <View
                        style={[
                          styles.barBottom,
                          {
                            height: actualHeight,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
                {/* X-axis label */}
                <Text
                  style={[styles.xAxisLabel, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    height: maxBarHeight + 40,
    alignItems: 'flex-start',
  },
  yAxisContainer: {
    width: yAxisWidth,
    height: maxBarHeight,
    position: 'relative',
    paddingRight: 6,
  },
  yAxisLabelContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  yAxisLabel: {
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '500',
    lineHeight: 14,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 4,
    height: maxBarHeight,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: 3,
    height: maxBarHeight + 32,
  },
  barContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
    height: maxBarHeight,
  },
  barStack: {
    width: '70%',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barTop: {
    width: '100%',
  },
  barBottom: {
    width: '100%',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  xAxisLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 0,
    fontWeight: '500',
    lineHeight: 14,
  },
});

