import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Plus, Calendar, BarChart3, Settings } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Import components
import InjectionForm from "./components/InjectionForm";
import InjectionHistory from "./components/InjectionHistory";
import StatisticsDashboard from "./components/StatisticsDashboard";

// Mock data for recent injections
const mockRecentInjections = [
  {
    id: "1",
    medication: "Testosterone Cypionate 250",
    dosage: "100mg",
    date: "2025-06-15 08:30 AM",
    site: "Left Glute",
  },
  {
    id: "2",
    medication: "Testosterone Cypionate 250",
    dosage: "100 mg",
    date: "2025-06 11  09:15 AM",
    site: "Right Glute",
  },
  {
    id: "3",
    medication: "Testosterone Cypionate 250",
    dosage: "100mg",
    date: "2025-06-7 08:30 AM",
    site: "Left Glute",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("home");
  const [showInjectionForm, setShowInjectionForm] = useState(false);

  const renderContent = () => {
    if (showInjectionForm) {
      return (
        <InjectionForm
          onClose={() => setShowInjectionForm(false)}
          onSave={(data) => {
            // Handle saving injection data
            console.log("Saving injection data:", data);
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
                MediTrack
              </Text>
              <Text className="text-gray-400">
                Track your medication easily
              </Text>
            </View>

            {/* Add Injection Button */}
            <TouchableOpacity
              onPress={() => setShowInjectionForm(true)}
              className="mb-6"    
                        
            >
              <LinearGradient
                colors={["#4c669f", "#3b5998", "#192f6a"]}
                className="rounded-xl py-4 px-6 flex-row items-center justify-center"                
              >
                
                <View style={{flexDirection:'row'}} className="p-4">
                  <Plus size={24} color="white" />
                  <Text className="text-white text-lg font-semibold ml-2">
                    Add Injection
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Recent Injections */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-white mb-3">
                Next Injection
              </Text>
              <View
                className="bg-gray-800 rounded-lg p-4 mb-3"
              >
                <View className="flex-row justify-between">
                  <Text className="text-white font-semibold">
                    Testosterone Cypionate 250
                  </Text>
                  <Text className="text-gray-400">80mg</Text>
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-400">Left Glute</Text>
                  <Text className="text-gray-400">2025-06-18 08:30AM</Text>
                </View>
              </View>
            </View>

            {/* Recent Injections */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-white mb-3">
                Recent Injections
              </Text>
              {mockRecentInjections.map((injection) => (
                <View
                  key={injection.id}
                  className="bg-gray-800 rounded-lg p-4 mb-3"
                >
                  <View className="flex-row justify-between">
                    <Text className="text-white font-semibold">
                      {injection.medication}
                    </Text>
                    <Text className="text-gray-400">{injection.dosage}</Text>
                  </View>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-gray-400">{injection.site}</Text>
                    <Text className="text-gray-400">{injection.date}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Quick Stats */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-white mb-3">
                Quick Stats
              </Text>
              <View className="flex-row justify-between">
                <View className="bg-gray-800 rounded-lg p-4 flex-1 mr-2 items-center">
                  <Text className="text-2xl font-bold text-blue-400">12</Text>
                  <Text className="text-gray-400">Last Week</Text>
                </View>
                <View className="bg-gray-800 rounded-lg p-4 flex-1 ml-2 items-center">
                  <Text className="text-2xl font-bold text-purple-400">42</Text>
                  <Text className="text-gray-400">Last 30 days</Text>
                </View>
              </View>
            </View>
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
      <StatusBar barStyle="light-content" backgroundColor="#111827" />


      {/* Main Content */}
      <View className="flex-1">{renderContent()}</View>

      {/* Bottom Navigation */}
      <View className="flex-row bg-gray-800 px-2 py-2">
        <TouchableOpacity
          className={`flex-1 items-center py-2 ${activeTab === "home" ? "bg-gray-700 rounded-lg" : ""}`}
          onPress={() => setActiveTab("home")}
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
          onPress={() => setActiveTab("history")}
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
          onPress={() => setActiveTab("stats")}
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
          onPress={() => setActiveTab("settings")}
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
