import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { reportAPI } from '../../services/api';
import Card from '../../common/components/Card';
import { useTheme } from '../../common/theme/ThemeContext';

export default function ReportsScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Only load data if user is authenticated
    if (isAuthenticated && user && token) {
      loadStats();
    }
  }, [user, isAuthenticated, token]);

  const loadStats = async () => {
    try {
      const response = await reportAPI.getStats();
      // Backend returns: { success, message, data: { stats }, errors }
      setStats(response.data.data.stats || response.data.stats);
    } catch (error) {
      // Don't log 401 errors - they're handled by the interceptor
      if (error.response?.status !== 401) {
        console.error('Error loading stats:', error);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {stats && (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Task Statistics
            </Text>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Tasks:
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {stats.total}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Pending:
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                {stats.pending}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                In Progress:
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.info }]}>
                {stats.inProgress}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Completed:
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.success }]}>
                {stats.completed}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Cancelled:
              </Text>
              <Text style={[styles.statValue, { color: theme.colors.error }]}>
                {stats.cancelled}
              </Text>
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

