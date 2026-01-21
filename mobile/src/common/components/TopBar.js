import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function TopBar({ 
  title, 
  showBack = true, 
  rightComponent,
  onBackPress 
}) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.topBar}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
      <Text style={styles.topBarTitle}>{title}</Text>
      {rightComponent || <View style={styles.backButtonPlaceholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: '#6366f1',
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
  },
  backButton: {
    padding: 4,
  },
  backButtonPlaceholder: {
    width: 32,
  },
  topBarTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
});

