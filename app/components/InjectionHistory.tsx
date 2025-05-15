import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, ChevronDown, List, BarChart } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Injection {
  id: string;
  medicationName: string;
  dosage: string;
  dateTime: string | Date;
  injectionSite?: string;
  site?: string;
  halfLife?: string;
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

  useEffect(() => {
    const loadInjections = async () => {
      try {
        setLoading(true);
        const storedInjections = await AsyncStorage.getItem("injections");
        if (storedInjections) {
          const parsedInjections = JSON.parse(storedInjections);
          setInjections(
            parsedInjections.map((item: any) => ({
              ...item,
              site: item.injectionSite || item.site, // Handle both property names
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

    loadInjections();
  }, [propInjections]);
  const [viewMode, setViewMode] = useState<"list" | "chart">("list");
  const [sortBy, setSortBy] = useState<"date" | "medication">("date");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Sort injections based on selected sort criteria
  const sortedInjections = [...injections].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
    } else {
      return a.medicationName.localeCompare(b.medicationName);
    }
  });

  const renderListItem = ({ item }: { item: Injection }) => (
    <TouchableOpacity
      className="mb-4 p-4 rounded-lg bg-gray-800 border border-gray-700"
      onPress={() => onSelectInjection(item)}
    >
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-white text-lg font-bold">
            {item.medicationName}
          </Text>
          <Text className="text-gray-400">{item.dosage}</Text>
          <Text className="text-gray-400 mt-1">{item.site}</Text>
        </View>
        <View className="items-end">
          <Text className="text-blue-400">
            {new Date(item.dateTime).toLocaleDateString()}
          </Text>
          <Text className="text-gray-500">
            {new Date(item.dateTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-white text-2xl font-bold">Injection History</Text>
        <View className="flex-row">
          <TouchableOpacity
            className={`mr-2 p-2 rounded-full ${viewMode === "list" ? "bg-blue-600" : "bg-gray-800"}`}
            onPress={() => setViewMode("list")}
          >
            <List size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className={`p-2 rounded-full ${viewMode === "chart" ? "bg-blue-600" : "bg-gray-800"}`}
            onPress={() => setViewMode("chart")}
          >
            <BarChart size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text className="text-white mt-4">Loading injections...</Text>
        </View>
      ) : injections.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">No injection records found</Text>
          <Text className="text-gray-400 mt-2">
            Add your first injection to get started
          </Text>
        </View>
      ) : (
        <>
          {viewMode === "list" && (
            <>
              <View className="relative mb-4">
                <TouchableOpacity
                  className="flex-row items-center justify-between p-3 bg-gray-800 rounded-lg"
                  onPress={() => setSortMenuOpen(!sortMenuOpen)}
                >
                  <Text className="text-white">
                    Sort by: {sortBy === "date" ? "Date" : "Medication"}
                  </Text>
                  <ChevronDown size={20} color="white" />
                </TouchableOpacity>

                {sortMenuOpen && (
                  <View className="absolute top-12 left-0 right-0 bg-gray-800 rounded-lg z-10 border border-gray-700">
                    <TouchableOpacity
                      className="p-3 border-b border-gray-700"
                      onPress={() => {
                        setSortBy("date");
                        setSortMenuOpen(false);
                      }}
                    >
                      <Text className="text-white">Date</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="p-3"
                      onPress={() => {
                        setSortBy("medication");
                        setSortMenuOpen(false);
                      }}
                    >
                      <Text className="text-white">Medication</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <FlatList
                data={sortedInjections}
                renderItem={renderListItem}
                keyExtractor={(item) => item.id}
                className="flex-1"
              />
            </>
          )}

          {viewMode === "chart" && renderChartView()}
        </>
      )}
    </View>
  );
};

export default InjectionHistory;
