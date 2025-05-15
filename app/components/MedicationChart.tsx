import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryLegend,
  VictoryTheme,
} from "victory-native";
import { Calendar } from "lucide-react-native";

interface MedicationChartProps {
  injectionData?: Array<{
    id: string;
    medicationName: string;
    dosage: number;
    dateTime: Date;
    dateTimeDisplay:string;
    site: string;
  }>;
}

type TimePeriod = "week" | "month" | "year";

const MedicationChart = ({ injectionData = [] }: MedicationChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("week");
  const screenWidth = Dimensions.get("window").width - 32; // Account for padding

  // Get current date and calculate date ranges
  const currentDate = new Date();
  const periodRanges = {
    week: 7,
    month: 30,
    year: 365,
  };

  // Filter data based on selected time period
  const filteredData = useMemo(() => {
    const periodDays = periodRanges[selectedPeriod];
    const cutoffDate = new Date();
    cutoffDate.setDate(currentDate.getDate() - periodDays);

    return injectionData.filter((injection) => {
      const injectionDate = new Date(injection.dateTime);
      return injectionDate >= cutoffDate;
    });
  }, [injectionData, selectedPeriod]);

  // Process data for chart
  const chartData = useMemo(() => {
    // Group injections by medication name and date
    const medicationMap: Record<string, Record<string, number>> = {};
    const medications = new Set<string>();

    filteredData.forEach((injection) => {
       
      const medicationName = injection.medicationName;
      const date = injection.dateTime.split("T")[0];

      medications.add(medicationName);

      if (!medicationMap[medicationName]) {
        medicationMap[medicationName] = {};
      }

      medicationMap[medicationName][date] = injection.dosage;
    });

    // Generate date range for x-axis
    const dateRange: string[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - periodRanges[selectedPeriod]);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dateRange.push(d.toISOString().split("T")[0]);
    }

    // Create dataset for each medication
    return Array.from(medications).map((medication) => {
      return {
        medication,
        data: dateRange.map((date) => ({
          x: date,
          y: medicationMap[medication]?.[date] || 0,
        })),
      };
    });
  }, [filteredData, selectedPeriod]);

  // Generate colors for each medication line
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c"];

  // Format x-axis labels based on selected period
  const formatXAxisLabel = (date: string) => {
    const d = new Date(date);
    if (selectedPeriod === "week") {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    } else if (selectedPeriod === "month") {
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
    } else {
      return d.toLocaleDateString(undefined, { month: "short" });
    }
  };

  // Generate legend data
  const legendData = chartData.map((item, index) => ({
    name: item.medication,
    symbol: { fill: colors[index % colors.length] },
  }));

  return (
    <View className="bg-gray-800 rounded-lg p-4 mb-6">
      <View className="flex-row items-center mb-4">
        <Calendar size={20} color="#8884d8" />
        <Text className="text-white text-lg font-semibold ml-2">
          Testosterone Levels
        </Text>
      </View>

      {/* Period selection buttons */}
      <View className="flex-row justify-center mb-4">
        {(["week", "month", "year"] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            onPress={() => setSelectedPeriod(period)}
            className={`px-4 py-2 mx-1 rounded-full ${selectedPeriod === period ? "bg-purple-600" : "bg-gray-700"}`}
          >
            <Text className="text-white capitalize">{period}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={{ height: 250 }}>
        {chartData.length > 0 ? (
          <VictoryChart
            width={screenWidth}
            height={250}
            theme={VictoryTheme.material}
            domainPadding={{ y: 10 }}
            padding={{ top: 10, bottom: 50, left: 30, right: 30 }}
          >
            <VictoryAxis
              tickFormat={formatXAxisLabel}
              style={{
                tickLabels: {
                  fill: "white",
                  fontSize: 8,
                  angle: 45,
                  textAnchor: "start",
                },
                grid: { stroke: "transparent" },
                axis: { stroke: "transparent" },
              }}
              tickCount={
                selectedPeriod === "week"
                  ? 7
                  : selectedPeriod === "month"
                    ? 10
                    : 12
              }
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => Math.round(t)}
              style={{
                tickLabels: { fill: "white", fontSize: 10 },
                ticks:{stroke:"transparent"},
                grid: { stroke: "transparent" },
                axis: { stroke: "transparent" },
              }}
            />
            {chartData.map((dataset, index) => (
              <VictoryLine
                key={dataset.medication}
                data={dataset.data}
                style={{
                  data: {
                    stroke: colors[index % colors.length],
                    strokeWidth: 2,
                  },
                }}
                interpolation="monotoneX"
              />
            ))}
          </VictoryChart>
        ) : (
          <View className="items-center justify-center h-full">
            <Text className="text-gray-400">
              No data available for this period
            </Text>
          </View>
        )}
      </View>

      {/* Legend */}
      {chartData.length > 0 && (
        <VictoryLegend
          x={50}
          y={0}
          width={screenWidth}
          height={50}
          centerTitle
          orientation="horizontal"
          style={{
            labels: { fill: "white", fontSize: 10 },
          }}
          data={legendData}
        />
      )}
    </View>
  );
};

export default MedicationChart;
