import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');
const CHART_SIZE = 120;
const RADIUS = 50;
const CENTER = CHART_SIZE / 2;

export default function PieChart({ data, total }) {
  const theme = useTheme();
  
  // Colors for each segment
  const colors = {
    pending: '#fbbf24', // Yellow
    inProgress: '#6366f1', // Purple
    completed: '#10b981', // Green
    cancelled: '#ef4444', // Red
  };

  // Calculate angles for each segment
  const calculateAngles = () => {
    if (!total || total === 0) return [];
    
    let currentAngle = -90; // Start from top
    const segments = [];
    
    data.forEach((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      segments.push({
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        percentage,
        color: colors[item.key] || theme.colors.primary,
      });
      
      currentAngle += angle;
    });
    
    return segments;
  };

  const segments = calculateAngles();

  // Convert angle to coordinates
  const getCoordinates = (angle) => {
    const radian = (angle * Math.PI) / 180;
    const x = CENTER + RADIUS * Math.cos(radian);
    const y = CENTER + RADIUS * Math.sin(radian);
    return { x, y };
  };

  // Create path for a segment
  const createPath = (startAngle, endAngle) => {
    const start = getCoordinates(startAngle);
    const end = getCoordinates(endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
          {segments.map((segment, index) => (
            <Path
              key={index}
              d={createPath(segment.startAngle, segment.endAngle)}
              fill={segment.color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}
        </Svg>
        {/* Center text overlay */}
        <View style={styles.centerText}>
          <View style={styles.centerTextBackground}>
            <Text style={styles.centerValue}>
              {total || 0}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartWrapper: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextBackground: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    width: 60,
    height: 60,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
  },
  centerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
});
