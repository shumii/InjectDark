import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  Platform,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, Calendar, BarChart3, Settings, Trash2, AlertCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

// Import components
import InjectionForm from "./components/InjectionForm";
import InjectionHistory from "./components/InjectionHistory";
import StatisticsDashboard from "./components/StatisticsDashboard";
import MedicationChart from "./components/MedicationChart";
import { InjectionData } from "./components/InjectionForm";
import MedicationManagementScreen from "./components/MedicationManagementScreen";

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

  // Settings state
  const [defaultDosageUnit, setDefaultDosageUnit] = useState<'mg' | 'ml'>('mg');
  const [useCurrentTime, setUseCurrentTime] = useState(true);
  const [defaultInjectionTime, setDefaultInjectionTime] = useState(() => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    return defaultTime;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [selectedInjectionId, setSelectedInjectionId] = useState<string | null>(null);

  const [showMedicationManagement, setShowMedicationManagement] = useState(false);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedUnit = await AsyncStorage.getItem('defaultDosageUnit');
        if (storedUnit) {
          setDefaultDosageUnit(storedUnit as 'mg' | 'ml');
        }

        const storedTimeSettings = await AsyncStorage.getItem('defaultTimeSettings');
        if (storedTimeSettings) {
          const { useCurrent, time } = JSON.parse(storedTimeSettings);
          setUseCurrentTime(useCurrent);
          if (time) {
            setDefaultInjectionTime(new Date(time));
          }
        } else {
          // If no time settings are stored, set default to 09:00
          const defaultTime = new Date();
          defaultTime.setHours(9, 0, 0, 0);
          setDefaultInjectionTime(defaultTime);
          // Save the default time settings
          saveDefaultTimeSettings(defaultTime, useCurrentTime);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (unit: 'mg' | 'ml') => {
    try {
      await AsyncStorage.setItem('defaultDosageUnit', unit);
      setDefaultDosageUnit(unit);
    } catch (error) {
      console.error('Error saving dosage unit:', error);
    }
  };

  const saveDefaultTimeSettings = async (time: Date, useCurrent: boolean) => {
    try {
      const timeSettings = {
        useCurrent,
        time: useCurrent ? null : time.toISOString()
      };
      await AsyncStorage.setItem('defaultTimeSettings', JSON.stringify(timeSettings));
      setUseCurrentTime(useCurrent);
      setDefaultInjectionTime(time);
    } catch (error) {
      console.error('Error saving time settings:', error);
    }
  };

  // Reset all injection data
  const resetAllData = async () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure you want to delete all injection records? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("injections");
              setAllInjections([]);
              setRecentInjections([]);
              Alert.alert("Success", "All injection data has been deleted.");
            } catch (error) {
              console.error("Error resetting data:", error);
              Alert.alert("Error", "Failed to reset data. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Helper function to format date and time in a Facebook-style format
  const formatRelativeDateTime = (dateTime: Date | string) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    // Use calendar date difference for days
    const getDateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffInDays = Math.floor((getDateOnly(now).getTime() - getDateOnly(date).getTime()) / (1000 * 60 * 60 * 24));

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
    if (diffInHours < 24 && diffInDays === 0) {
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

  // Helper function to format future dates
  const formatFutureDateTime = (dateTime: Date | string) => {
    const date = new Date(dateTime);
    const now = new Date();
    
    // If date is in the past, use the past formatter
    if (date.getTime() <= now.getTime()) {
      return formatRelativeDateTime(dateTime);
    }
    
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    const timeString = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });

    // Coming up in less than 1 minute
    if (diffInSeconds < 60) {
      return "Coming up now";
    }
    // Coming up in minutes: less than 1 hour
    if (diffInMinutes < 60) {
      return `In ${diffInMinutes}m`;
    }
    // Coming up in hours: less than 24 hours
    if (diffInHours < 24) {
      return `In ${diffInHours}h`;
    }
    // Tomorrow at TIME
    if (diffInDays === 1) {
      return `Tomorrow at ${timeString}`;
    }
    // Days in future (2-7 days): include time
    if (diffInDays < 7) {
      return `In ${diffInDays}d at ${timeString}`;
    }
    // Full date for further future
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

  // Export injection data as JSON
  const exportInjectionData = async () => {
    try {
      const storedInjections = await AsyncStorage.getItem("injections");
      if (!storedInjections) {
        Alert.alert("No Data", "There is no injection data to export.");
        return;
      }
      const fileUri = FileSystem.documentDirectory + "injections-export.json";
      await FileSystem.writeAsStringAsync(fileUri, storedInjections, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Exported", "File saved to: " + fileUri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to export data: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Import injection data from JSON
  const importInjectionData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
        // Optionally validate JSON here
        await AsyncStorage.setItem('injections', fileContent);
        Alert.alert('Success', 'Injection data imported successfully!');
        await loadInjections(); // Refresh data in app
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import data: ' + (error instanceof Error ? error.message : String(error)));
    }
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
          defaultDosageUnit={defaultDosageUnit}
          defaultInjectionTime={defaultInjectionTime}
          useCurrentTime={useCurrentTime}
        />
      );
    }

    switch (activeTab) {
      case "home":
        return (
          <ScrollView className="flex-1 px-4">
            <View className="mt-4 mb-6">
              <Text className="text-2xl font-bold text-white mb-1">
                PINN
              </Text>
              <Text className="text-gray-400">
                Track your testosterone replacement therapy 
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
                        {formatFutureDateTime(nextInjection.dateTime)}
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
                <TouchableOpacity
                   key={injection.id}
                  onPress={() => {
                    setSelectedInjectionId(injection.id);
                    setActiveTab("history");
                  }}
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
                </TouchableOpacity>
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
        return <InjectionHistory selectedInjectionId={selectedInjectionId || undefined} />;
      case "stats":
        return <StatisticsDashboard />;
      case "settings":
        return (
          <ScrollView className="flex-1 px-4">
            <View className="mt-4 mb-6">
              <Text className="text-2xl font-bold text-white mb-1">
                Settings
              </Text>
              <Text className="text-gray-400">
                
              </Text>
                </View>

            {/* Default Dosage Unit Setting */}
            <View className="mb-6 bg-gray-800 rounded-lg p-4">
              <Text className="text-white text-lg font-semibold mb-4">
                Default Dosage Unit
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-white">Toggle between mg and ml</Text>
                <View className="flex-row items-center">
                  <Text className={`mr-2 ${defaultDosageUnit === 'mg' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>mg</Text>
                  <Switch
                    trackColor={{ false: "#3b82f6", true: "#3b82f6" }}
                    thumbColor="#ffffff"
                    ios_backgroundColor="#3b82f6"
                    onValueChange={() => saveSettings(defaultDosageUnit === 'mg' ? 'ml' : 'mg')}
                    value={defaultDosageUnit === 'ml'}
                  />
                  <Text className={`ml-2 ${defaultDosageUnit === 'ml' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>ml</Text>
                </View>
              </View>
              <Text className="text-gray-400 mt-2 text-sm">
                This will be the default unit when adding a new injection
              </Text>
            </View>

            {/* Default Time Setting */}
            <View className="mb-6 bg-gray-800 rounded-lg p-4">
              <Text className="text-white text-lg font-semibold mb-4">
                Default Injection Time
              </Text>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white">Use Current Time</Text>
                <TouchableOpacity
                  onPress={() => saveDefaultTimeSettings(defaultInjectionTime, !useCurrentTime)}
                  className={`w-12 h-6 rounded-full ${
                    useCurrentTime ? 'bg-blue-500' : 'bg-gray-700'
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white absolute ${
                      useCurrentTime ? 'right-1' : 'left-1'
                    } top-0.5`}
                  />
                </TouchableOpacity>
              </View>
              
              {!useCurrentTime && (
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="bg-gray-700 p-3 rounded-lg"
                >
                  <Text className="text-white text-center">
                    {defaultInjectionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              )}

              {showTimePicker && (
                <Modal
                  transparent={true}
                  animationType="fade"
                  visible={showTimePicker}
                  onRequestClose={() => setShowTimePicker(false)}
                >
                  <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      borderTopLeftRadius: 10,
                      borderTopRightRadius: 10,
                      paddingBottom: 20,
                    }}>
                      <View style={{padding: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e5e5e5'}}>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={{color: '#007AFF', fontSize: 16}}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={{fontWeight: 'bold', fontSize: 16}}>Select Time</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Text style={{color: '#007AFF', fontSize: 16}}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{width: '100%', alignItems: 'center', paddingVertical: 20}}>
                        <DateTimePicker
                          testID="timePicker"
                          value={defaultInjectionTime}
                          mode="time"
                          display="spinner"
                          onChange={(event: any, selectedTime?: Date) => {
                            setShowTimePicker(Platform.OS === 'ios');
                            if (selectedTime) {
                              saveDefaultTimeSettings(selectedTime, useCurrentTime);
                            }
                          }}
                          style={{
                            width: '100%',
                          }}
                        />
                      </View>
                    </View>
                  </View>
                </Modal>
              )}
              <Text className="text-gray-400 mt-2 text-sm">
                This will be the default time when adding a new injection
              </Text>
            </View>
            
            {/* Data Management */}
            <View className="mb-6 bg-gray-800 rounded-lg p-4">
              <Text className="text-white text-lg font-semibold mb-4">
                Data Management
              </Text>
              <TouchableOpacity
                onPress={resetAllData}
                className="bg-red-500/10 py-4 px-6 rounded-md flex-row items-center justify-center"
              >
                <AlertCircle size={20} color="#ef4444" className="mr-2" />
                <Text className="text-red-500 font-bold ml-2">
                  Reset All Injection Data
                </Text>
              </TouchableOpacity>
              <Text className="text-gray-400 mt-2 text-sm">
                Warning: This will permanently delete all your injection records
              </Text>
              <TouchableOpacity
                onPress={exportInjectionData}
                className="bg-blue-500 py-3 px-4 rounded-lg mt-4"
              >
                <Text className="text-white text-center font-semibold">Export Injection Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={importInjectionData}
                className="bg-blue-500 py-3 px-4 rounded-lg mt-2"
              >
                <Text className="text-white text-center font-semibold">Import Injection Data</Text>
              </TouchableOpacity>
            </View>

            {/* Medication Management */}
            <View className="mb-6 bg-gray-800 rounded-lg p-4">
              <Text className="text-white text-lg font-semibold mb-4">
                Medication Management
              </Text>
              <TouchableOpacity
                className="bg-blue-600 py-3 px-4 rounded-lg mt-2"
                onPress={() => setShowMedicationManagement(true)}
              >
                <Text className="text-white text-center font-semibold">Manage Medications</Text>
              </TouchableOpacity>
            </View>

            {/* App Information */}
            <View className="mb-6 bg-gray-800 rounded-lg p-4">
              <Text className="text-white text-lg font-semibold mb-2">
                App Information
              </Text>
              <Text className="text-gray-400 mb-1">
                Version: 1.0.0
              </Text>
              <Text className="text-gray-400">
                © 2025 PINN
              </Text>
            </View>
          </ScrollView>
        );
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

      {/* Medication Management Modal */}
      <Modal visible={showMedicationManagement} animationType="slide">
        <MedicationManagementScreen />
        <TouchableOpacity
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
          onPress={() => setShowMedicationManagement(false)}
        >
          <Text style={{ color: '#fff', fontSize: 18, backgroundColor: '#222', padding: 10, borderRadius: 8 }}>Close</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
