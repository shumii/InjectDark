import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryLegend,
  VictoryTheme,
  VictoryGroup,
  VictoryScatter,
  VictoryTooltip,
} from "victory-native";
import { Calendar } from "lucide-react-native";

interface MedicationChartProps {
  injectionData?: Array<{
    id: string;
    medicationName: string;
    dosage: number;
    dateTime: Date;
    dateTimeDisplay: string;
    site: string;
    halfLifeMinutes?: number;
  }>;
}

type TimePeriod = "week" | "month" | "quarter" | "year";

const MedicationChart = ({ injectionData = [] }: MedicationChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("quarter");
  const [maxTestosterone, setMaxTestosterone] = useState(0);
  const [minTestosterone, setMinTestosterone] = useState(0);
  const [averageTestosterone, setAverageTestosterone] = useState(0);

  const screenWidth = Dimensions.get("window").width - 32; // Account for padding

  // Get current date and calculate date ranges
  const currentDate = new Date();
  const periodRanges = {
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };

  // Calculate all testosterone levels first, before filtering
  const allTestosteroneLevels = useMemo(() => {
    // Generate full date range for calculations
    const fullDateRange: string[] = [];
    const endDate = new Date();
    const startDate = new Date();
    // Use the largest period for calculations to ensure we capture all relevant data
    startDate.setDate(endDate.getDate() - periodRanges.year); // Use 'year' as it's the longest period

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      fullDateRange.push(d.toISOString().split("T")[0]);
    }

    // Group injections by medication name and calculate daily testosterone levels
    const fullMedicationMap: Record<string, Record<string, number>> = {};
    const allMedications = new Set<string>();

    // Initialize medication map with all dates
    injectionData.forEach((injection) => {
      const medicationName = injection.medicationName;
      allMedications.add(medicationName);
      if (!fullMedicationMap[medicationName]) {
        fullMedicationMap[medicationName] = {};
        // Initialize all dates with 0
        fullDateRange.forEach(date => {
          fullMedicationMap[medicationName][date] = 0;
        });
      }
    });

    // Calculate testosterone levels for each day using ALL injections
    injectionData.forEach((injection) => {      
      const medicationName = injection.medicationName;
      const injectionDate = new Date(injection.dateTime);
      const halfLifeMinutes = injection.halfLifeMinutes || 0;

      if (halfLifeMinutes > 0) {
        // Process each day from injection date
        fullDateRange.forEach(date => {
          const currentDate = new Date(date);
          //currentDate.setHours(23, 59, 59, 999);
          currentDate.setHours(injectionDate.getHours(), injectionDate.getMinutes(), injectionDate.getSeconds(), injectionDate.getMilliseconds());

          // Calculate minutes difference
          const minutesDiff = (currentDate.getTime() - injectionDate.getTime()) / (1000 * 60);

          if (minutesDiff >= 0) { // Only calculate for times after the injection
            // Calculate remaining testosterone using half-life decay
            const halfLifePeriods = minutesDiff / halfLifeMinutes;
            const decayFactor = Math.pow(0.5, halfLifePeriods);
            const levelForThisInjection = injection.dosage * decayFactor;

            // Add this level to any existing level for this day
            fullMedicationMap[medicationName][date] += levelForThisInjection;
          }
        });
      }
    });

    // Add Total T to the medication map
    // fullMedicationMap['Total T'] = fullTotalTLevels;
    // allMedications.add('Total T');

    return {
      medicationMap: fullMedicationMap,
      medications: allMedications,
      dateRange: fullDateRange
    };
  }, [injectionData]); // Only depend on injectionData, not the selected period

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

  const filteredTLevels = useMemo(() => {    
    const periodDays = periodRanges[selectedPeriod];
    const cutoffDate = new Date();
    cutoffDate.setDate(currentDate.getDate() - periodDays);
    const allTLevelsMap = allTestosteroneLevels.medicationMap;
    const allDates = allTestosteroneLevels.dateRange;
    const allMedications = allTestosteroneLevels.medications;

    const filteredTLevels: Record<string, Record<string, number>> = {};
    allMedications.forEach((medication) => {
      filteredTLevels[medication] = {};

      allDates.forEach((date) => {
        filteredTLevels[medication][date] = 0;
      });
    });

    allMedications.forEach((medication) => {
      allDates.forEach((date) => {
        const dateObj = new Date(date);
        if (dateObj >= cutoffDate) {

          // need to add the medication here somehow
          filteredTLevels[medication][date] = allTLevelsMap[medication][date];
        }
      });
    });

    return filteredTLevels;
  }, [allTestosteroneLevels, selectedPeriod]);

  // Calculate quick stats
  const quickStats = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(currentDate.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    const lastWeekCount = injectionData.filter(injection => {
      const injectionDate = new Date(injection.dateTime);
      return injectionDate >= oneWeekAgo;
    }).length;

    const lastThirtyDaysCount = injectionData.filter(injection => {
      const injectionDate = new Date(injection.dateTime);
      return injectionDate >= thirtyDaysAgo;
    }).length;

    // const filteredData = injectionData.filter(injection => {
    //   const injectionDate = new Date(injection.dateTime);
    //   return injectionDate >= thirtyDaysAgo;
    // });

    const data = filteredData;
    const maxDosage = Math.max(...data.map(injection => injection.dosage));
    const minDosage = Math.min(...data.map(injection => injection.dosage));
    const averageDosage = data.reduce((acc, injection) => acc + injection.dosage, 0) / data.length;
    const totalDosage = data.reduce((acc, injection) => acc + injection.dosage, 0);

    return {
      lastWeekCount,
      lastThirtyDaysCount,
      maxDosage,
      minDosage,
      averageDosage,
      totalDosage
    };
  }, [injectionData, currentDate, selectedPeriod]);

  // Process data for chart
  const chartData = useMemo(() => {
    // Group injections by medication name and calculate daily testosterone levels
    //const medicationMap: Record<string, Record<string, number>> = {};
    const medications = new Set<string>();

    const periodDays = periodRanges[selectedPeriod];

    // Generate date range for x-axis first
    const dateRange: string[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (periodRanges[selectedPeriod] - 1)); // Subtract (period - 1) to include today
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dateRange.push(d.toISOString().split("T")[0]);
    }


    const medicationMap = filteredTLevels;

    Object.keys(medicationMap).forEach((medication) => {
      medications.add(medication);
    });

    // if only 1 we take quick stats from data, otherwise we take it from the total t
if (Object.values(medicationMap).length > 0)
{
    var maxTestosterone = Math.max(...Object.values(medicationMap).map(levels => Math.max(...Object.values(levels))));
    var minTestosterone = Math.min(...Object.values(medicationMap).map(levels => Math.min(...Object.values(levels))));
    
    var sumTLevels = Object.values(Object.values(medicationMap)[0]).reduce((sum, level) => sum + level, 0);
    var averageTestosterone = sumTLevels / periodDays;
    // var averageTestosterone = Object.values(medicationMap)[0] ? 
    //   Object.values(Object.values(medicationMap)[0]).reduce((sum, level) => sum + level, 0) / Object.values(Object.values(medicationMap)[0]).length : 0;

    setMaxTestosterone(maxTestosterone);
    setMinTestosterone(minTestosterone);
    setAverageTestosterone(averageTestosterone);

    if (medications.size > 1) {
      // Calculate Total T by summing up all testosterone medications for each date
      const totalTLevels: Record<string, number> = {};
      dateRange.forEach(date => {
        totalTLevels[date] = 0;
        Object.entries(medicationMap).forEach(([medicationName, levels]) => {
          if (medicationName.toLowerCase().includes('testosterone')) {
            totalTLevels[date] += levels[date];
          }
        });
      });

      
      var sumTotalTLevels = Object.values(totalTLevels).reduce((sum, level) => sum + level, 0);
      var averageTotalTLevels = sumTotalTLevels / periodDays;
      var maxTotalTLevels = Math.max(...Object.values(totalTLevels));
      var minTotalTLevels = Math.min(...Object.values(totalTLevels));

      setMaxTestosterone(maxTotalTLevels);
      setMinTestosterone(minTotalTLevels);
      setAverageTestosterone(averageTotalTLevels);

      // Add Total T to the medication map
      medicationMap['Total T'] = totalTLevels;
      medications.add('Total T');
    }
    }

    // Create dataset for each medication
    const finalData = Array.from(medications).map((medication) => {
      return {
        medication,
        data: dateRange.map((date) => ({
          x: date,
          y: Math.round(medicationMap[medication]?.[date] || 0),
        })),
      };
    });

    console.log('Final chart data used:', finalData);
    return finalData;
  }, [filteredData, selectedPeriod, filteredTLevels]);

  // Generate colors for each medication line
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#a4de6c", "#ff0000"]; // Added red color for Total T

  // Format x-axis labels based on selected period
  const formatXAxisLabel = (date: string) => {
    const d = new Date(date);
    if (selectedPeriod === "week") {
      return d.toLocaleDateString(undefined, { weekday: "short" });
    } else if (selectedPeriod === "month" || selectedPeriod === "quarter") {
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
        {(["week", "month", "quarter", "year"] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            onPress={() => setSelectedPeriod(period)}
            className={`px-4 py-2 mx-1 rounded-full ${selectedPeriod === period ? "bg-purple-600" : "bg-gray-700"}`}
          >
            <Text className="text-white capitalize">{period === "quarter" ? "90 Days" : period}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={{ height: 250 }}>
        {chartData.length > 0 ? (
          selectedPeriod === 'year' ? (
            <ScrollView horizontal>
              <VictoryChart
                width={screenWidth * 1.6}
                height={250}
                theme={VictoryTheme.material}
                domainPadding={{ y: 10 }}
                padding={{ top: 10, bottom: 50, left: 35, right: 30 }}
                minDomain={{ y: 0 }}
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
                  tickCount={12}
                />
                <VictoryAxis
                  dependentAxis
                  tickFormat={(t) => Math.round(t)}
                  style={{
                    tickLabels: { fill: "white", fontSize: 10 },
                    ticks: { stroke: "transparent" },
                    grid: { stroke: "transparent" },
                    axis: { stroke: "transparent" },
                  }}
                  minDomain={{ y: 0 }}
                />
                {chartData.map((dataset, index) => (
                  <VictoryGroup key={dataset.medication}>
                    <VictoryLine
                      data={dataset.data}
                      style={{
                        data: {
                          stroke: colors[index % colors.length],
                          strokeWidth: 2,
                        },
                      }}
                      interpolation="monotoneX"
                    />
                    <VictoryScatter
                      data={dataset.data.map(point => ({
                        ...point,
                        label: `${point.y}mg`
                      }))}
                      size={({ active }) => (active ? 2 : 1)}
                      style={{
                        data: {
                          fill: colors[index % colors.length],
                        },
                      }}
                      labels={({ datum }) => datum.label}
                      labelComponent={<VictoryTooltip constrainToVisibleArea />}
                    />
                  </VictoryGroup>
                ))}
              </VictoryChart>
            </ScrollView>
          ) : (
            <VictoryChart
              width={screenWidth}
              height={250}
              theme={VictoryTheme.material}
              domainPadding={{ y: 10 }}
              padding={{ top: 10, bottom: 50, left: 35, right: 30 }}
              minDomain={{ y: 0 }}
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
                      : 10
                }
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => Math.round(t)}
                style={{
                  tickLabels: { fill: "white", fontSize: 10 },
                  ticks: { stroke: "transparent" },
                  grid: { stroke: "transparent" },
                  axis: { stroke: "transparent" },
                }}
                minDomain={{ y: 0 }}
              />
              {chartData.map((dataset, index) => (
                <VictoryGroup key={dataset.medication}>
                  <VictoryLine
                    data={dataset.data}
                    style={{
                      data: {
                        stroke: colors[index % colors.length],
                        strokeWidth: 2,
                      },
                    }}
                    interpolation="monotoneX"
                  />
                  <VictoryScatter
                    data={dataset.data.map(point => ({
                      ...point,
                      label: `${point.y}mg`
                    }))}
                    size={({ active }) =>
                      active
                        ? (
                            selectedPeriod === 'quarter'
                              ? 4
                              : 8
                          )
                        : (
                            selectedPeriod === 'quarter'
                              ? 2
                              : 4
                          )
                    }
                    style={{
                      data: {
                        fill: colors[index % colors.length],
                      },
                    }}
                    labels={({ datum }) => datum.label}
                    labelComponent={<VictoryTooltip constrainToVisibleArea />}
                  />
                </VictoryGroup>
              ))}
            </VictoryChart>
          )
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

      {/* Quick Stats Section */}
      {injectionData.length > 0 && (
        <View className="mt-4 pt-4 border-t border-gray-700">
          <Text className="text-white text-lg font-semibold mb-2">
            Quick Stats
          </Text>
          <View className="flex-row justify-between mt-4">
            <View className="bg-gray-700 rounded-lg p-3 flex-1 mr-2 items-center">
              <Text className="text-2xl font-bold text-blue-400">
                {quickStats.maxDosage === Infinity || quickStats.maxDosage === -Infinity || isNaN(quickStats.maxDosage) ? "" : `${quickStats.maxDosage}mg`}
              </Text>
              <Text className="text-gray-400 text-sm">Max Dosage</Text>
            </View>
            <View className="bg-gray-700 rounded-lg p-3 flex-1 ml-2 items-center">
              <Text className="text-2xl font-bold text-purple-400">
                {quickStats.minDosage === Infinity || quickStats.minDosage === -Infinity || isNaN(quickStats.minDosage) ? "" : `${quickStats.minDosage}mg`}
              </Text>
              <Text className="text-gray-400 text-sm">Min Dosage</Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-4">
            <View className="bg-gray-700 rounded-lg p-3 flex-1 mr-2 items-center">
              <Text className="text-2xl font-bold text-blue-400">
                {quickStats.averageDosage === Infinity || quickStats.averageDosage === -Infinity || isNaN(quickStats.averageDosage) ? "" : `${quickStats.averageDosage.toFixed(1)}mg`}
              </Text>
              <Text className="text-gray-400 text-sm">Avg Dosage</Text>
            </View>
            <View className="bg-gray-700 rounded-lg p-3 flex-1 ml-2 items-center">
              <Text className="text-2xl font-bold text-purple-400">{averageTestosterone.toFixed(1)}mg</Text>
              <Text className="text-gray-400 text-sm">Avg T Level</Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-4">
            <View className="bg-gray-700 rounded-lg p-3 flex-1 mr-2 items-center">
              <Text className="text-2xl font-bold text-blue-400">{maxTestosterone.toFixed(1)}mg</Text>
              <Text className="text-gray-400 text-sm">Max T Level</Text>
            </View>
            <View className="bg-gray-700 rounded-lg p-3 flex-1 ml-2 items-center">
              <Text className="text-2xl font-bold text-purple-400">{minTestosterone.toFixed(1)}mg</Text>
              <Text className="text-gray-400 text-sm">Min T Level</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default MedicationChart;
