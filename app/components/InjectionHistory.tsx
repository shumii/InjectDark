import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, ChevronDown, List, BarChart, Trash2, Search, Pencil, Plus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
import Icon from 'react-native-vector-icons/FontAwesome';
import InjectionForm from "./InjectionForm";
import EditInjectionForm from "./EditInjectionForm";
import { getOppositeSite, formatLocalizedNumber } from '../utils/injectionUtils';

interface Injection {
  id: string;
  medicationName: string;
  dosage: string;
  dateTime: string | Date;
  injectionSite?: string;
  halfLife?: string;
  halfLifeMinutes?: number;
  moodRating: number | undefined;
  sleepRating: number | undefined;
  libidoRating: number | undefined;
  energyRating: number | undefined;
  sidesRating: number | undefined;
  notes?: string;
  concentration?: number;
}

interface InjectionHistoryProps {
  injections?: Injection[];
  onSelectInjection?: (injection: Injection) => void;
  selectedInjectionId?: string;
  onClearSelectedInjection?: () => void;
  onDataChange?: () => void;
}

const InjectionHistory = ({
  injections: propInjections,
  onSelectInjection = () => {},
  selectedInjectionId,
  onClearSelectedInjection,
  onDataChange,
}: InjectionHistoryProps) => {
  const [injections, setInjections] = useState<Injection[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempSearchQuery, setTempSearchQuery] = useState(""); // What user is typing
  const [searchQuery, setSearchQuery] = useState(""); // Actual search filter applied
  const [searchFocused, setSearchFocused] = useState(false);
  const flatListRef = useRef<FlatList<Injection>>(null);
  const [defaultDosageUnit, setDefaultDosageUnit] = useState<'mg' | 'ml'>('mg');

  // Load dosage unit setting
  useEffect(() => {
    const loadDosageUnit = async () => {
      try {
        const storedUnit = await AsyncStorage.getItem('defaultDosageUnit');
        if (storedUnit) {
          setDefaultDosageUnit(storedUnit as 'mg' | 'ml');
        }
      } catch (error) {
        console.error('Error loading dosage unit:', error);
      }
    };
    loadDosageUnit();
  }, []);

  // Utility function to format dosage based on user preference
  const formatDosage = (dosageInMg: number, medicationName: string, concentration?: number) => {
    if (defaultDosageUnit === 'ml') {
      // Convert mg to ml using concentration
      const medConcentration = concentration || 100; // Default to 100mg/ml if not specified
      const dosageInMl = dosageInMg / medConcentration;
      return `${formatLocalizedNumber(dosageInMl, 1)} ml (${formatLocalizedNumber(dosageInMg, 0)} mg)`;
    } else {
      return `${formatLocalizedNumber(dosageInMg, 0)} mg`;
    }
  };
  const [editingInjection, setEditingInjection] = useState<Injection | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

    const loadInjections = async () => {
      try {

        setLoading(true);
        const storedInjections = await AsyncStorage.getItem("injections");
        
        if (storedInjections) {
          const parsedInjections = JSON.parse(storedInjections);
          
          const mappedInjections = parsedInjections.map((item: any) => ({
            ...item,
            dateTime:
              typeof item.dateTime === "string"
                ? item.dateTime
                : new Date(item.dateTime).toISOString(),
          }));
          
          setInjections(mappedInjections);
        } else if (propInjections) {
          setInjections(propInjections);
        }
      } catch (error) {
        console.error("Error loading injections:", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadInjections();
  }, [propInjections]);

  // Memoize filtered injections to prevent unnecessary recalculations
  const filteredInjections = useMemo(() => 
    injections
      .filter(injection => {
        const query = searchQuery.toLowerCase();
        return (
          injection.medicationName.toLowerCase().includes(query) ||
          injection.injectionSite?.toLowerCase().includes(query) ||
          injection.dosage.toString().toLowerCase().includes(query) ||
          injection.notes?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [injections, searchQuery]
  );



  useEffect(() => {
    if (selectedInjectionId && filteredInjections.length > 0 && !showEditForm && !showAddForm) {
      console.log('[InjectionHistory] Attempting to scroll to injection:', selectedInjectionId);
      const index = filteredInjections.findIndex(inj => inj.id === selectedInjectionId);
      console.log('[InjectionHistory] Found at index:', index, 'of', filteredInjections.length);
      
      if (index !== -1) {
        // Use setTimeout to ensure FlatList is mounted and laid out
        const timer = setTimeout(() => {
          console.log('[InjectionHistory] Timer fired, flatListRef exists:', !!flatListRef.current);
          if (flatListRef.current) {
            try {
              console.log('[InjectionHistory] Calling scrollToIndex with index:', index);
              flatListRef.current.scrollToIndex({ 
                index, 
                animated: true,
                viewPosition: 0 // Position at top of viewport
              });
              // Clear the selected injection after scrolling
              if (onClearSelectedInjection) {
                setTimeout(() => {
                  onClearSelectedInjection();
                }, 1000); // Wait for scroll animation to complete
              }
            } catch (error) {
              console.log('[InjectionHistory] scrollToIndex failed:', error);
              // Still clear even if scroll failed
              if (onClearSelectedInjection) {
                onClearSelectedInjection();
              }
            }
          }
        }, 500); // Longer timeout to ensure everything is rendered
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectedInjectionId, filteredInjections, showEditForm, showAddForm, onClearSelectedInjection]);

  // Calculate testosterone level at a specific injection time
  const calculateTestosteroneLevel = (currentInjection: Injection) => {
    const currentInjectionDate = new Date(currentInjection.dateTime);
    let totalLevel = 0;
    
    // Only consider injections before the current one
    const previousInjections = injections.filter(injection => {
      const injectionDate = new Date(injection.dateTime);
      return injectionDate < currentInjectionDate;
    });
    
    previousInjections.forEach((injection) => {
      const injectionDate = new Date(injection.dateTime);
      const halfLifeMinutes = injection.halfLifeMinutes || 0;
      
      if (halfLifeMinutes > 0) {
        // Calculate minutes difference between current injection and this previous injection
        const minutesDiff = (currentInjectionDate.getTime() - injectionDate.getTime()) / (1000 * 60);
        
        if (minutesDiff >= 0) { // Only calculate for previous injections
          // Calculate remaining testosterone using half-life decay
          const halfLifePeriods = minutesDiff / halfLifeMinutes;
          const decayFactor = Math.pow(0.5, halfLifePeriods);
          const levelForThisInjection = Number(injection.dosage) * decayFactor;
          
          // Only add if it's a testosterone medication
          if (injection.medicationName.toLowerCase().includes('testosterone')) {
            totalLevel += levelForThisInjection;
          }
        }
      }
    });
    
    return Math.round(totalLevel);
  };

  // Calculate testosterone levels before and after injection
  const calculateTestosteroneLevels = (currentInjection: Injection) => {
    const beforeInjection = calculateTestosteroneLevel(currentInjection);
    const afterInjection = beforeInjection + Number(currentInjection.dosage);
    
    return {
      before: beforeInjection,
      after: afterInjection
    };
  };

  const handleDeleteInjection = async (id: string) => {
    Alert.alert(
      "Delete Injection",
      "Are you sure you want to delete this injection? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const storedInjections = await AsyncStorage.getItem("injections");
              if (storedInjections) {
                const parsedInjections = JSON.parse(storedInjections);
                const updatedInjections = parsedInjections.filter((injection: any) => injection.id !== id);
                await AsyncStorage.setItem("injections", JSON.stringify(updatedInjections));
                await loadInjections();
                onDataChange?.(); // Notify parent that data changed
              }
            } catch (error) {
              console.error("Error deleting injection:", error);
              Alert.alert("Error", "Failed to delete injection. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleEditInjection = (injection: Injection) => {
    setEditingInjection(injection);
    setShowEditForm(true);
  };

  const handleSaveEditedInjection = async (updatedData: any) => {
    try {
      const storedInjections = await AsyncStorage.getItem("injections");
      let injectionsList = storedInjections ? JSON.parse(storedInjections) : [];
      
      // Find the original injection to preserve halfLifeMinutes
      const originalInjection = injectionsList.find((inj: any) => inj.id === updatedData.id);
      
      // Ensure dosage is a number and preserve halfLifeMinutes
      const updatedInjection = {
        ...updatedData,
        dosage: Number(updatedData.dosage),
        halfLifeMinutes: originalInjection?.halfLifeMinutes || updatedData.halfLifeMinutes,
      };
      
      injectionsList = injectionsList.map((inj: any) => inj.id === updatedInjection.id ? updatedInjection : inj);
      await AsyncStorage.setItem("injections", JSON.stringify(injectionsList));
      setShowEditForm(false);
      setEditingInjection(null);
      loadInjections();
      onDataChange?.(); // Notify parent that data changed
    } catch (error) {
      console.error("Error saving edited injection:", error);
      Alert.alert("Error", "Failed to save injection. Please try again.");
    }
  };

  const handleAddInjection = async (newInjection: any) => {
    try {
      const storedInjections = await AsyncStorage.getItem("injections");
      let injections = storedInjections ? JSON.parse(storedInjections) : [];
      
      injections = [...injections, newInjection];
      
      await AsyncStorage.setItem("injections", JSON.stringify(injections));
      
      setShowAddForm(false);
      loadInjections();
      onDataChange?.(); // Notify parent that data changed
    } catch (error) {
      console.error("Error adding injection:", error);
      Alert.alert("Error", "Failed to add injection. Please try again.");
    }
  };

  const renderRatingFaces = (rating: number | undefined) => {
    const ratingValue = rating || 0;
    return (
      <View className="flex-row">
        {[...Array(5)].map((_, index) => {
          const ratingLevel = index + 1;
          const isSelected = ratingLevel === ratingValue;
          
          // Choose smiley face based on rating level - each level gets a distinct face
          let iconName = 'happy-outline'; // Default neutral face
          let iconColor = '#9CA3AF'; // Default gray color
          
          if (isSelected) {
            switch (ratingLevel) {
              case 1:
                iconName = 'frown-o';
                iconColor = '#EF4444'; // Red for very sad
                break;
              case 2:
                iconName = 'frown-o';
                iconColor = '#F97316'; // Orange for sad
                break;
              case 3:
                iconName = 'meh-o';
                iconColor = '#EAB308'; // Yellow for neutral
                break;
              case 4:
                iconName = 'smile-o';
                iconColor = '#22C55E'; // Green for happy
                break;
              case 5:
                iconName = 'smile-o';
                iconColor = '#3B82F6'; // Blue for very happy
                break;
            }
          } else {
            // For unselected faces, show different faces based on their position
            switch (ratingLevel) {
              case 1:
                iconName = 'frown-o';
                break;
              case 2:
                iconName = 'frown-o';
                break;
              case 3:
                iconName = 'meh-o';
                break;
              case 4:
                iconName = 'smile-o';
                break;
              case 5:
                iconName = 'smile-o';
                break;
            }
          }
          
          return (
            <Icon
              key={index}
              name={iconName}
              size={20}
              color={iconColor}
              style={{ marginRight: 2 }}
            />
          );
        })}
      </View>
    );
  };

  const renderListItem = ({ item }: { item: Injection }) => {
    // Calculate T levels before and after injection
    const tLevels = calculateTestosteroneLevels(item);

    // Coerce all ratings to numbers
    const mood = Number(item.moodRating) || 0;
    const sleep = Number(item.sleepRating) || 0;
    const libido = Number(item.libidoRating) || 0;
    const energy = Number(item.energyRating) || 0;
    const sides = Number(item.sidesRating) || 0;

    const isSelected = item.id === selectedInjectionId;
    return (
      <View className="mb-4 bg-gray-800 rounded-lg overflow-hidden">
        {/* Header Section */}
        <View className="p-4 border-b border-gray-700">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-lg font-bold">{item.medicationName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => handleEditInjection(item)}
                className="bg-blue-500/10 rounded-full p-2 mr-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Pencil size={16} color="#60a5fa" />
              </TouchableOpacity>
    <TouchableOpacity
                onPress={() => handleDeleteInjection(item.id)}
                className="bg-red-500/10 rounded-full p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="bg-blue-500/20 rounded-full p-2 mr-3">
                <Calendar size={14} color="#60a5fa" />
              </View>
        <View>
          <Text className="text-blue-400">
                  {new Date(item.dateTime).toLocaleDateString()} • {" "}
                  <Text className="text-gray-400">
            {new Date(item.dateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View className="p-4">
          <View className="flex-row items-center mb-3">
            <View className="bg-purple-500/20 rounded-full p-2 mr-3">
              <Ionicons name="medical" size={14} color="#a855f7" />
            </View>
            <View>
              <Text className="text-gray-400 text-sm">Dosage</Text>
              <Text className="text-white">{formatDosage(item.dosage, item.medicationName, item.concentration)}</Text>
            </View>
          </View>

          <View className="flex-row items-center mb-3">
            <View className="bg-green-500/20 rounded-full p-2 mr-3">
              <Ionicons name="location" size={14} color="#22c55e" />
            </View>
            <View>
              <Text className="text-gray-400 text-sm">Injection Site</Text>
              <Text className="text-white">{item.injectionSite}</Text>
            </View>
          </View>
          
          <View className="flex-row items-center mb-3">
            <View className="bg-orange-500/20 rounded-full p-2 mr-3">
              <Ionicons name="analytics" size={14} color="#f97316" />
            </View>
            <View>
              <Text className="text-gray-400 text-sm">T Level at Injection</Text>
              <Text className="text-white">
                {tLevels.before} <Text className="text-gray-400">mg</Text> → {tLevels.after} <Text className="text-gray-400">mg</Text>
              </Text>
            </View>
          </View>

          {/* Ratings Section */}
          {(mood > 0 || sleep > 0 || libido > 0 || energy > 0 || sides > 0) && (
            <View className="mt-4 pt-4 border-t border-gray-700">
              <View className="flex-row flex-wrap">
                {mood > 0 && (
                  <View className="bg-gray-700/50 rounded-lg p-2 mb-2" style={{ width: '48%', marginRight: '2%' }}>
                    <Text className="text-gray-400 text-xs mb-1">Mood</Text>
                    {renderRatingFaces(mood)}
                  </View>
                )}
                {sleep > 0 && (
                  <View className="bg-gray-700/50 rounded-lg p-2 mb-2" style={{ width: '48%', marginRight: '2%' }}>
                    <Text className="text-gray-400 text-xs mb-1">Sleep</Text>
                    {renderRatingFaces(sleep)}
                  </View>
                )}
                {libido > 0 && (
                  <View className="bg-gray-700/50 rounded-lg p-2 mb-2" style={{ width: '48%', marginRight: '2%' }}>
                    <Text className="text-gray-400 text-xs mb-1">Libido</Text>
                    {renderRatingFaces(libido)}
                  </View>
                )}
                {energy > 0 && (
                  <View className="bg-gray-700/50 rounded-lg p-2 mb-2" style={{ width: '48%', marginRight: '2%' }}>
                    <Text className="text-gray-400 text-xs mb-1">Energy</Text>
                    {renderRatingFaces(energy)}
                  </View>
                )}
                {sides > 0 && (
                  <View className="bg-gray-700/50 rounded-lg p-2 mb-2" style={{ width: '48%', marginRight: '2%' }}>
                    <Text className="text-gray-400 text-xs mb-1">Side Effects</Text>
                    {renderRatingFaces(sides)}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes Section */}
          {item.notes && (
            <View className="mt-4 pt-4 border-t border-gray-700">
              <Text className="text-gray-400 text-sm mb-2">Notes</Text>
              <Text className="text-white">{item.notes}</Text>
            </View>
          )}
        </View>
      </View>
  );
  };

  const renderChartView = () => {
    // Group injections by date for chart visualization
    const injectionsByDate: Record<string, number> = {};
    injections.forEach((injection) => {
      const date = new Date(injection.dateTime).toLocaleDateString();
      injectionsByDate[date] = (injectionsByDate[date] || 0) + 1;
    });

    // Group injections by medication for chart visualization
    const injectionsByMedication: Record<string, number> = {};
    injections.forEach((injection) => {
      injectionsByMedication[injection.medicationName] =
        (injectionsByMedication[injection.medicationName] || 0) + 1;
    });

    return (
      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-white text-xl font-bold mb-4">
            Injections by Date
          </Text>
          <View className="h-60 flex-row items-end justify-between bg-gray-800 rounded-lg p-4">
            {Object.entries(injectionsByDate).map(([date, count], index) => (
              <View key={index} className="items-center">
                <View
                  style={{ height: count * 30 }}
                  className="w-8 bg-blue-500 rounded-t-md"
                />
                <Text className="text-gray-400 text-xs mt-2">
                  {date.slice(-5)}
                </Text>
                <Text className="text-white text-xs">{count}</Text>
              </View>
            ))}
          </View>

          <Text className="text-white text-xl font-bold mt-8 mb-4">
            Injections by Medication
          </Text>
          <View className="bg-gray-800 rounded-lg p-4">
            {Object.entries(injectionsByMedication).map(
              ([medication, count], index) => (
                <View key={index} className="mb-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-white">{medication}</Text>
                    <Text className="text-gray-400">{count}</Text>
                  </View>
                  <View className="h-4 bg-gray-700 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${(count / Math.max(...Object.values(injectionsByMedication))) * 100}%`,
                      }}
                    />
                  </View>
                </View>
              ),
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // Handler for when user submits search (presses return/search button)
  const handleSearchSubmit = () => {
    setSearchQuery(tempSearchQuery);
  };

  // Handler to clear search
  const handleClearSearch = () => {
    setTempSearchQuery("");
    setSearchQuery("");
  };

  // Render header component - using useCallback for function stability
  const renderHeader = useCallback(() => (
    <View className="mt-5">
      <Text className="text-white text-2xl font-bold mb-3">Injection History</Text>

      <View className={`mb-4 bg-gray-800 rounded-lg flex-row items-center px-3 ${searchFocused ? 'border border-blue-500' : ''}`}>
        <Search size={18} color="#6B7280" />
        <TextInput
          className="flex-1 py-3 px-2 text-white"
          placeholder="Search medications, sites, dosages..."
          placeholderTextColor="#6B7280"
          value={tempSearchQuery}
          onChangeText={setTempSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          onSubmitEditing={handleSearchSubmit}
          enablesReturnKeyAutomatically={true}
        />
        {tempSearchQuery !== "" && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Add Injection Button - match HomeScreen style */}
      <TouchableOpacity
        onPress={() => setShowAddForm(true)}
        className="mb-6 rounded-md bg-blue-500"
      >
        <View style={{ flexDirection: 'row' }} className="p-4">
          <Plus size={24} color="white" />
          <Text className="text-white text-lg font-semibold ml-2">
            Add Injection
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ), [tempSearchQuery, searchFocused]);

  // If showing edit form, render it full screen
  if (showEditForm && editingInjection) {
    return (
      <View className="flex-1 bg-gray-900">
        <EditInjectionForm
          onClose={() => setShowEditForm(false)}
          onSave={handleSaveEditedInjection}
          injection={{
            ...editingInjection,
            dosage: Number(editingInjection.dosage),
            dateTime: new Date(editingInjection.dateTime),
            injectionSite: editingInjection.injectionSite || "",
            halfLifeMinutes: editingInjection.halfLifeMinutes,
            concentration: editingInjection.concentration,
          }}
        />
      </View>
    );
  }

  // If showing add form, render it full screen like home screen
  if (showAddForm) {
    // Calculate the suggested site for the new injection - same logic as home screen
    let suggestedSite = "";
    if (injections.length >= 2) {
      // Get the last two injections
      const lastInjection = injections[0];
      const secondLastInjection = injections[1];
      
      // Calculate the time difference in minutes between the last two injections
      const lastDate = new Date(lastInjection.dateTime);
      const secondLastDate = new Date(secondLastInjection.dateTime);
      const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));
      
      // Calculate the next injection date by adding the same time difference
      const nextDate = new Date(lastDate.getTime() + diffInMinutes * 60 * 1000);
      
      // Determine next injection site - suggest opposite side
      suggestedSite = getOppositeSite(lastInjection.injectionSite);
    } else if (injections.length === 1) {
      // If we only have one injection, suggest the opposite site
      suggestedSite = getOppositeSite(injections[0].injectionSite);
    }

    return (
      <View className="flex-1 bg-gray-900">
        <InjectionForm
          onClose={() => setShowAddForm(false)}
          lastInjection={injections.length > 0 ? {
            ...injections[0],
            injectionSite: suggestedSite || injections[0].injectionSite
          } : undefined}
          onSave={handleAddInjection}
          defaultDosageUnit={defaultDosageUnit}
          defaultInjectionTime={new Date()}
          useCurrentTime={true}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text className="text-white mt-4">Loading injections...</Text>
        </View>
      ) : filteredInjections.length === 0 ? (
        <View className="flex-1">
          {renderHeader()}
          <View className="flex-1 justify-center items-center px-4">
            {searchQuery !== "" ? (
              <>
                <Text className="text-white text-lg">No matching injections found</Text>
                <Text className="text-gray-400 mt-2 text-center">
                  Try adjusting your search terms or clear the search to see all injections
                </Text>
              </>
            ) : (
              <>
                <Text className="text-white text-lg">No injection records found</Text>
                <Text className="text-gray-400 mt-2">
                  Add your first injection to get started
                </Text>
              </>
            )}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredInjections}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          onScrollToIndexFailed={(info) => {
            // Fallback if scrollToIndex fails
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            });
          }}
        />
      )}

    </View>
  );
};

export default InjectionHistory;
