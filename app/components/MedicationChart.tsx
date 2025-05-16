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
    halfLifeMinutes?: number;
  }>;
}

type TimePeriod = "week" | "month" | "year";

interface ChartDataPoint {
  x: Date;
  y: number;
}

interface TotalsByDate {
  [key: string]: ChartDataPoint;
}

const MedicationChart = ({ injectionData = [] }: MedicationChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");
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
    // Group medications
    const medications = [...new Set(injectionData.map(item => item.medicationName))];
    const testosteroneMedications = medications.filter(med => 
      med.toLowerCase().includes('testosterone')
    );

    // Only include total T line if there are multiple testosterone medications
    const shouldShowTotalT = testosteroneMedications.length > 1;

    // Process data for each medication
    const medicationData = medications.map(medication => {
      const data = injectionData
        .filter(item => item.medicationName === medication)
        .map(item => ({
          x: new Date(item.dateTime),
          y: item.dosage
        }))
        .sort((a, b) => a.x.getTime() - b.x.getTime());

      return {
        medication,
        data
      };
    });

    // Calculate total testosterone if needed
    let totalTData: ChartDataPoint[] = [];
    if (shouldShowTotalT) {
      const testosteroneInjections = injectionData
        .filter(item => testosteroneMedications.includes(item.medicationName))
        .map(item => ({
          x: new Date(item.dateTime),
          y: item.dosage,
          medication: item.medicationName
        }))
        .sort((a, b) => a.x.getTime() - b.x.getTime());

      // Group by date and sum dosages
      const totalsByDate: TotalsByDate = testosteroneInjections.reduce((acc, curr) => {
        const dateKey = curr.x.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = { x: curr.x, y: 0 };
        }
        acc[dateKey].y += curr.y;
        return acc;
      }, {} as TotalsByDate);

      totalTData = Object.values(totalsByDate);
    }

    // Return all datasets
    return [
      ...medicationData,
      ...(shouldShowTotalT ? [{
        medication: 'Total Testosterone',
        data: totalTData
      }] : [])
    ];
  }, [injectionData]);

  // Generate colors for each medication line
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c", "#ff0000"]; // Added red color for Total T

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
          itemsPerRow={2}
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
