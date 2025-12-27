import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { diaryAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Button from '../../common/components/Button';
import { useTheme } from '../../common/theme/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

// Available colors for notes
const NOTE_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Orange', value: '#fed7aa' },
  { name: 'Red', value: '#fee2e2' },
];

// Available label colors
const LABEL_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#14b8a6', '#a855f7',
];

export default function DiaryScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [diaries, setDiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  
  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [noteLabels, setNoteLabels] = useState([]);
  const [noteBackgroundColor, setNoteBackgroundColor] = useState('#ffffff');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated && user && token) {
      loadDiaries();
    }
  }, [user, isAuthenticated, token, searchQuery, selectedLabel, selectedColor]);

  const loadDiaries = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedLabel) {
        params.label = selectedLabel;
      }
      if (selectedColor) {
        params.backgroundColor = selectedColor;
      }
      
      const response = await diaryAPI.getDiaryEntries(params);
      const diaryEntries = response.data?.data?.diaries || response.data?.diaries || [];
      setDiaries(diaryEntries);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading diary entries:', error);
      }
      setDiaries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDiaries();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteIsPinned(false);
    setNoteLabels([]);
    setNoteBackgroundColor('#ffffff');
    setShowCreateModal(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteContent(note.content || '');
    setNoteIsPinned(note.isPinned || false);
    setNoteLabels(note.labels || []);
    setNoteBackgroundColor(note.backgroundColor || '#ffffff');
    setShowCreateModal(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert('Error', 'Title and content are required');
      return;
    }

    try {
      const noteData = {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        isPinned: noteIsPinned,
        labels: noteLabels,
        backgroundColor: noteBackgroundColor,
      };

      if (editingNote) {
        await diaryAPI.updateDiary(editingNote._id, noteData);
        Alert.alert('Success', 'Note updated successfully');
      } else {
        await diaryAPI.createDiary(noteData);
        Alert.alert('Success', 'Note created successfully');
      }

      setShowCreateModal(false);
      loadDiaries();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save note');
    }
  };

  const handleDeleteNote = (note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await diaryAPI.deleteDiary(note._id);
              Alert.alert('Success', 'Note deleted successfully');
              loadDiaries();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const togglePin = async (note) => {
    try {
      await diaryAPI.updateDiary(note._id, { isPinned: !note.isPinned });
      loadDiaries();
    } catch (error) {
      Alert.alert('Error', 'Failed to update pin status');
    }
  };

  const addLabel = () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Label name is required');
      return;
    }
    setNoteLabels([...noteLabels, { name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName('');
    setNewLabelColor('#6366f1');
    setShowLabelModal(false);
  };

  const removeLabel = (index) => {
    setNoteLabels(noteLabels.filter((_, i) => i !== index));
  };

  // Get all unique labels from all notes for filtering
  const getAllLabels = () => {
    const labelSet = new Set();
    diaries.forEach(note => {
      note.labels?.forEach(label => {
        labelSet.add(JSON.stringify({ name: label.name, color: label.color }));
      });
    });
    return Array.from(labelSet).map(str => JSON.parse(str));
  };

  const renderNoteCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.noteCard,
        {
          backgroundColor: item.backgroundColor || '#ffffff',
          width: CARD_WIDTH,
        },
      ]}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDeleteNote(item)}
    >
      {item.isPinned && (
        <View style={styles.pinContainer}>
          <Text style={styles.pinIcon}>📌</Text>
        </View>
      )}
      <Text style={[styles.noteTitle, { color: theme.colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.noteContent, { color: theme.colors.textSecondary }]} numberOfLines={4}>
        {item.content}
      </Text>
      {item.labels && item.labels.length > 0 && (
        <View style={styles.labelsContainer}>
          {item.labels.map((label, index) => (
            <View
              key={index}
              style={[
                styles.labelBadge,
                { backgroundColor: label.color + '30' },
              ]}
            >
              <Text style={[styles.labelText, { color: label.color }]}>
                {label.name}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.noteFooter}>
        <Text style={[styles.noteDate, { color: theme.colors.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          onPress={() => togglePin(item)}
          style={styles.pinButton}
        >
          <Text style={styles.pinButtonText}>
            {item.isPinned ? '📌' : '📍'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const allLabels = getAllLabels();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search and Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Search notes..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {allLabels.map((label, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedLabel === label.name
                      ? label.color
                      : theme.colors.background,
                  borderColor: label.color,
                },
              ]}
              onPress={() =>
                setSelectedLabel(selectedLabel === label.name ? '' : label.name)
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      selectedLabel === label.name ? '#ffffff' : label.color,
                  },
                ]}
              >
                {label.name}
              </Text>
            </TouchableOpacity>
          ))}
          {NOTE_COLORS.map((color, index) => (
            <TouchableOpacity
              key={`color-${index}`}
              style={[
                styles.colorFilterChip,
                {
                  backgroundColor: color.value,
                  borderWidth: selectedColor === color.value ? 2 : 1,
                  borderColor:
                    selectedColor === color.value
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
              onPress={() =>
                setSelectedColor(selectedColor === color.value ? '' : color.value)
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* Notes Grid */}
      <FlatList
        data={diaries}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {searchQuery || selectedLabel || selectedColor
                ? 'No notes found'
                : 'No notes yet. Create your first note!'}
            </Text>
          </View>
        }
      />

      {/* Create Note FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreateModal}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create/Edit Note Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: noteBackgroundColor },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {editingNote ? 'Edit Note' : 'New Note'}
              </Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={() => setNoteIsPinned(!noteIsPinned)}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>
                    {noteIsPinned ? '📌' : '📍'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowColorPicker(!showColorPicker)}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>🎨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowLabelModal(true)}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonText}>🏷️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(false)}
                  style={styles.headerButton}
                >
                  <Text style={[styles.headerButtonText, { fontSize: 20 }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Color Picker */}
              {showColorPicker && (
                <View style={styles.colorPickerContainer}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Background Color
                  </Text>
                  <View style={styles.colorGrid}>
                    {NOTE_COLORS.map((color, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: color.value,
                            borderWidth: noteBackgroundColor === color.value ? 3 : 1,
                            borderColor:
                              noteBackgroundColor === color.value
                                ? theme.colors.primary
                                : theme.colors.border,
                          },
                        ]}
                        onPress={() => {
                          setNoteBackgroundColor(color.value);
                          setShowColorPicker(false);
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Labels */}
              {noteLabels.length > 0 && (
                <View style={styles.labelsDisplayContainer}>
                  <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>
                    Labels
                  </Text>
                  <View style={styles.labelsDisplay}>
                    {noteLabels.map((label, index) => (
                      <View
                        key={index}
                        style={[
                          styles.labelBadge,
                          { backgroundColor: label.color + '30' },
                        ]}
                      >
                        <Text style={[styles.labelText, { color: label.color }]}>
                          {label.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeLabel(index)}
                          style={styles.removeLabelButton}
                        >
                          <Text style={styles.removeLabelText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TextInput
                style={[
                  styles.noteInputTitle,
                  { color: theme.colors.text },
                ]}
                placeholder="Title"
                placeholderTextColor={theme.colors.textSecondary}
                value={noteTitle}
                onChangeText={setNoteTitle}
                multiline
              />

              <TextInput
                style={[
                  styles.noteInputContent,
                  { color: theme.colors.text },
                ]}
                placeholder="Take a note..."
                placeholderTextColor={theme.colors.textSecondary}
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                textAlignVertical="top"
              />

              {editingNote && (
                <Button
                  title="Delete Note"
                  onPress={() => {
                    setShowCreateModal(false);
                    handleDeleteNote(editingNote);
                  }}
                  variant="outline"
                  style={styles.deleteButton}
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={editingNote ? 'Update' : 'Save'}
                onPress={handleSaveNote}
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Label Modal */}
      <Modal
        visible={showLabelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLabelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.labelModalTitle, { color: theme.colors.text }]}>
              Add Label
            </Text>
            <TextInput
              style={[
                styles.labelInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Label name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newLabelName}
              onChangeText={setNewLabelName}
            />
            <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 16 }]}>
              Label Color
            </Text>
            <View style={styles.colorGrid}>
              {LABEL_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color,
                      borderWidth: newLabelColor === color ? 3 : 1,
                      borderColor:
                        newLabelColor === color
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => setNewLabelColor(color)}
                />
              ))}
            </View>
            <View style={styles.labelModalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowLabelModal(false)}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Add"
                onPress={addLabel}
                style={styles.addButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filterScroll: {
    maxHeight: 50,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorFilterChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
  },
  noteCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    marginRight: 16,
    minHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pinContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  pinIcon: {
    fontSize: 16,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 8,
    flex: 1,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  removeLabelButton: {
    marginLeft: 4,
  },
  removeLabelText: {
    fontSize: 12,
    color: '#666',
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  noteDate: {
    fontSize: 10,
  },
  pinButton: {
    padding: 4,
  },
  pinButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 20,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  colorPickerContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  labelsDisplayContainer: {
    marginBottom: 16,
  },
  labelsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  noteInputTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    minHeight: 40,
  },
  noteInputContent: {
    fontSize: 16,
    minHeight: 200,
  },
  deleteButton: {
    marginTop: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    marginTop: 0,
  },
  labelModalContent: {
    margin: 32,
    padding: 24,
    borderRadius: 16,
  },
  labelModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  labelInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  labelModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
});
