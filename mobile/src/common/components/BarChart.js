import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 64; // Account for padding
const maxBarHeight = 180;

export default function BarChart({ data, labels }) {
  const theme = useTheme();
  
  // Find the maximum value to scale bars
  const maxValue = Math.max(...data, 1);
  
  // Colors for each bar
  const barColors = [
    theme.colors.primary || '#6366f1',      // Pending
    theme.colors.info || '#3b82f6',         // In Progress
    '#10b981',                              // Completed (green)
    theme.colors.error || '#ef4444',        // Cancelled
  ];

  return (
    <View style={styles.container}>
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisContainer}>
          {[0, 25, 50, 75, 100].map((percent) => {
            const value = Math.round((maxValue * percent) / 100);
            return (
              <View key={percent} style={styles.yAxisLabelContainer}>
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
            const barHeight = maxValue > 0 ? (value / maxValue) * maxBarHeight : 0;
            const percentage = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
            
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  {/* Bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: barColors[index] || theme.colors.primary,
                      },
                    ]}
                  >
                    {/* Value label on top of bar */}
                    {value > 0 && (
                      <Text style={styles.barValue}>{value}</Text>
                    )}
                  </View>
                </View>
                {/* X-axis label */}
                <Text
                  style={[styles.xAxisLabel, { color: theme.colors.text }]}
                  numberOfLines={2}
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
    paddingVertical: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    height: maxBarHeight + 60, // Bar height + labels
  },
  yAxisContainer: {
    width: 40,
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingTop: 20,
  },
  yAxisLabelContainer: {
    height: maxBarHeight / 4,
    justifyContent: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  barContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: maxBarHeight,
  },
  bar: {
    width: '80%',
    minHeight: 4,
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  barValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  xAxisLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});

