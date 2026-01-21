import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Picker({ 
  label, 
  selectedValue, 
  onValueChange, 
  items = [], 
  placeholder = 'Select an option',
  error,
  disabled = false
}) {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const theme = useTheme();

  // Find the selected item's label to display
  const selectedItem = items.find(item => {
    const value = item.value !== undefined ? item.value : item;
    return value === selectedValue;
  });
  
  // Ensure we always get a string for display
  let displayText = placeholder;
  if (selectedItem) {
    // If selectedItem is an object with label, use label
    if (typeof selectedItem === 'object' && selectedItem.label) {
      displayText = String(selectedItem.label);
    } 
    // If selectedItem is a string, use it directly
    else if (typeof selectedItem === 'string') {
      displayText = selectedItem;
    }
    // Fallback: try to get label or convert to string
    else {
      displayText = selectedItem.label ? String(selectedItem.label) : String(selectedItem);
    }
  } else if (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') {
    // If we have a selectedValue but no matching item, display the value as string
    displayText = String(selectedValue);
  }

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const query = searchQuery.toLowerCase().trim();
    return items.filter(item => {
      const label = typeof item === 'object' && item.label 
        ? String(item.label).toLowerCase() 
        : String(item).toLowerCase();
      return label.includes(query);
    });
  }, [items, searchQuery]);

  // Reset search when modal closes
  const handleModalClose = () => {
    setSearchQuery('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.picker,
          {
            borderColor: error ? theme.colors.error : theme.colors.border,
            backgroundColor: disabled ? theme.colors.background : theme.colors.surface,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: (selectedValue !== null && selectedValue !== undefined && selectedValue !== '') 
                ? theme.colors.text 
                : theme.colors.textSecondary,
            },
          ]}
        >
          {String(displayText)}
        </Text>
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>▼</Text>
      </TouchableOpacity>
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleModalClose}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {label || 'Select'}
              </Text>
              <TouchableOpacity
                onPress={handleModalClose}
                style={styles.closeButton}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Search Input - Always show for all selection tags */}
            <View style={styles.searchContainer}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }
                ]}
                placeholder="Search..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Results count or empty state */}
            {searchQuery.trim() && filteredItems.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No results found for "{searchQuery}"
                </Text>
              </View>
            )}

            <FlatList
              data={filteredItems}
              keyExtractor={(item, index) => {
                if (typeof item === 'object' && item.value !== undefined) {
                  return String(item.value) + '-' + index;
                }
                return String(item) + '-' + index;
              }}
              renderItem={({ item }) => {
                const value = typeof item === 'object' && item.value !== undefined ? item.value : item;
                const label = typeof item === 'object' && item.label ? String(item.label) : (typeof item === 'string' ? item : String(item));
                const isSelected = selectedValue === value;

                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isSelected && { backgroundColor: theme.colors.primary + '20' },
                    ]}
                    onPress={() => {
                      onValueChange(value);
                      handleModalClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.colors.text },
                        isSelected && { color: theme.colors.primary, fontWeight: '600' },
                      ]}
                    >
                      {label}
                    </Text>
                    {isSelected && (
                      <Text style={[styles.checkmark, { color: theme.colors.primary }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                !searchQuery.trim() ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                      No options available
                    </Text>
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    marginLeft: 8,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

