import React from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { BarChart, LineChart } from "react-native-chart-kit";
import { Calendar, Clock, Syringe, Activity } from "lucide-react-native";

interface StatisticsDashboardProps {
  injectionData?: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    dateTime: string;
    site: string;
  }>;
}

const StatisticsDashboard = ({
  injectionData = [],
}: StatisticsDashboardProps) => {
  // Default mock data if no data is provided
  const mockData = [
    {
      id: "1",
      medicationName: "Insulin",
      dosage: "10 units",
      dateTime: "2023-05-01T08:00:00",
      site: "left_arm",
    },
    {
      id: "2",
      medicationName: "Insulin",
      dosage: "10 units",
      dateTime: "2023-05-02T08:00:00",
      site: "right_arm",
    },
    {
      id: "3",
      medicationName: "Vitamin B12",
      dosage: "1000 mcg",
      dateTime: "2023-05-03T10:00:00",
      site: "left_thigh",
    },
    {
      id: "4",
      medicationName: "Insulin",
      dosage: "10 units",
      dateTime: "2023-05-04T08:00:00",
      site: "abdomen",
    },
    {
      id: "5",
      medicationName: "Vitamin B12",
      dosage: "1000 mcg",
      dateTime: "2023-05-05T10:00:00",
      site: "right_thigh",
    },
    {
      id: "6",
      medicationName: "Insulin",
      dosage: "10 units",
      dateTime: "2023-05-06T08:00:00",
      site: "left_arm",
    },
  ];

  const data = injectionData.length > 0 ? injectionData : mockData;

  // Process data for charts
  const medicationCounts: Record<string, number> = {};
  const siteCounts: Record<string, number> = {};
  const dateData: Record<string, number> = {};

  data.forEach((injection) => {
    // Count medications
    medicationCounts[injection.medicationName] =
      (medicationCounts[injection.medicationName] || 0) + 1;

    // Count sites
    siteCounts[injection.site] = (siteCounts[injection.site] || 0) + 1;

    // Group by date for timeline
    const date = injection.dateTime.split("T")[0];
    dateData[date] = (dateData[date] || 0) + 1;
  });

  // Prepare data for bar chart
  const medicationChartData = {
    labels: Object.keys(medicationCounts),
    datasets: [
      {
        data: Object.values(medicationCounts),
      },
    ],
  };

  // Prepare data for line chart
  const dates = Object.keys(dateData).sort();
  const lineChartData = {
    labels: dates.map((date) => date.substring(5)), // Show only MM-DD
    datasets: [
      {
        data: dates.map((date) => dateData[date]),
        color: () => "#8884d8",
        strokeWidth: 2,
      },
    ],
    legend: ["Injections"],
  };

  // Prepare site frequency data for body diagram visualization
  const siteFrequencyData = Object.entries(siteCounts).map(([site, count]) => ({
    site,
    frequency: count,
  }));

  const screenWidth = Dimensions.get("window").width - 32; // Account for padding

  const chartConfig = {
    backgroundGradientFrom: "#1E1E1E",
    backgroundGradientTo: "#1E1E1E",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#8884d8",
    },
  };

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <View className="mb-6">
        <View className="flex-row items-center mb-2">
          <Activity size={24} color="#8884d8" />
          <Text className="text-white text-xl font-bold ml-2">
            Statistics Dashboard
          </Text>
        </View>
        <Text className="text-gray-400">
          View insights about your injection patterns
        </Text>
      </View>

      {/* Injection Site Heatmap */}
      <View className="bg-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-white text-lg font-semibold mb-4">
          Injection Site Frequency
        </Text>
        <View className="items-center">
          {/* Body diagram visualization placeholder */}
          <View className="w-64 h-80 bg-gray-700 rounded-lg items-center justify-center">
            <Text className="text-white text-center">
              Body Diagram Visualization
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              {Object.entries(siteCounts)
                .map(([site, count]) => `${site}: ${count}`)
                .join(", ")}
            </Text>
          </View>
        </View>
      </View>

      {/* Medication Usage Chart */}
      <View className="bg-gray-800 rounded-lg p-4 mb-6">
        <View className="flex-row items-center mb-4">
          <Syringe size={20} color="#8884d8" />
          <Text className="text-white text-lg font-semibold ml-2">
            Medication Usage
          </Text>
        </View>
        <BarChart
          data={medicationChartData}
          width={screenWidth}
          height={220}
          yAxisLabel=""
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          fromZero
        />
      </View>

      {/* Injection Timeline */}
      <View className="bg-gray-800 rounded-lg p-4 mb-6">
        <View className="flex-row items-center mb-4">
          <Calendar size={20} color="#8884d8" />
          <Text className="text-white text-lg font-semibold ml-2">
            Injection Timeline
          </Text>
        </View>
        <LineChart
          data={lineChartData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier={true}
        />
      </View>

      {/* Summary Stats */}
      <View className="bg-gray-800 rounded-lg p-4 mb-6">
        <Text className="text-white text-lg font-semibold mb-4">Summary</Text>
        <View className="flex-row justify-between">
          <View className="items-center p-3 bg-gray-700 rounded-lg flex-1 mr-2">
            <Text className="text-gray-400 mb-1">Total Injections</Text>
            <Text className="text-white text-xl font-bold">{data.length}</Text>
          </View>
          <View className="items-center p-3 bg-gray-700 rounded-lg flex-1 ml-2">
            <Text className="text-gray-400 mb-1">Medications</Text>
            <Text className="text-white text-xl font-bold">
              {Object.keys(medicationCounts).length}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-between mt-4">
          <View className="items-center p-3 bg-gray-700 rounded-lg flex-1 mr-2">
            <Text className="text-gray-400 mb-1">Sites Used</Text>
            <Text className="text-white text-xl font-bold">
              {Object.keys(siteCounts).length}
            </Text>
          </View>
          <View className="items-center p-3 bg-gray-700 rounded-lg flex-1 ml-2">
            <Text className="text-gray-400 mb-1">Last Injection</Text>
            <Text className="text-white text-xl font-bold">
              {data.length > 0
                ? new Date(data[data.length - 1].dateTime).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default StatisticsDashboard;
