import React, { useState, useEffect } from "react";
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
import { Calendar, ChevronDown, List, BarChart, Trash2, Search } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';

interface Injection {
  id: string;
  medicationName: string;
  dosage: string;
  dateTime: string | Date;
  injectionSite?: string;
  site?: string;
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
}

const InjectionHistory = ({
  injections: propInjections,
  onSelectInjection = () => {},
}: InjectionHistoryProps) => {
  const [injections, setInjections] = useState<Injection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const loadInjections = async () => {
    try {
      setLoading(true);
      const storedInjections = await AsyncStorage.getItem("injections");
      if (storedInjections) {
        const parsedInjections = JSON.parse(storedInjections);
        setInjections(
          parsedInjections.map((item: any) => ({
            ...item,
            site: item.injectionSite || item.site,
            dateTime:
              typeof item.dateTime === "string"
                ? item.dateTime
                : new Date(item.dateTime).toISOString(),
          })),
        );
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

  // Calculate testosterone level at a specific injection time
  const calculateTestosteroneLevel = (currentInjection: Injection) => {
    const currentInjectionDate = new Date(currentInjection.dateTime);
    let totalLevel = 0;
    
    // Only consider injections before the current one
    const previousInjections = injections.filter(injection => {
      const injectionDate = new Date(injection.dateTime);
      return injectionDate < currentInjectionDate;
    });
    
    previousInjections.forEach(injection => {
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

  const filteredInjections = injections
    .filter(injection => {
      const query = searchQuery.toLowerCase();
      return (
        injection.medicationName.toLowerCase().includes(query) ||
        injection.site?.toLowerCase().includes(query) ||
        injection.dosage.toString().toLowerCase().includes(query) ||
        injection.notes?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

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

  const renderRatingStars = (rating: number | undefined) => {
    const ratingValue = rating || 0;
    return (
      <View className="flex-row">
        {[...Array(5)].map((_, index) => (
          <Ionicons
            key={index}
            name={index < ratingValue ? 'star' : 'star-outline'}
            size={14}
            color={index < ratingValue ? "#FFD700" : "#9CA3AF"}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderListItem = ({ item }: { item: Injection }) => {
    // Calculate T level at this injection time
    const tLevel = calculateTestosteroneLevel(item);
    
    return (
    <View className="mb-4 bg-gray-800 rounded-lg overflow-hidden">
      {/* Header Section */}
      <View className="p-4 border-b border-gray-700">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-white text-lg font-bold">{item.medicationName}</Text>
          <TouchableOpacity 
            onPress={() => handleDeleteInjection(item.id)}
            className="bg-red-500/10 rounded-full p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
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
            <Text className="text-white">{item.dosage}</Text>
          </View>
        </View>

        <View className="flex-row items-center mb-3">
          <View className="bg-green-500/20 rounded-full p-2 mr-3">
            <Ionicons name="location" size={14} color="#22c55e" />
          </View>
          <View>
            <Text className="text-gray-400 text-sm">Injection Site</Text>
            <Text className="text-white">{item.site}</Text>
          </View>
        </View>
        
        <View className="flex-row items-center mb-3">
          <View className="bg-orange-500/20 rounded-full p-2 mr-3">
            <Ionicons name="analytics" size={14} color="#f97316" />
          </View>
          <View>
            <Text className="text-gray-400 text-sm">T Level at Injection</Text>
            <Text className="text-white">{tLevel} <Text className="text-white">mg</Text></Text>
          </View>
        </View>

        {/* Ratings Section */}
        {(item.moodRating || item.sleepRating || item.libidoRating || item.energyRating || item.sidesRating) && (
          <View className="mt-4 pt-4 border-t border-gray-700">
            {/* <Text className="text-gray-400 text-sm mb-3"></Text> */}
            <View className="flex-row flex-wrap">
              {item.moodRating && item.moodRating > 0 && (
                <View className="bg-gray-700/50 rounded-lg p-2 mr-2 mb-2">
                  <Text className="text-gray-400 text-xs mb-1">Mood</Text>
                  {renderRatingStars(item.moodRating)}
                </View>
              )}
              {item.sleepRating && item.sleepRating > 0 && (
                <View className="bg-gray-700/50 rounded-lg p-2 mr-2 mb-2">
                  <Text className="text-gray-400 text-xs mb-1">Sleep</Text>
                  {renderRatingStars(item.sleepRating)}
                </View>
              )}
              {item.libidoRating && item.libidoRating > 0 && (
                <View className="bg-gray-700/50 rounded-lg p-2 mr-2 mb-2">
                  <Text className="text-gray-400 text-xs mb-1">Libido</Text>
                  {renderRatingStars(item.libidoRating)}
                </View>
              )}
              {item.energyRating && item.energyRating > 0 && (
                <View className="bg-gray-700/50 rounded-lg p-2 mr-2 mb-2">
                  <Text className="text-gray-400 text-xs mb-1">Energy</Text>
                  {renderRatingStars(item.energyRating)}
                </View>
              )}
              {item.sidesRating && item.sidesRating > 0 && (
                <View className="bg-gray-700/50 rounded-lg p-2 mr-2 mb-2">
                  <Text className="text-gray-400 text-xs mb-1">Side Effects</Text>
                  {renderRatingStars(item.sidesRating)}
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

  return (
    <View className="flex-1 bg-gray-900 p-4">
      <Text className="text-white text-2xl font-bold mb-6">Injection History</Text>

      <View className={`mb-4 bg-gray-800 rounded-lg flex-row items-center px-3 ${searchFocused ? 'border border-blue-500' : ''}`}>
        <Search size={18} color="#6B7280" />
        <TextInput
          className="flex-1 py-3 px-2 text-white"
          placeholder="Search medications, sites, dosages..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {searchQuery !== "" && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text className="text-white mt-4">Loading injections...</Text>
        </View>
      ) : filteredInjections.length === 0 ? (
        <View className="flex-1 justify-center items-center">
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
      ) : (
        <FlatList
          data={filteredInjections}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
        />
      )}
    </View>
  );
};

export default InjectionHistory;
