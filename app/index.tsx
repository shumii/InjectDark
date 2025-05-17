import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Calendar, BarChart3, Settings, Trash2 } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import components
import InjectionForm from "./components/InjectionForm";
import InjectionHistory from "./components/InjectionHistory";
import StatisticsDashboard from "./components/StatisticsDashboard";
import MedicationChart from "./components/MedicationChart";
import { InjectionData } from "./components/InjectionForm";

interface RecentInjection {
  id: string;
  medication: string;
  dosage: number;
  dateDisplay: string;
  date: Date;
  site: string;
}

const StorageService = {
  async Get(key: string) {
    try {
      const value = await AsyncStorage.getItem(key)

      return value;
    } catch (e) {
      throw e;
    }
  }
  ,

  async Set(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (e) {
      console.log('error saving ' + e);
    }

  },

  async Remove(key: string) {
    try {
      await AsyncStorage.removeItem(key)
    } catch (e) {
      console.log('error removing ' + e);
    }

  }
}



export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("home");
  const [showInjectionForm, setShowInjectionForm] = useState(false);

  const [recentInjections, setRecentInjections] = useState<RecentInjection[]>([],);
  const [allInjections, setAllInjections] = useState<InjectionData[]>([],);
  const [loading, setLoading] = useState(true);

  // Helper function to format date and time in a Facebook-style format
  const formatRelativeDateTime = (dateTime: Date | string) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    const timeString = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    // Just now: less than 1 minute ago
    if (diffInSeconds < 60) {
      return "Just now";
    }
    // Minutes ago: less than 1 hour ago
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    // Hours ago: less than 24 hours ago
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    // Yesterday at TIME
    if (diffInDays === 1) {
      return `Yesterday at ${timeString}`;
    }
    // Days ago (2-7 days): include time
    if (diffInDays < 7) {
      return `${diffInDays}d ago at ${timeString}`;
    }
    // Full date for older posts
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + ` at ${timeString}`;
  };

  // Load injections from AsyncStorage
  const loadInjections = async () => {
    try {
      setLoading(true);
      const storedInjections = await AsyncStorage.getItem("injections");
debugger;
      if (storedInjections) {
        const parsedInjections: InjectionData[] =
          JSON.parse(storedInjections);

        const sortedInjections = parsedInjections.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());          

        // Format the data for display and take only the 3 most recent
        const formattedInjections = sortedInjections
          .slice(0, 3)
          .map((injection) => ({
            id: injection.id,
            medication: injection.medicationName,
            dosage: injection.dosage,
            dateDisplay: formatRelativeDateTime(injection.dateTime),
            date: injection.dateTime,
            site: injection.injectionSite,
          }))
          //.sort((a, b) => b.date.getTime() - a.date.getTime()).reverse();
    
        setRecentInjections(formattedInjections);
        setAllInjections(sortedInjections);
        console.log('Loaded injections:', sortedInjections);
      }
    } catch (error) {
      console.error("Error loading injections:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadInjections();
  }, []);

  const handleShowInjectionForm = async () => {
    await loadInjections(); // Reload injections before showing form
    setShowInjectionForm(true);
  };

  // Helper function to get the opposite site
  const getOppositeSite = (site: string): string => {
    const oppositePairs = {
      'Left Glute': 'Right Glute',
      'Right Glute': 'Left Glute',
      'Left Delt': 'Right Delt',
      'Right Delt': 'Left Delt',
      'Left Thigh': 'Right Thigh',
      'Right Thigh': 'Left Thigh',
      'Left Arm': 'Right Arm',
      'Right Arm': 'Left Arm',
      'Abdomen': 'Abdomen'
    };
    return oppositePairs[site as keyof typeof oppositePairs] || site;
  };

  // Function to detect site rotation pattern
  const detectSitePattern = (injections: InjectionData[]): string | null => {
    if (injections.length < 3) return null;

    // Get the last 4 injection sites (or fewer if not available)
    const lastSites = injections.slice(0, 4).map(inj => inj.injectionSite);
    
    // Check if there's a repeating pattern of 2
    if (lastSites.length >= 4 &&
        lastSites[0] === lastSites[2] &&
        lastSites[1] === lastSites[3]) {
      return lastSites[1]; // Return the next site in the pattern
    }

    // Check if there's a repeating pattern of 3
    if (lastSites.length >= 3 &&
        lastSites[0] === lastSites[3] &&
        lastSites[1] === lastSites[4] &&
        lastSites[2] === lastSites[5]) {
      return lastSites[1]; // Return the next site in the pattern
    }

    return null; // No pattern detected
  };

  // Calculate next injection date and details based on previous injection pattern
  const calculateNextInjection = (injections: InjectionData[]) => {
    if (injections.length < 2) return null;

    // Get the last two injections
    const lastInjection = injections[0];
    const secondLastInjection = injections[1];

    // Calculate the time difference in minutes between the last two injections
    const lastDate = new Date(lastInjection.dateTime);
    const secondLastDate = new Date(secondLastInjection.dateTime);
    const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));

    // Calculate the next injection date by adding the same time difference
    const nextDate = new Date(lastDate.getTime() + diffInMinutes * 60 * 1000);

    // Determine next injection site
    let nextSite = lastInjection.injectionSite;
    
    // First try to detect a pattern
    const patternSite = detectSitePattern(injections);
    if (patternSite) {
      nextSite = patternSite;
    } else {
      // If no pattern, suggest opposite side
      nextSite = getOppositeSite(lastInjection.injectionSite);
    }

    return {
      ...lastInjection,
      dateTime: nextDate,
      injectionSite: nextSite
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
              // Get current injections
              const storedInjections = await AsyncStorage.getItem("injections");
              if (storedInjections) {
                const parsedInjections: InjectionData[] = JSON.parse(storedInjections);
                // Filter out the deleted injection
                const updatedInjections = parsedInjections.filter(injection => injection.id !== id);
                // Save back to storage
                await AsyncStorage.setItem("injections", JSON.stringify(updatedInjections));
                // Reload injections to update UI
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

  const renderContent = () => {
    if (showInjectionForm) {
      // Calculate the suggested site for the new injection
      let suggestedSite = "";
      if (allInjections.length >= 2) {
        const nextInjection = calculateNextInjection(allInjections);
        if (nextInjection) {
          suggestedSite = nextInjection.injectionSite;
        }
      } else if (allInjections.length === 1) {
        // If we only have one injection, suggest the opposite site
        suggestedSite = getOppositeSite(allInjections[0].injectionSite);
      }

      return (
        <InjectionForm
          onClose={() => setShowInjectionForm(false)}
          lastInjection={allInjections.length > 0 ? {
            ...allInjections[0],
            injectionSite: suggestedSite || allInjections[0].injectionSite
          } : undefined}
          onSave={async(data) => {
            // Handle saving injection data
            console.log("Saving injection data:", data);            

            var injectionsListString = await StorageService.Get("injections"); 

            var injectionsList = [];

            if (injectionsListString != null)
            {
              injectionsList = JSON.parse(injectionsListString);
            }
            
            injectionsList.unshift(data); // Add new injection at the beginning of the array

            await StorageService.Set("injections", JSON.stringify(injectionsList));
            await loadInjections(); // Reload the data after saving
            setShowInjectionForm(false);
          }}
        />
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <ScrollView className="flex-1 px-4">
            <View className="mt-4 mb-6">
              <Text className="text-2xl font-bold text-white mb-1">
                T Diary
              </Text>
              <Text className="text-gray-400">
                Track your testosterone injections easily
              </Text>
            </View>

            {/* Add Injection Button */}
            <TouchableOpacity
              onPress={handleShowInjectionForm}
              className="mb-6 rounded-md bg-blue-500"
            >
              <View style={{ flexDirection: 'row' }} className="p-4">
                <Plus size={24} color="white" />
                <Text className="text-white text-lg font-semibold ml-2">
                  Add Injection
                </Text>
              </View>
            </TouchableOpacity>            
            

            {/* Next Injection */}
            {allInjections.length >= 2 && (() => {
              const nextInjection = calculateNextInjection(allInjections);
              if (!nextInjection) return null;

              return (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-white mb-3">
                    Next Injection
                  </Text>
                  <View
                    className="bg-gray-800 rounded-lg p-4 mb-3"
                  >
                    <View className="flex-row justify-between">
                      <Text className="text-white font-semibold">
                        {nextInjection.medicationName}
                      </Text>
                      <Text className="text-gray-400">{nextInjection.dosage}mg</Text>
                    </View>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-gray-400">{nextInjection.injectionSite}</Text>
                      <Text className="text-gray-400">
                        {new Date(nextInjection.dateTime).toLocaleString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Recent Injections */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-white mb-3">
                Recent Injections
              </Text>
              {loading ? (
                <View className="bg-gray-800 rounded-lg p-6 items-center justify-center">
                  <ActivityIndicator size="small" color="#60a5fa" />
                  <Text className="text-gray-400 mt-2">
                    Loading injections...
                  </Text>
                </View>
              ) : recentInjections.length === 0 ? (
                <View className="bg-gray-800 rounded-lg p-6 items-center justify-center">
                  <Text className="text-gray-400">
                    No injections recorded yet
                  </Text>
                  <TouchableOpacity
                    onPress={handleShowInjectionForm}
                    className="mt-3 bg-blue-600 px-4 py-2 rounded-md"
                  >
                    <Text className="text-white">Add Your First Injection</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                recentInjections.map((injection) => (
                <View
                   key={injection.id}
                  className="bg-gray-800 rounded-lg p-4 mb-3"
                >
                  <View className="flex-row justify-between">
                    <Text className="text-white font-semibold">
                      {injection.medication}
                    </Text>
                    <Text className="text-gray-400">{injection.dosage}mg</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-gray-400">{injection.site}</Text>
                    <Text className="text-gray-400">{injection.dateDisplay}</Text>
                  </View>
                </View>
              ))
            )}
            </View>

            {/* Medication Chart */}
            <MedicationChart
              injectionData={allInjections.map((injection) => ({
                id: injection.id,
                medicationName: injection.medicationName,
                dosage: injection.dosage,                
                dateTime: injection.dateTime,
                dateTimeDisplay: new Date(injection.dateTime).toISOString(),
                site: injection.injectionSite,
                halfLifeMinutes: injection.halfLifeMinutes
              }))}
            />

          </ScrollView>
        );
      case "history":
        return <InjectionHistory />;
      case "stats":
        return <StatisticsDashboard />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-900"
      style={{ paddingTop: insets.top }}
    >

      {/* Main Content */}
      <View className="flex-1">{renderContent()}</View>

      {/* Bottom Navigation */}
      <View className="flex-row bg-gray-800 px-2 py-2">
        <TouchableOpacity
          className={`flex-1 items-center py-2 ${activeTab === "home" ? "bg-gray-700 rounded-lg" : ""}`}
          onPress={() => {
            setShowInjectionForm(false);
            setActiveTab("home");
          }}
        >
          <Plus
            size={24}
            color={activeTab === "home" ? "#60a5fa" : "#9ca3af"}
          />
          <Text
            className={activeTab === "home" ? "text-blue-400" : "text-gray-400"}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center py-2 ${activeTab === "history" ? "bg-gray-700 rounded-lg" : ""}`}
          onPress={() => {
            setShowInjectionForm(false);
            setActiveTab("history");
          }}
        >
          <Calendar
            size={24}
            color={activeTab === "history" ? "#60a5fa" : "#9ca3af"}
          />
          <Text
            className={
              activeTab === "history" ? "text-blue-400" : "text-gray-400"
            }
          >
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center py-2 ${activeTab === "stats" ? "bg-gray-700 rounded-lg" : ""}`}
          onPress={() => {
            setShowInjectionForm(false);
            setActiveTab("stats");
          }}
        >
          <BarChart3
            size={24}
            color={activeTab === "stats" ? "#60a5fa" : "#9ca3af"}
          />
          <Text
            className={
              activeTab === "stats" ? "text-blue-400" : "text-gray-400"
            }
          >
            Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 items-center py-2 ${activeTab === "settings" ? "bg-gray-700 rounded-lg" : ""}`}
          onPress={() => {
            setShowInjectionForm(false);
            setActiveTab("settings");
          }}
        >
          <Settings
            size={24}
            color={activeTab === "settings" ? "#60a5fa" : "#9ca3af"}
          />
          <Text
            className={
              activeTab === "settings" ? "text-blue-400" : "text-gray-400"
            }
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
