import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  PanResponder,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { diaryAPI } from '../../services/api';
import Card from '../../common/components/Card';
import Button from '../../common/components/Button';
import FloatingActionButton from '../../common/components/FloatingActionButton';
import DatePicker from '../../common/components/DatePicker';
import { useTheme } from '../../common/theme/ThemeContext';

const { width } = Dimensions.get('window');

// Default colors for notes
const DEFAULT_NOTE_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#e9d5ff' },
];

// Default label colors
const DEFAULT_LABEL_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#14b8a6',
];

const STORAGE_KEYS = {
  CUSTOM_NOTE_COLORS: 'diary_custom_note_colors',
  CUSTOM_LABEL_COLORS: 'diary_custom_label_colors',
  CUSTOM_LABELS: 'diary_custom_labels',
};

export default function DiaryScreen() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);
  const [diaries, setDiaries] = useState([]);
  const [allDiariesForLabels, setAllDiariesForLabels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'year', 'custom'
  const [customDateRange, setCustomDateRange] = useState({ from: null, to: null });
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState('');
  
  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteIsPinned, setNoteIsPinned] = useState(false);
  const [noteLabels, setNoteLabels] = useState([]);
  const [noteBackgroundColor, setNoteBackgroundColor] = useState('#ffffff');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  
  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [customNoteColors, setCustomNoteColors] = useState([]);
  const [customLabelColors, setCustomLabelColors] = useState([]);
  const [customLabels, setCustomLabels] = useState([]);
  const [editingLabel, setEditingLabel] = useState(null);
  const [editingColor, setEditingColor] = useState(null);
  const [newColorValue, setNewColorValue] = useState('#ffffff');
  const [newColorName, setNewColorName] = useState('');
  const [rgbValues, setRgbValues] = useState({ r: 255, g: 255, b: 255 });
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [showEditLabelModal, setShowEditLabelModal] = useState(false);
  const [showEditColorModal, setShowEditColorModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('flag');
  const [isEditMode, setIsEditMode] = useState(false);
  
  const theme = useTheme();

  // Available icons for labels
  const LABEL_ICONS = [
    'flag', 'heart', 'star', 'bookmark', 'home', 'briefcase', 'school', 'fitness',
    'restaurant', 'car', 'airplane', 'musical-notes', 'camera', 'game-controller',
    'pizza', 'wine', 'basketball', 'football', 'tennisball', 'bicycle', 'bed',
    'medical', 'cart', 'gift', 'rose', 'leaf', 'flame', 'snow', 'rainy',
    'sunny', 'moon', 'cloud', 'thunderstorm', 'partly-sunny', 'umbrella',
  ];

  // Computed colors and labels
  const NOTE_COLORS = [...DEFAULT_NOTE_COLORS, ...customNoteColors];
  const LABEL_COLORS = [...DEFAULT_LABEL_COLORS, ...customLabelColors];

  useEffect(() => {
    if (isAuthenticated && user && token) {
      loadDiaries();
      loadCustomData();
    }
  }, [user, isAuthenticated, token, searchQuery, selectedLabel, selectedColor, dateFilter, customDateRange, filterPinned]);

  const loadCustomData = async () => {
    try {
      const [noteColors, labelColors, labels] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_NOTE_COLORS),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_LABEL_COLORS),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_LABELS),
      ]);
      
      if (noteColors) {
        setCustomNoteColors(JSON.parse(noteColors));
      }
      if (labelColors) {
        setCustomLabelColors(JSON.parse(labelColors));
      }
      if (labels) {
        setCustomLabels(JSON.parse(labels));
      }
    } catch (error) {
      console.error('Error loading custom data:', error);
    }
  };

  const saveCustomData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_NOTE_COLORS, JSON.stringify(customNoteColors)),
        AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABEL_COLORS, JSON.stringify(customLabelColors)),
        AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(customLabels)),
      ]);
    } catch (error) {
      console.error('Error saving custom data:', error);
    }
  };

  useEffect(() => {
    saveCustomData();
  }, [customNoteColors, customLabelColors, customLabels]);

  // Helper functions for RGB/Hex conversion
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const rgbToHex = (r, g, b) => {
    return "#" + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  // Update RGB when hex color changes
  useEffect(() => {
    if (newColorValue && newColorValue.match(/^#[0-9A-Fa-f]{6}$/)) {
      const rgb = hexToRgb(newColorValue);
      setRgbValues(rgb);
    }
  }, [newColorValue]);

  // Custom Slider Component
  const CustomSlider = ({ value, onValueChange, minimumValue = 0, maximumValue = 255, minimumTrackTintColor, maximumTrackTintColor, thumbTintColor, style }) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const touchStartX = useRef(0);
    const touchStartValue = useRef(value);

    const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

    const updateValueFromX = useCallback((x) => {
      if (sliderWidth === 0) return;
      const clampedX = Math.max(0, Math.min(sliderWidth, x));
      const newPercentage = (clampedX / sliderWidth) * 100;
      const newValue = minimumValue + (newPercentage / 100) * (maximumValue - minimumValue);
      onValueChange(Math.round(newValue));
    }, [sliderWidth, minimumValue, maximumValue, onValueChange]);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX } = evt.nativeEvent;
          updateValueFromX(locationX);
        },
        onPanResponderMove: (evt) => {
          const { locationX } = evt.nativeEvent;
          updateValueFromX(locationX);
        },
        onPanResponderRelease: () => {
          // Release handled
        },
      })
    ).current;

    return (
      <View
        style={[styles.customSliderContainer, style]}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          if (width > 0) {
            setSliderWidth(width);
          }
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.sliderTouchArea}>
          <View style={[styles.sliderTrack, { backgroundColor: maximumTrackTintColor || '#e5e7eb' }]}>
            <View
              style={[
                styles.sliderTrackFilled,
                {
                  width: `${percentage}%`,
                  backgroundColor: minimumTrackTintColor || '#6366f1',
                },
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                {
                  left: `${percentage}%`,
                  backgroundColor: thumbTintColor || '#6366f1',
                  transform: [{ translateX: -10 }],
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const getDateRange = () => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;

    switch (dateFilter) {
      case 'today':
        fromDate = new Date(now);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() - 1);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        fromDate = new Date(now);
        fromDate.setFullYear(fromDate.getFullYear() - 1);
        fromDate.setHours(0, 0, 0, 0);
        toDate = new Date(now);
        toDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange.from && customDateRange.to) {
          fromDate = new Date(customDateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          toDate = new Date(customDateRange.to);
          toDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        // 'all' - no date filter
        break;
    }

    return { fromDate, toDate };
  };

  const loadDiaries = async (loadAllForLabels = false) => {
    setIsLoading(true);
    try {
      const params = {};
      
      // If loading all for labels (e.g., in settings), don't apply filters
      if (!loadAllForLabels) {
        // Use filter search query if filter modal is being used, otherwise use main search
        const activeSearchQuery = filterSearchQuery.trim() || searchQuery.trim();
        if (activeSearchQuery) {
          params.search = activeSearchQuery;
        }
        
        if (selectedLabel) {
          params.label = selectedLabel;
        }
        if (selectedColor) {
          params.backgroundColor = selectedColor;
        }
        
        // Date filter
        const { fromDate, toDate } = getDateRange();
        if (fromDate && toDate) {
          params.startDate = fromDate.toISOString().split('T')[0];
          params.endDate = toDate.toISOString().split('T')[0];
        }
        
        // Pinned filter
        if (filterPinned) {
          params.isPinned = 'true';
        }
      }
      
      const response = await diaryAPI.getDiaryEntries(params);
      const diaryEntries = response.data?.data?.diaries || response.data?.diaries || [];
      
      if (loadAllForLabels) {
        // Store all diaries separately for label collection
        setAllDiariesForLabels(diaryEntries);
      } else {
        setDiaries(diaryEntries);
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Error loading diary entries:', error);
      }
      if (loadAllForLabels) {
        setAllDiariesForLabels([]);
      } else {
        setDiaries([]);
      }
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

  // Check if label is used in any diary entry
  const isLabelInUse = (labelName) => {
    return diaries.some(diary => 
      diary.labels?.some(label => label.name === labelName)
    );
  };

  // Check if color is used in any diary entry
  const isColorInUse = (colorValue, isLabelColor = false) => {
    if (isLabelColor) {
      return diaries.some(diary => 
        diary.labels?.some(label => label.color === colorValue)
      );
    } else {
      return diaries.some(diary => diary.backgroundColor === colorValue);
    }
  };

  // Label management functions
  const handleAddLabel = () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Label name is required');
      return;
    }
    
    // Check against all labels (custom labels + labels from notes)
    const allLabels = getAllLabels();
    const labelExists = allLabels.some(l => l.name.toLowerCase() === newLabelName.trim().toLowerCase());
    
    if (labelExists) {
      Alert.alert('Error', 'Label with this name already exists');
      return;
    }
    
    const newLabel = {
      id: Date.now().toString(),
      name: newLabelName.trim(),
      color: newLabelColor,
      icon: selectedIcon || 'flag',
    };
    const updatedLabels = [...customLabels, newLabel];
    setCustomLabels(updatedLabels);
    
    // Save to AsyncStorage
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(updatedLabels)).catch(err => {
      console.error('Error saving labels:', err);
    });
    
    setNewLabelName('');
    setNewLabelColor('#6366f1');
    setSelectedIcon('flag');
    setShowLabelModal(false);
  };

  const handleEditLabel = (label) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setNewLabelColor(label.color);
    setSelectedIcon(label.icon || 'flag');
    setShowEditLabelModal(true);
  };

  const handleUpdateLabel = () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Label name is required');
      return;
    }
    
    // Check against all labels (excluding the current one being edited)
    const allLabels = getAllLabels();
    const labelExists = allLabels.some(l => 
      l.id !== editingLabel.id && l.name.toLowerCase() === newLabelName.trim().toLowerCase()
    );
    
    if (labelExists) {
      Alert.alert('Error', 'Label with this name already exists');
      return;
    }
    
    const updatedLabels = customLabels.map(l => 
      l.id === editingLabel.id 
        ? { ...l, name: newLabelName.trim(), color: newLabelColor, icon: selectedIcon || l.icon || 'flag' }
        : l
    );
    setCustomLabels(updatedLabels);
    
    // Save to AsyncStorage
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(updatedLabels)).catch(err => {
      console.error('Error saving labels:', err);
    });
    
    setEditingLabel(null);
    setNewLabelName('');
    setNewLabelColor('#6366f1');
    setSelectedIcon('flag');
    setShowEditLabelModal(false);
  };

  const handleDeleteLabel = (label) => {
    if (isLabelInUse(label.name)) {
      Alert.alert(
        'Warning',
        'This label is used in one or more diary entries. Deleting it will remove the label from all linked records. Do you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // Remove label from all diary entries - use allDiariesForLabels if available, otherwise load all
              let allDiariesToCheck = allDiariesForLabels.length > 0 ? allDiariesForLabels : diaries;
              
              // If we don't have all diaries loaded, fetch them to ensure we update all entries
              if (allDiariesForLabels.length === 0) {
                try {
                  const response = await diaryAPI.getDiaryEntries({});
                  allDiariesToCheck = response.data?.data?.diaries || response.data?.diaries || [];
                } catch (error) {
                  console.error('Error loading all diaries for label deletion:', error);
                  allDiariesToCheck = diaries; // Fallback to filtered diaries
                }
              }
              
              // Remove label from all diary entries (case-insensitive)
              const labelNameLower = label.name.trim().toLowerCase();
              const diariesToUpdate = allDiariesToCheck.filter(diary => 
                diary.labels?.some(l => l.name && l.name.trim().toLowerCase() === labelNameLower)
              );
              
              for (const diary of diariesToUpdate) {
                const updatedLabels = diary.labels.filter(l => 
                  l.name && l.name.trim().toLowerCase() !== labelNameLower
                );
                try {
                  await diaryAPI.updateDiary(diary._id, { labels: updatedLabels });
                } catch (error) {
                  console.error('Error updating diary:', error);
                }
              }
              
              const updatedLabels = customLabels.filter(l => l.id !== label.id);
              setCustomLabels(updatedLabels);
              
              // Save to AsyncStorage
              AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(updatedLabels)).catch(err => {
                console.error('Error saving labels:', err);
              });
              
              // Also remove from current note's labels if editing (case-insensitive)
              if (editingNote) {
                // Reload the note to get updated labels
                try {
                  const response = await diaryAPI.getDiaryById(editingNote._id);
                  const updatedNote = response.data?.data?.diary || response.data?.diary;
                  if (updatedNote) {
                    setNoteLabels(updatedNote.labels || []);
                  } else {
                    // Fallback: just remove from current state (case-insensitive)
                    setNoteLabels(noteLabels.filter(l => 
                      l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
                    ));
                  }
                } catch (error) {
                  // Fallback: just remove from current state (case-insensitive)
                  setNoteLabels(noteLabels.filter(l => 
                    l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
                  ));
                }
              } else if (noteLabels.length > 0) {
                // If not editing but have labels in state, remove the deleted one (case-insensitive)
                setNoteLabels(noteLabels.filter(l => 
                  l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
                ));
              }
              
              loadDiaries();
            },
          },
        ]
      );
    } else {
      const updatedLabels = customLabels.filter(l => l.id !== label.id);
      setCustomLabels(updatedLabels);
      
      // Save to AsyncStorage
      AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(updatedLabels)).catch(err => {
        console.error('Error saving labels:', err);
      });
      
      // Also remove from current note's labels if editing (case-insensitive)
      if (editingNote) {
        // Reload the note to get updated labels - use async IIFE
        (async () => {
          try {
            const response = await diaryAPI.getDiaryById(editingNote._id);
            const updatedNote = response.data?.data?.diary || response.data?.diary;
            if (updatedNote) {
              setNoteLabels(updatedNote.labels || []);
            } else {
              // Fallback: just remove from current state (case-insensitive)
              setNoteLabels(noteLabels.filter(l => 
                l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
              ));
            }
          } catch (error) {
            // Fallback: just remove from current state (case-insensitive)
            setNoteLabels(noteLabels.filter(l => 
              l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
            ));
          }
        })();
      } else if (noteLabels.length > 0) {
        // If not editing but have labels in state, remove the deleted one (case-insensitive)
        setNoteLabels(noteLabels.filter(l => 
          l.name && l.name.trim().toLowerCase() !== label.name.trim().toLowerCase()
        ));
      }
    }
  };

  // Color management functions
  const [addingLabelColor, setAddingLabelColor] = useState(false);
  
  const handleAddColor = () => {
    if (addingLabelColor) {
      const colorExists = LABEL_COLORS.some(c => {
        const cValue = typeof c === 'string' ? c : c.value;
        return cValue.toLowerCase() === newColorValue.toLowerCase();
      });
      if (colorExists) {
        Alert.alert('Error', 'This color already exists');
        return;
      }
      setCustomLabelColors([...customLabelColors, newColorValue]);
    } else {
      if (!newColorName.trim()) {
        Alert.alert('Error', 'Color name is required');
        return;
      }
      const colorExists = NOTE_COLORS.some(c => {
        const cValue = typeof c === 'string' ? c : c.value;
        return cValue.toLowerCase() === newColorValue.toLowerCase();
      });
      if (colorExists) {
        Alert.alert('Error', 'This color already exists');
        return;
      }
      const newColor = {
        id: Date.now().toString(),
        name: newColorName.trim(),
        value: newColorValue,
      };
      setCustomNoteColors([...customNoteColors, newColor]);
    }
    
    setNewColorName('');
    setNewColorValue('#ffffff');
    setAddingLabelColor(false);
    setShowAddColorModal(false);
  };

  const handleEditColor = (color, isLabelColor = false) => {
    if (isLabelColor) {
      const colorValue = typeof color === 'string' ? color : color.value;
      setEditingColor({ value: colorValue, isLabelColor: true });
      setNewColorName('');
      setNewColorValue(colorValue);
      const rgb = hexToRgb(colorValue);
      setRgbValues(rgb);
    } else {
      const colorValue = color.value || '#ffffff';
      setEditingColor({ ...color, isLabelColor: false });
      setNewColorName(color.name || '');
      setNewColorValue(colorValue);
      const rgb = hexToRgb(colorValue);
      setRgbValues(rgb);
    }
    setShowEditColorModal(true);
  };

  const handleUpdateColor = () => {
    if (!newColorName.trim() && !editingColor.isLabelColor) {
      Alert.alert('Error', 'Color name is required');
      return;
    }
    
    const oldColor = editingColor.isLabelColor 
      ? editingColor.value 
      : editingColor.value;
    
    // Check if new color already exists
    const existingColor = editingColor.isLabelColor
      ? LABEL_COLORS.find(c => {
          const cValue = typeof c === 'string' ? c : c.value;
          return cValue.toLowerCase() === newColorValue.toLowerCase() && cValue !== oldColor;
        })
      : NOTE_COLORS.find(c => {
          const cValue = typeof c === 'object' ? c.value : c;
          return cValue.toLowerCase() === newColorValue.toLowerCase() && 
                 (typeof c === 'object' ? c.id !== editingColor.id : true);
        });
    
    if (existingColor) {
      Alert.alert('Error', 'This color already exists');
      return;
    }
    
    if (editingColor.isLabelColor) {
      if (isColorInUse(oldColor, true)) {
        Alert.alert(
          'Warning',
          'This color is used in one or more labels. Changing it will update all linked records. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                // Update color in all diary entries
                const diariesToUpdate = diaries.filter(diary => 
                  diary.labels?.some(l => l.color === oldColor)
                );
                
                for (const diary of diariesToUpdate) {
                  const updatedLabels = diary.labels.map(l => 
                    l.color === oldColor ? { ...l, color: newColorValue } : l
                  );
                  try {
                    await diaryAPI.updateDiary(diary._id, { labels: updatedLabels });
                  } catch (error) {
                    console.error('Error updating diary:', error);
                  }
                }
                
                setCustomLabelColors(customLabelColors.map(c => 
                  c === oldColor ? newColorValue : c
                ));
                setEditingColor(null);
                setNewColorName('');
                setNewColorValue('#ffffff');
                setShowEditColorModal(false);
                loadDiaries();
              },
            },
          ]
        );
      } else {
        setCustomLabelColors(customLabelColors.map(c => 
          c === oldColor ? newColorValue : c
        ));
        setEditingColor(null);
        setNewColorName('');
        setNewColorValue('#ffffff');
        setShowEditColorModal(false);
      }
    } else {
      if (isColorInUse(oldColor, false)) {
        Alert.alert(
          'Warning',
          'This color is used in one or more diary entries. Changing it will update all linked records. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                // Update color in all diary entries
                const diariesToUpdate = diaries.filter(diary => diary.backgroundColor === oldColor);
                
                for (const diary of diariesToUpdate) {
                  try {
                    await diaryAPI.updateDiary(diary._id, { backgroundColor: newColorValue });
                  } catch (error) {
                    console.error('Error updating diary:', error);
                  }
                }
                
                setCustomNoteColors(customNoteColors.map(c => 
                  c.id === editingColor.id ? { ...c, name: newColorName.trim(), value: newColorValue } : c
                ));
                setEditingColor(null);
                setNewColorName('');
                setNewColorValue('#ffffff');
                setShowEditColorModal(false);
                loadDiaries();
              },
            },
          ]
        );
      } else {
        setCustomNoteColors(customNoteColors.map(c => 
          c.id === editingColor.id ? { ...c, name: newColorName.trim(), value: newColorValue } : c
        ));
        setEditingColor(null);
        setNewColorName('');
        setNewColorValue('#ffffff');
        setShowEditColorModal(false);
      }
    }
  };

  const handleDeleteColor = (color, isLabelColor = false) => {
    const colorValue = typeof color === 'string' ? color : (color.value || color);
    if (isColorInUse(colorValue, isLabelColor)) {
      Alert.alert(
        'Warning',
        `This color is used in one or more ${isLabelColor ? 'labels' : 'diary entries'}. Deleting it will remove the color from all linked records. Do you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (isLabelColor) {
                // Remove color from all labels
                const diariesToUpdate = diaries.filter(diary => 
                  diary.labels?.some(l => l.color === colorValue)
                );
                
                for (const diary of diariesToUpdate) {
                  const updatedLabels = diary.labels.filter(l => l.color !== colorValue);
                  try {
                    await diaryAPI.updateDiary(diary._id, { labels: updatedLabels });
                  } catch (error) {
                    console.error('Error updating diary:', error);
                  }
                }
                
                setCustomLabelColors(customLabelColors.filter(c => c !== colorValue));
              } else {
                // Update background color to default for all entries using this color
                const diariesToUpdate = diaries.filter(diary => diary.backgroundColor === colorValue);
                
                for (const diary of diariesToUpdate) {
                  try {
                    await diaryAPI.updateDiary(diary._id, { backgroundColor: '#ffffff' });
                  } catch (error) {
                    console.error('Error updating diary:', error);
                  }
                }
                
                const colorId = typeof color === 'object' ? color.id : null;
                if (colorId) {
                  setCustomNoteColors(customNoteColors.filter(c => c.id !== colorId));
                }
              }
              loadDiaries();
            },
          },
        ]
      );
    } else {
      if (isLabelColor) {
        setCustomLabelColors(customLabelColors.filter(c => c !== colorValue));
      } else {
        const colorId = typeof color === 'object' ? color.id : null;
        if (colorId) {
          setCustomNoteColors(customNoteColors.filter(c => c.id !== colorId));
        }
      }
    }
  };

  const addLabel = () => {
    if (!newLabelName.trim()) {
      Alert.alert('Error', 'Label name is required');
      return;
    }
    
    // Check if label already exists in note labels (case-insensitive, trimmed)
    const trimmedNewName = newLabelName.trim().toLowerCase();
    const existingLabel = noteLabels.find(l => l.name && l.name.trim().toLowerCase() === trimmedNewName);
    
    if (existingLabel) {
      Alert.alert('Error', 'This label is already added to this note');
      return;
    }
    
    const newLabel = { 
      name: newLabelName.trim(), 
      color: newLabelColor,
      icon: selectedIcon || 'flag',
    };
    
    // Add to current note
    setNoteLabels([...noteLabels, newLabel]);
    
    // Also save as custom label if it doesn't exist
    const labelExists = customLabels.some(l => l.name.toLowerCase() === newLabelName.trim().toLowerCase());
    if (!labelExists) {
      const customLabel = {
        id: Date.now().toString(),
        name: newLabelName.trim(),
        color: newLabelColor,
        icon: selectedIcon || 'flag',
      };
      const updatedLabels = [...customLabels, customLabel];
      setCustomLabels(updatedLabels);
      
      // Save to AsyncStorage
      AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_LABELS, JSON.stringify(updatedLabels)).catch(err => {
        console.error('Error saving labels:', err);
      });
    }
    
    setNewLabelName('');
    setNewLabelColor('#6366f1');
    setSelectedIcon('flag');
    setShowLabelModal(false);
  };

  const removeLabel = (index) => {
    setNoteLabels(noteLabels.filter((_, i) => i !== index));
  };

  // Get all unique labels from all notes for filtering
  const getAllLabels = () => {
    const labelMap = new Map();
    
    // Use allDiariesForLabels if available (for settings), otherwise use filtered diaries
    const diariesToCheck = allDiariesForLabels.length > 0 ? allDiariesForLabels : diaries;
    
    // First, add all labels from diary entries (preserve all properties)
    diariesToCheck.forEach(note => {
      if (note.labels && Array.isArray(note.labels)) {
        note.labels.forEach(label => {
          if (label && label.name) {
            const key = label.name.toLowerCase().trim();
            if (key) {
              if (!labelMap.has(key)) {
                labelMap.set(key, {
                  id: `used-${label.name}-${Date.now()}`,
                  name: label.name.trim(),
                  color: label.color || '#6366f1',
                  icon: label.icon || 'flag',
                });
              } else {
                // Update existing if it has more properties
                const existing = labelMap.get(key);
                if (label.icon && (!existing.icon || existing.icon === 'flag')) {
                  existing.icon = label.icon;
                }
                if (label.color && (existing.color === '#6366f1' || !existing.color)) {
                  existing.color = label.color;
                }
              }
            }
          }
        });
      }
    });
    
    // Then, add/update with custom labels (custom labels take precedence)
    customLabels.forEach(label => {
      if (label && label.name) {
        const key = label.name.toLowerCase().trim();
        if (key) {
          labelMap.set(key, {
            id: label.id || `custom-${label.name}-${Date.now()}`,
            name: label.name.trim(),
            color: label.color || '#6366f1',
            icon: label.icon || 'flag',
          });
        }
      }
    });
    
    return Array.from(labelMap.values());
  };

  const renderNoteCard = ({ item }) => {
    const cardBgColor = item.backgroundColor || '#ffffff';
    const isColoredCard = cardBgColor !== '#ffffff';
    const textColor = isColoredCard ? theme.colors.primary : theme.colors.text;
    const secondaryTextColor = isColoredCard ? theme.colors.primary : theme.colors.textSecondary;
    
    return (
      <TouchableOpacity
        style={[
          styles.noteCard,
          {
            backgroundColor: cardBgColor,
          },
          
        ]}
        onPress={() => openEditModal(item)}
        onLongPress={() => handleDeleteNote(item)}
      >
        <View style={styles.cardHeader}>
          {item.isPinned && (
            <Ionicons 
              name="pin" 
              size={18} 
              color={isColoredCard ? theme.colors.primary : theme.colors.textSecondary} 
            />
          )}
        </View>
        <Text style={[styles.noteTitle, { color: textColor }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.noteContent, { color: secondaryTextColor }]} numberOfLines={3}>
          {item.content}
        </Text>
        {item.labels && item.labels.length > 0 && (
          <View style={styles.labelsContainer}>
            {item.labels.map((label, index) => {
              const labelIcon = label.icon || 'flag';
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.labelBadge,
                    { 
                      backgroundColor: isColoredCard ? 'rgba(255,255,255,0.3)' : '#ffffff',
                      borderColor: label.color,
                    },
                  ]}
                  onPress={() => setSelectedLabel(selectedLabel === label.name ? '' : label.name)}
                >
                  <Ionicons 
                    name={labelIcon} 
                    size={14} 
                    color={label.color} 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.labelText, { color: label.color }]}>
                    {label.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.noteFooter}>
          <Text style={[styles.noteDate, { color: secondaryTextColor }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          <Ionicons name="location" size={14} color="#ef4444" />
        </View>
      </TouchableOpacity>
    );
  };

  const allLabels = getAllLabels();
  const isAllSelected = !selectedLabel && !selectedColor;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={diaries}
        renderItem={renderNoteCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Purple Header with Rounded Bottom */}
            <View style={styles.headerContainer}>
              <View style={styles.headerContent}>
                <View style={styles.headerTopRow}>
                  <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Diary</Text>
                    <Text style={styles.headerSubtitle}>Capture your moments</Text>
                  </View>
                  <View style={styles.headerRight}>
                    <TouchableOpacity 
                      style={styles.headerIconButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => setShowFilterModal(true)}
                    >
                      <Ionicons name="filter-outline" size={24} color="#ffffff" />
                      {(selectedLabel || selectedColor || dateFilter !== 'all' || filterPinned || searchQuery.trim() || filterSearchQuery.trim()) && (
                        <View style={styles.filterBadge}>
                          <View style={styles.filterBadgeDot} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.headerIconButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => {
                        // Load all diaries without filters to get all labels
                        loadDiaries(true);
                        setShowSettingsModal(true);
                      }}
                    >
                      <Ionicons name="settings-outline" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Search Bar - Inside Header */}
                <View style={styles.searchContainer}>
                  <View style={styles.searchIconContainer}>
                    <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search notes, tags, or dates..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <TouchableOpacity style={styles.micIconContainer}>
                    <Ionicons name="mic" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Filter/Tag Options */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  styles.allChip,
                  {
                    backgroundColor: isAllSelected ? theme.colors.primary : '#ffffff',
                  },
                ]}
                onPress={() => {
                  setSelectedLabel('');
                  setSelectedColor('');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isAllSelected ? '#ffffff' : theme.colors.text },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {allLabels.map((label, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: '#ffffff',
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedLabel(selectedLabel === label.name ? '' : label.name);
                    setSelectedColor('');
                  }}
                >
                  <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: label.color },
                    ]}
                  >
                    {label.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {NOTE_COLORS.slice(0, 4).map((color, index) => (
                <TouchableOpacity
                  key={`color-${index}`}
                  style={[
                    styles.colorFilterChip,
                    {
                      backgroundColor: color.value,
                      borderWidth: selectedColor === color.value ? 2 : 0,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setSelectedColor(selectedColor === color.value ? '' : color.value);
                    setSelectedLabel('');
                  }}
                />
              ))}
            </ScrollView>

            {/* Recent Entries Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent Entries
              </Text>
              <TouchableOpacity>
                <Text style={[styles.viewTimelineLink, { color: theme.colors.primary }]}>
                  View Timeline &gt;
                </Text>
              </TouchableOpacity>
            </View>
          </>
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

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={openCreateModal}
        icon="add"
      />

      {/* Create/Edit Note Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
        statusBarTranslucent={true}
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
                  <Ionicons 
                    name={noteIsPinned ? "push" : "push-outline"} 
                    size={22} 
                    color={noteIsPinned ? "#ef4444" : theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowColorPicker(!showColorPicker)}
                  style={styles.headerButton}
                >
                  <Ionicons 
                    name="color-palette-outline" 
                    size={22} 
                    color={showColorPicker ? theme.colors.primary : theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    // If editing a note, refresh its labels to ensure they're up to date
                    if (editingNote) {
                      try {
                        const response = await diaryAPI.getDiaryById(editingNote._id);
                        const updatedNote = response.data?.data?.diary || response.data?.diary;
                        if (updatedNote) {
                          setNoteLabels(updatedNote.labels || []);
                        }
                      } catch (error) {
                        console.error('Error refreshing note labels:', error);
                      }
                    }
                    setShowLabelModal(true);
                  }}
                  style={styles.headerButton}
                >
                  <Ionicons 
                    name="pricetag-outline" 
                    size={22} 
                    color={theme.colors.textSecondary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(false)}
                  style={styles.headerButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
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
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.labelModalTitle, { color: theme.colors.text }]}>
              Add Label
            </Text>
            
            {/* Show existing labels for quick selection */}
            {getAllLabels().length > 0 && (
              <View style={styles.existingLabelsSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Existing Labels (tap to add)
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.existingLabelsList}
                  contentContainerStyle={styles.existingLabelsListContent}
                >
                  {getAllLabels().map((label, index) => {
                    // Check if label is already in current note (case-insensitive, trimmed)
                    const labelNameLower = label.name ? label.name.trim().toLowerCase() : '';
                    const isAlreadyAdded = noteLabels.some(l => 
                      l.name && l.name.trim().toLowerCase() === labelNameLower
                    );
                    const colorValue = label.color || '#6366f1';
                    const iconName = label.icon || 'flag';
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.existingLabelChip,
                          {
                            backgroundColor: isAlreadyAdded ? theme.colors.primary : '#f3f4f6',
                            borderColor: colorValue,
                          },
                        ]}
                        onPress={() => {
                          if (!isAlreadyAdded && labelNameLower) {
                            setNoteLabels([...noteLabels, {
                              name: label.name.trim(),
                              color: colorValue,
                              icon: iconName,
                            }]);
                            setShowLabelModal(false);
                          } else if (isAlreadyAdded) {
                            Alert.alert('Info', 'This label is already added to this note');
                          }
                        }}
                        disabled={isAlreadyAdded}
                      >
                        <Ionicons 
                          name={iconName} 
                          size={14} 
                          color={isAlreadyAdded ? '#ffffff' : colorValue} 
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.existingLabelText,
                            {
                              color: isAlreadyAdded ? '#ffffff' : colorValue,
                            },
                          ]}
                        >
                          {label.name}
                        </Text>
                        {isAlreadyAdded && (
                          <Ionicons name="checkmark" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            
            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Create New Label</Text>
            <Text style={[styles.inputLabel, { color: theme.colors.text, fontSize: 12, marginTop: 4, marginBottom: 8 }]}>Label Name</Text>
            <TextInput
              style={[
                styles.labelInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Enter label name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newLabelName}
              onChangeText={setNewLabelName}
            />
            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Icon</Text>
            <TouchableOpacity
              style={styles.iconSelectorButton}
              onPress={() => setShowIconPicker(true)}
            >
              <Ionicons name={selectedIcon || 'flag'} size={24} color={newLabelColor} />
              <Text style={[styles.iconSelectorText, { color: theme.colors.text }]}>
                {selectedIcon || 'flag'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Label Color</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.colorPickerRowContainer}
              contentContainerStyle={styles.colorPickerRow}
            >
              {LABEL_COLORS.map((color, index) => {
                const colorValue = typeof color === 'string' ? color : color.value;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: colorValue,
                        borderWidth: newLabelColor === colorValue ? 3 : 1,
                        borderColor:
                          newLabelColor === colorValue
                            ? theme.colors.primary
                            : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewLabelColor(colorValue)}
                  />
                );
              })}
            </ScrollView>
            <View style={styles.labelModalFooter}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowLabelModal(false);
                  setNewLabelName('');
                  setNewLabelColor('#6366f1');
                }}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Add"
                onPress={addLabel}
                style={styles.addButton}
                disabled={!newLabelName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: theme.colors.text }]}>
                Filter Notes
              </Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.filterModalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
              {/* Search */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                  Search
                </Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={[styles.filterSearchInput, { color: theme.colors.text }]}
                    placeholder="Search notes, tags, or dates..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={filterSearchQuery}
                    onChangeText={setFilterSearchQuery}
                  />
                  {filterSearchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setFilterSearchQuery('')}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Date Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                  Date Filter
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFilterScroll}>
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Today', value: 'today' },
                    { label: 'Yesterday', value: 'yesterday' },
                    { label: 'This Week', value: 'week' },
                    { label: 'This Month', value: 'month' },
                    { label: 'This Year', value: 'year' },
                    { label: 'Custom', value: 'custom' },
                  ].map((filter) => (
                    <TouchableOpacity
                      key={filter.value}
                      style={[
                        styles.dateFilterButton,
                        {
                          backgroundColor: dateFilter === filter.value ? theme.colors.primary : '#f3f4f6',
                        },
                      ]}
                      onPress={() => {
                        if (filter.value === 'custom') {
                          setShowCustomDateModal(true);
                        } else {
                          setDateFilter(filter.value);
                          setCustomDateRange({ from: null, to: null });
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.dateFilterButtonText,
                          {
                            color: dateFilter === filter.value ? '#ffffff' : theme.colors.text,
                          },
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {dateFilter === 'custom' && customDateRange.from && customDateRange.to && (
                  <Text style={[styles.customDateText, { color: theme.colors.textSecondary }]}>
                    {new Date(customDateRange.from).toLocaleDateString()} - {new Date(customDateRange.to).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Label Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                  Labels
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.labelFilterScroll}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: !selectedLabel ? theme.colors.primary : '#f3f4f6',
                      },
                    ]}
                    onPress={() => setSelectedLabel('')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: !selectedLabel ? '#ffffff' : theme.colors.text },
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {allLabels.map((label, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: selectedLabel === label.name ? theme.colors.primary : '#f3f4f6',
                        },
                      ]}
                      onPress={() => setSelectedLabel(selectedLabel === label.name ? '' : label.name)}
                    >
                      <View style={[styles.labelDot, { backgroundColor: label.color }]} />
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: selectedLabel === label.name ? '#ffffff' : label.color,
                          },
                        ]}
                      >
                        {label.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Color Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                  Background Color
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorFilterScroll}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: !selectedColor ? theme.colors.primary : '#f3f4f6',
                      },
                    ]}
                    onPress={() => setSelectedColor('')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: !selectedColor ? '#ffffff' : theme.colors.text },
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  {NOTE_COLORS.map((color, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.colorFilterChip,
                        {
                          backgroundColor: color.value,
                          borderWidth: selectedColor === color.value ? 3 : 1,
                          borderColor: selectedColor === color.value ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                      onPress={() => setSelectedColor(selectedColor === color.value ? '' : color.value)}
                    />
                  ))}
                </ScrollView>
              </View>

              {/* Pinned Filter */}
              <View style={styles.filterSection}>
                <View style={styles.filterToggleRow}>
                  <View style={styles.filterToggleLabel}>
                    <Ionicons name="push" size={20} color={theme.colors.textSecondary} />
                    <Text style={[styles.filterToggleText, { color: theme.colors.text }]}>
                      Show Pinned Only
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      {
                        backgroundColor: filterPinned ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setFilterPinned(!filterPinned)}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        filterPinned && styles.toggleThumbActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Apply Button */}
              <View style={styles.filterModalFooter}>
                <Button
                  title="Clear All"
                  onPress={() => {
                    setFilterSearchQuery('');
                    setSearchQuery('');
                    setSelectedLabel('');
                    setSelectedColor('');
                    setDateFilter('all');
                    setCustomDateRange({ from: null, to: null });
                    setFilterPinned(false);
                  }}
                  variant="outline"
                  style={styles.clearFilterButton}
                />
                <Button
                  title="Apply Filters"
                  onPress={() => {
                    setSearchQuery(filterSearchQuery);
                    setShowFilterModal(false);
                  }}
                  style={styles.applyFilterButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomDateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomDateModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: theme.colors.text }]}>
                Custom Date Range
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomDateModal(false)}
                style={styles.filterModalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterModalBody}>
              <DatePicker
                label="From Date"
                value={customDateRange.from}
                onChange={(date) => setCustomDateRange({ ...customDateRange, from: date })}
              />
              <DatePicker
                label="To Date"
                value={customDateRange.to}
                onChange={(date) => setCustomDateRange({ ...customDateRange, to: date })}
              />
              <Button
                title="Apply"
                onPress={() => {
                  if (customDateRange.from && customDateRange.to) {
                    setDateFilter('custom');
                    setShowCustomDateModal(false);
                  } else {
                    Alert.alert('Error', 'Please select both from and to dates');
                  }
                }}
                style={styles.applyFilterButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.settingsCloseButton}
              >
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsScrollView} showsVerticalScrollIndicator={false}>
              {/* Labels Section */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsCardHeader}>
                  <Text style={styles.settingsCardTitle}>Labels</Text>
                  <View style={styles.settingsCardActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditMode(!isEditMode);
                      }}
                      style={[styles.editButton, isEditMode && styles.editButtonActive]}
                    >
                      <Text style={[styles.editButtonText, isEditMode && styles.editButtonTextActive]}>
                        {isEditMode ? 'Done' : 'Edit'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setNewLabelName('');
                        setNewLabelColor('#6366f1');
                        setSelectedIcon('flag');
                        setShowLabelModal(true);
                      }}
                      style={styles.addButtonNew}
                    >
                      <Ionicons name="add" size={16} color="#6366f1" />
                      <Text style={styles.addButtonNewText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {(() => {
                  const allUsedLabels = getAllLabels();
                  const labelMap = new Map();
                  
                  customLabels.forEach(label => {
                    labelMap.set(label.name.toLowerCase(), {
                      ...label,
                      isCustom: true,
                      usageCount: 0,
                    });
                  });
                  
                  allUsedLabels.forEach(label => {
                    const key = label.name.toLowerCase();
                    if (labelMap.has(key)) {
                      const existing = labelMap.get(key);
                      existing.usageCount = (existing.usageCount || 0) + 1;
                      // Update icon if not set but available from used label
                      if (!existing.icon && label.icon) {
                        existing.icon = label.icon;
                      }
                    } else {
                      labelMap.set(key, {
                        id: `used-${label.name}-${Date.now()}`,
                        name: label.name,
                        color: label.color || '#6366f1',
                        icon: label.icon || 'flag',
                        isCustom: false,
                        usageCount: 1,
                      });
                    }
                  });
                  
                  labelMap.forEach((label, key) => {
                    const count = diaries.reduce((acc, diary) => {
                      const hasLabel = diary.labels?.some(l => l.name.toLowerCase() === key);
                      return hasLabel ? acc + 1 : acc;
                    }, 0);
                    label.usageCount = count;
                  });
                  
                  const allLabels = Array.from(labelMap.values());
                  
                  if (allLabels.length === 0) {
                    return (
                      <View style={styles.settingsCardContent}>
                        <Text style={styles.settingsHintText}>
                          Manage your custom labels here.
                        </Text>
                      </View>
                    );
                  }
                  
                  return (
                    <View style={styles.settingsCardContent}>
                      {allLabels.map((label) => {
                        // Check if label is custom by name (more reliable than ID)
                        const existingCustomLabel = customLabels.find(cl => 
                          cl.name.toLowerCase() === label.name.toLowerCase()
                        );
                        const isCustom = !!existingCustomLabel;
                        // Use custom label if exists, otherwise use the label from diary entries
                        const labelToUse = existingCustomLabel || {
                          ...label,
                          icon: label.icon || 'flag',
                          color: label.color || '#6366f1',
                        };
                        const iconName = labelToUse.icon || 'flag';
                        
                        return (
                          <TouchableOpacity
                            key={label.id || `label-${label.name}`}
                            style={styles.labelCardItem}
                            onPress={() => {
                              // If not custom, convert to custom first, then edit
                              if (!isCustom) {
                                // Convert to custom label
                                const customLabel = {
                                  id: Date.now().toString(),
                                  name: label.name,
                                  color: label.color || labelToUse.color || '#6366f1',
                                  icon: label.icon || labelToUse.icon || 'flag',
                                };
                                setCustomLabels([...customLabels, customLabel]);
                                // Then open edit modal
                                setTimeout(() => {
                                  handleEditLabel(customLabel);
                                }, 100);
                              } else {
                                handleEditLabel(labelToUse);
                              }
                            }}
                          >
                            <Ionicons 
                              name={iconName} 
                              size={20} 
                              color={label.color || '#6366f1'} 
                              style={styles.labelIcon}
                            />
                            <Text style={styles.labelCardText}>{label.name}</Text>
                            {isEditMode && (
                              <View style={styles.labelActions}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    // If not custom, convert to custom first, then edit
                                    if (!isCustom) {
                                      const customLabel = {
                                        id: Date.now().toString(),
                                        name: label.name,
                                        color: label.color || labelToUse.color || '#6366f1',
                                        icon: label.icon || labelToUse.icon || 'flag',
                                      };
                                      setCustomLabels([...customLabels, customLabel]);
                                      setTimeout(() => {
                                        handleEditLabel(customLabel);
                                      }, 100);
                                    } else {
                                      handleEditLabel(labelToUse);
                                    }
                                  }}
                                  style={styles.labelEditButton}
                                >
                                  <Ionicons name="pencil" size={16} color="#6366f1" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    // If not custom, convert to custom first, then delete
                                    if (!isCustom) {
                                      const customLabel = {
                                        id: Date.now().toString(),
                                        name: label.name,
                                        color: label.color || '#6366f1',
                                        icon: label.icon || labelToUse.icon || 'flag',
                                      };
                                      setCustomLabels([...customLabels, customLabel]);
                                      setTimeout(() => {
                                        handleDeleteLabel(customLabel);
                                      }, 100);
                                    } else {
                                      handleDeleteLabel(labelToUse);
                                    }
                                  }}
                                  style={styles.labelDeleteButton}
                                >
                                  <Ionicons name="trash" size={16} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>

              {/* Label Colors Section */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsCardHeader}>
                  <Text style={styles.settingsCardTitle}>Label Colors</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewColorName('');
                      setNewColorValue('#6366f1');
                      setRgbValues(hexToRgb('#6366f1'));
                      setAddingLabelColor(true);
                      setShowAddColorModal(true);
                    }}
                    style={styles.manageButton}
                  >
                    <Ionicons name="add" size={16} color="#6366f1" />
                    <Text style={styles.manageButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.settingsCardContent}>
                  <View style={styles.colorPalette}>
                    <TouchableOpacity
                      style={styles.addColorButton}
                      onPress={() => {
                        setNewColorName('');
                        setNewColorValue('#6366f1');
                        setRgbValues(hexToRgb('#6366f1'));
                        setAddingLabelColor(true);
                        setShowAddColorModal(true);
                      }}
                    >
                      <Ionicons name="add" size={24} color="#9ca3af" />
                    </TouchableOpacity>
                    {LABEL_COLORS.map((color, index) => {
                      const colorValue = typeof color === 'string' ? color : color.value;
                      const isCustom = customLabelColors.includes(colorValue);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.colorPaletteItem,
                            { backgroundColor: colorValue },
                            isCustom && styles.customColorPaletteItem,
                          ]}
                          onLongPress={() => {
                            if (isCustom) {
                              Alert.alert(
                                'Color Options',
                                'Choose an action',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Edit',
                                    onPress: () => handleEditColor({ value: colorValue }, true),
                                  },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: () => handleDeleteColor(colorValue, true),
                                  },
                                ]
                              );
                            }
                          }}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Note Background Colors Section */}
              <View style={styles.settingsCard}>
                <View style={styles.settingsCardHeader}>
                  <Text style={styles.settingsCardTitle}>Note Backgrounds</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setNewColorName('');
                      setNewColorValue('#ffffff');
                      setAddingLabelColor(false);
                      setShowAddColorModal(true);
                    }}
                    style={styles.addButtonNew}
                  >
                    <Ionicons name="add" size={16} color="#6366f1" />
                    <Text style={styles.addButtonNewText}>Add New</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.settingsCardContent}>
                  <View style={styles.noteColorGrid}>
                    {NOTE_COLORS.map((color, index) => {
                      const colorObj = typeof color === 'string' 
                        ? { name: 'Color', value: color, id: `default-${index}` }
                        : color;
                      // Check if it's a custom color - custom colors have numeric/timestamp IDs, not "default-X"
                      // Also check by value as fallback
                      const isCustom = customNoteColors.some(c => 
                        (c.id && colorObj.id && c.id === colorObj.id) || 
                        (c.value && colorObj.value && c.value.toLowerCase() === colorObj.value.toLowerCase())
                      );
                      return (
                        <View key={colorObj.id || index} style={styles.noteColorItem}>
                          <View style={styles.noteColorPreviewContainer}>
                            <View
                              style={[
                                styles.noteColorPreview,
                                { backgroundColor: colorObj.value },
                              ]}
                            />
                            {isCustom && (
                              <View style={styles.noteColorActions}>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleEditColor(colorObj, false);
                                  }}
                                  style={styles.noteColorActionButton}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="pencil" size={16} color="#000000" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteColor(colorObj, false);
                                  }}
                                  style={styles.noteColorActionButton}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="trash" size={16} color="#ef4444" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                          <Text style={styles.noteColorName}>{colorObj.name}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.settingsFooter}>
              <Button
                title="Save Changes"
                onPress={() => {
                  saveCustomData();
                  setShowSettingsModal(false);
                  Alert.alert('Success', 'Settings saved successfully');
                }}
                style={styles.saveChangesButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Color Modal */}
      <Modal
        visible={showAddColorModal || showEditColorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddColorModal(false);
          setShowEditColorModal(false);
          setEditingColor(null);
          setAddingLabelColor(false);
          setNewColorName('');
          setNewColorValue('#ffffff');
          setRgbValues({ r: 255, g: 255, b: 255 });
        }}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.labelModalTitle, { color: theme.colors.text }]}>
              {editingColor 
                ? `Edit ${editingColor.isLabelColor ? 'Label' : 'Note'} Color` 
                : `Add ${addingLabelColor ? 'Label' : 'Note'} Color`}
            </Text>
            
            {!addingLabelColor && !(editingColor && editingColor.isLabelColor) && (
              <>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Color Name</Text>
                <TextInput
                  style={[
                    styles.labelInput,
                    {
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="Enter color name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newColorName}
                  onChangeText={setNewColorName}
                />
              </>
            )}

            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: addingLabelColor || (editingColor && editingColor.isLabelColor) ? 0 : 16 }]}>Color Value</Text>
            
            {/* RGB Color Picker */}
            <View style={styles.rgbPickerContainer}>
              <Text style={[styles.colorPickerSectionTitle, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Select Color (RGB)
              </Text>
              
              {/* Red Slider */}
              <View style={styles.rgbSliderRow}>
                <Text style={[styles.rgbLabel, { color: theme.colors.text }]}>R</Text>
                <CustomSlider
                  style={styles.rgbSlider}
                  minimumValue={0}
                  maximumValue={255}
                  value={rgbValues.r}
                  onValueChange={(value) => {
                    const newRgb = { ...rgbValues, r: Math.round(value) };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  minimumTrackTintColor="#ef4444"
                  maximumTrackTintColor="#fee2e2"
                  thumbTintColor="#ef4444"
                />
                <TextInput
                  style={[styles.rgbInput, {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  value={String(Math.round(rgbValues.r))}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    const clampedValue = Math.max(0, Math.min(255, value));
                    const newRgb = { ...rgbValues, r: clampedValue };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              {/* Green Slider */}
              <View style={styles.rgbSliderRow}>
                <Text style={[styles.rgbLabel, { color: theme.colors.text }]}>G</Text>
                <CustomSlider
                  style={styles.rgbSlider}
                  minimumValue={0}
                  maximumValue={255}
                  value={rgbValues.g}
                  onValueChange={(value) => {
                    const newRgb = { ...rgbValues, g: Math.round(value) };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  minimumTrackTintColor="#10b981"
                  maximumTrackTintColor="#d1fae5"
                  thumbTintColor="#10b981"
                />
                <TextInput
                  style={[styles.rgbInput, {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  value={String(Math.round(rgbValues.g))}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    const clampedValue = Math.max(0, Math.min(255, value));
                    const newRgb = { ...rgbValues, g: clampedValue };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              {/* Blue Slider */}
              <View style={styles.rgbSliderRow}>
                <Text style={[styles.rgbLabel, { color: theme.colors.text }]}>B</Text>
                <CustomSlider
                  style={styles.rgbSlider}
                  minimumValue={0}
                  maximumValue={255}
                  value={rgbValues.b}
                  onValueChange={(value) => {
                    const newRgb = { ...rgbValues, b: Math.round(value) };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor="#dbeafe"
                  thumbTintColor="#3b82f6"
                />
                <TextInput
                  style={[styles.rgbInput, {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  }]}
                  value={String(Math.round(rgbValues.b))}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    const clampedValue = Math.max(0, Math.min(255, value));
                    const newRgb = { ...rgbValues, b: clampedValue };
                    setRgbValues(newRgb);
                    setNewColorValue(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                  }}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>
            
            {/* Hex Input */}
            <View style={[styles.colorPickerRow, { marginTop: 16 }]}>
              <View style={[styles.colorPreview, { backgroundColor: newColorValue }]} />
              <TextInput
                style={[
                  styles.labelInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                    flex: 1,
                    marginLeft: 12,
                  },
                ]}
                placeholder="#ffffff"
                placeholderTextColor={theme.colors.textSecondary}
                value={newColorValue}
                onChangeText={(text) => {
                  // Validate hex color format
                  if (text.startsWith('#') && (text.length === 4 || text.length === 7)) {
                    setNewColorValue(text);
                  } else if (!text.startsWith('#') && text.length <= 6) {
                    setNewColorValue('#' + text);
                  } else if (text.startsWith('#') && text.length <= 7) {
                    setNewColorValue(text);
                  }
                }}
              />
            </View>

            <View style={styles.labelModalFooter}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddColorModal(false);
                  setShowEditColorModal(false);
                  setEditingColor(null);
                  setAddingLabelColor(false);
                  setNewColorName('');
                  setNewColorValue('#ffffff');
                }}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title={editingColor ? 'Update' : 'Add'}
                onPress={editingColor ? handleUpdateColor : handleAddColor}
                style={styles.addButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Label Modal */}
      <Modal
        visible={showEditLabelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEditLabelModal(false);
          setEditingLabel(null);
          setNewLabelName('');
          setNewLabelColor('#6366f1');
        }}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.labelModalTitle, { color: theme.colors.text }]}>
              Edit Label
            </Text>
            
            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Create New Label</Text>
            <Text style={[styles.inputLabel, { color: theme.colors.text, fontSize: 12, marginTop: 4, marginBottom: 8 }]}>Label Name</Text>
            <TextInput
              style={[
                styles.labelInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Enter label name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newLabelName}
              onChangeText={setNewLabelName}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Icon</Text>
            <TouchableOpacity
              style={styles.iconSelectorButton}
              onPress={() => setShowIconPicker(true)}
            >
              <Ionicons name={selectedIcon || editingLabel?.icon || 'flag'} size={24} color={newLabelColor} />
              <Text style={[styles.iconSelectorText, { color: theme.colors.text }]}>
                {selectedIcon || editingLabel?.icon || 'flag'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <Text style={[styles.inputLabel, { color: theme.colors.text, marginTop: 16 }]}>Color</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.colorPickerRowContainer}
              contentContainerStyle={styles.colorPickerRow}
            >
              {LABEL_COLORS.map((color, index) => {
                const colorValue = typeof color === 'string' ? color : color.value;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: colorValue,
                        borderWidth: newLabelColor === colorValue ? 3 : 1,
                        borderColor: newLabelColor === colorValue ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setNewLabelColor(colorValue)}
                  />
                );
              })}
            </ScrollView>

            <View style={styles.labelModalFooter}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowEditLabelModal(false);
                  setEditingLabel(null);
                  setNewLabelName('');
                  setNewLabelColor('#6366f1');
                }}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title="Update"
                onPress={handleUpdateLabel}
                style={styles.addButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal
        visible={showIconPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowIconPicker(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.labelModalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.iconPickerHeader}>
              <Text style={[styles.labelModalTitle, { color: theme.colors.text }]}>
                Select Icon
              </Text>
              <TouchableOpacity
                onPress={() => setShowIconPicker(false)}
                style={styles.filterModalClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.iconPickerGridContainer} 
              contentContainerStyle={styles.iconPickerGrid}
              showsVerticalScrollIndicator={false}
            >
              {LABEL_ICONS.map((icon, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.iconPickerItem,
                    {
                      backgroundColor: selectedIcon === icon ? '#f3f4f6' : 'transparent',
                      borderColor: selectedIcon === icon ? newLabelColor : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedIcon(icon);
                    setShowIconPicker(false);
                  }}
                >
                  <Ionicons name={icon} size={28} color={selectedIcon === icon ? newLabelColor : theme.colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 20,
    width: '100%',
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  headerContent: {
    paddingTop: 50,
    paddingBottom: 20,
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.95,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  filterBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...{
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  searchIconContainer: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  micIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  filterScroll: {
    marginTop: 20,
    marginBottom: 20,
  },
  filterScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  allChip: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  colorFilterChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  viewTimelineLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  noteCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    minHeight: 140,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  cardHeader: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  labelText: {
    fontSize: 12,
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
    marginTop: 4,
  },
  noteDate: {
    fontSize: 12,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
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
  filterModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  filterModalClose: {
    padding: 4,
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 600,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  filterSearchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  dateFilterScroll: {
    marginHorizontal: -4,
  },
  dateFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginHorizontal: 4,
  },
  dateFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customDateText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  labelFilterScroll: {
    marginHorizontal: -4,
  },
  colorFilterScroll: {
    marginHorizontal: -4,
    paddingVertical: 4,
  },
  filterToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  applyFilterButton: {
    marginTop: 0,
    flex: 1,
  },
  clearFilterButton: {
    flex: 1,
    marginRight: 12,
  },
  filterModalFooter: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsList: {
    gap: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  labelInfo: {
    flex: 1,
  },
  settingsItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  colorList: {
    marginHorizontal: -4,
    paddingVertical: 4,
  },
  colorItemContainer: {
    position: 'relative',
    marginRight: 12,
    marginHorizontal: 4,
  },
  colorItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  customColorItem: {
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  colorItemBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorGridItem: {
    width: (width - 80) / 3,
    alignItems: 'center',
  },
  colorGridColor: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  colorGridName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorPickerRowContainer: {
    marginTop: 8,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  existingLabelsSection: {
    marginBottom: 16,
  },
  existingLabelsList: {
    marginTop: 8,
  },
  existingLabelsListContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  existingLabelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  existingLabelText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // New Settings Modal Styles
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    width: '100%',
    height: '100%',
  },
  settingsModalContent: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  settingsModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  settingsCloseButton: {
    padding: 4,
  },
  settingsScrollView: {
    flex: 1,
    padding: 20,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingsCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  addButtonNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  addButtonNewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
  },
  settingsCardContent: {
    marginTop: 8,
  },
  settingsHintText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  labelCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labelIcon: {
    marginRight: 12,
  },
  labelCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  labelDeleteButton: {
    padding: 4,
  },
  labelActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  labelEditButton: {
    padding: 4,
  },
  editButtonActive: {
    backgroundColor: '#6366f1',
    borderRadius: 6,
  },
  editButtonTextActive: {
    color: '#ffffff',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  addColorButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  colorPaletteItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  customColorPaletteItem: {
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  noteColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  noteColorItem: {
    width: (width - 80) / 3,
    alignItems: 'center',
    marginBottom: 16,
  },
  noteColorPreviewContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
  noteColorPreview: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customNoteColorItem: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  noteColorActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    backgroundColor: '#ffffff',
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    padding: 4,
    zIndex: 100,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  noteColorActionButton: {
    padding: 6,
    borderRadius: 6,
    minWidth: 28,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteColorName: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  visualColorPickerContainer: {
    marginTop: 8,
  },
  colorPickerSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  visualColorPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visualColorPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  rgbPickerContainer: {
    marginTop: 8,
  },
  rgbSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  rgbLabel: {
    fontSize: 16,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  rgbSlider: {
    flex: 1,
    height: 40,
  },
  customSliderContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  sliderTouchArea: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    paddingVertical: 18,
    zIndex: 1,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  sliderTrackFilled: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  rgbInput: {
    width: 50,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsFooter: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveChangesButton: {
    width: '100%',
  },
  iconSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  iconSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  iconPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconPickerGridContainer: {
    maxHeight: 400,
  },
  iconPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    padding: 4,
  },
  iconPickerItem: {
    width: (width - 100) / 4,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 4,
    borderWidth: 2,
  },
});
