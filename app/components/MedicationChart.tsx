import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  PanResponder,
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
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const screenWidth = Dimensions.get("window").width - 32; // Account for padding
  const chartWidth = selectedPeriod === 'year' ? screenWidth * 1.6 : screenWidth;

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

    // Debug logging for chart calculation
    console.log('--- MedicationChart Calculation ---');
    console.log('Selected period:', selectedPeriod);
    console.log('Date range:', dateRange);
    console.log('Medications:', Array.from(medications));
    console.log('MedicationMap:', medicationMap);
    


    // if only 1 we take quick stats from data, otherwise we take it from the total t
    if (Object.values(medicationMap).length > 0)
    {
      var maxTestosterone = Math.max(...Object.values(medicationMap).map(levels => Math.max(...Object.values(levels))));
      var minTestosterone = Math.min(...Object.values(medicationMap).map(levels => 
        Math.min(...Object.values(levels).filter(val => val > 0))
      ));
      
      var sumTLevels = Object.values(Object.values(medicationMap)[0]).reduce((sum, level) => sum + level, 0);
      var averageTestosterone = sumTLevels / periodDays;

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

            // Debug: Check raw values for precision
    Object.entries(totalTLevels).forEach(([medication, levels]) => {
      console.log(`Raw values for ${medication}:`, Object.entries(levels).slice(0, 50)); // Show first 5 entries
    });

        var sumTotalTLevels = Object.values(totalTLevels).reduce((sum, level) => sum + level, 0);
        var averageTotalTLevels = sumTotalTLevels / periodDays;
        var maxTotalTLevels = Math.max(...Object.values(totalTLevels));
        var minTotalTLevels = Math.min(...Object.values(totalTLevels));

        maxTestosterone = maxTotalTLevels;
        minTestosterone = minTotalTLevels;
        averageTestosterone = averageTotalTLevels;

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
          y: medicationMap[medication]?.[date] || 0,
        })),
      };
    });

    console.log('Final chart data:', finalData);
    
    // Debug: Check final data precision
    finalData.forEach(dataset => {
      console.log(`Final data for ${dataset.medication}:`, dataset.data.slice(0, 90)); // Show first 3 points
    });
    
    console.log('--- End MedicationChart Calculation ---');
    return finalData;
  }, [filteredData, selectedPeriod, filteredTLevels]);

  // Update testosterone stats when chartData changes
  React.useEffect(() => {
    if (chartData.length > 0) {
      const medicationMap = filteredTLevels;
      const periodDays = periodRanges[selectedPeriod];
      
      if (Object.values(medicationMap).length > 0) {
        let maxTestosterone = Math.max(...Object.values(medicationMap).map(levels => Math.max(...Object.values(levels))));
        let minTestosterone = Math.min(...Object.values(medicationMap).map(levels => 
          Math.min(...Object.values(levels).filter(val => val > 0))
        ));
        
        let sumTLevels = Object.values(Object.values(medicationMap)[0]).reduce((sum, level) => sum + level, 0);
        let averageTestosterone = sumTLevels / periodDays;

        // Check if we have multiple medications and need to calculate Total T
        const medications = new Set<string>();
        Object.keys(medicationMap).forEach((medication) => {
          medications.add(medication);
        });

        if (medications.size > 1) {
          // Calculate Total T by summing up all testosterone medications for each date
          const totalTLevels: Record<string, number> = {};
          const dateRange: string[] = [];
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - (periodRanges[selectedPeriod] - 1));
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dateRange.push(d.toISOString().split("T")[0]);
          }

          dateRange.forEach(date => {
            totalTLevels[date] = 0;
            Object.entries(medicationMap).forEach(([medicationName, levels]) => {
              if (medicationName.toLowerCase().includes('testosterone')) {
                totalTLevels[date] += levels[date];
              }
            });
          });

          const sumTotalTLevels = Object.values(totalTLevels).reduce((sum, level) => sum + level, 0);
          const averageTotalTLevels = sumTotalTLevels / periodDays;
          const maxTotalTLevels = Math.max(...Object.values(totalTLevels));
          const minTotalTLevels = Math.min(...Object.values(totalTLevels));

          maxTestosterone = maxTotalTLevels;
          minTestosterone = minTotalTLevels;
          averageTestosterone = averageTotalTLevels;
        }

        setMaxTestosterone(maxTestosterone);
        setMinTestosterone(minTestosterone);
        setAverageTestosterone(averageTestosterone);
      }
    }
  }, [chartData, filteredTLevels, selectedPeriod]);

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

  // Helper to convert x (date) to pixel
  function chartXToPixel(x: Date | string) {    
    const minX = Math.min(...chartData.flatMap(d => d.data.map(p => new Date(p.x).getTime())));
    const maxX = Math.max(...chartData.flatMap(d => d.data.map(p => new Date(p.x).getTime())));
    const xMs = new Date(x).getTime();

   

    if (maxX === minX) return (chartWidth - 35 - 30) / 2; // Center in data area
    
    // Calculate position relative to data area width
    const dataAreaWidth = chartWidth - 35 - 30;
    const relativePosition = (xMs - minX) / (maxX - minX);
    return relativePosition * dataAreaWidth;
  }

  // PanResponder for overlay (recreated on every render for fresh chartData)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      // Get the x position relative to the overlay (which matches the chart width)
      // gestureState.x0 is the initial touch, gestureState.moveX is the absolute screen x
      // evt.nativeEvent.locationX is the x within the overlay
      const x = evt.nativeEvent.locationX;
      //console.log('moveX:', gestureState.moveX, 'overlay x:', x);
      if (chartData.length > 0) {        
        const allPoints = chartData.flatMap((dataset, idx) =>
          dataset.data.map(point => ({
            ...point,
            medication: dataset.medication,
            color: colors[idx % colors.length],
            xPx: chartXToPixel(point.x),
            label: `${point.y}mg`, // Add label for tooltip
          }))
        );
        let closest = null;
        let minDiff = Infinity;
        for (const pt of allPoints) {
          // x is now relative to the data area (no need to subtract padding)
          const diff = Math.abs(pt.xPx - x);
          if (diff < minDiff) {
            minDiff = diff;
            closest = pt;
          }
        }
        
        console.log('Tooltip data:', {
          date: closest?.x,
          medication: closest?.medication,
          value: closest?.y,
          label: closest?.label
        });

        if (closest) {
          closest.y = Number(Number(closest.y).toFixed(0));
          closest.label = closest.y.toString();
        }
        setHoveredPoint(closest); // Always show the closest point
      }
    },
    onPanResponderRelease: () => setHoveredPoint(null),
    onPanResponderTerminate: () => setHoveredPoint(null),
  });

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
      {chartData.length > 0 ? (
        selectedPeriod === 'year' ? (
          <ScrollView horizontal style={{ position: 'relative' }}>
            <View style={{ position: "relative", width: chartWidth, height: 250 }} pointerEvents="box-none">
              <VictoryChart
                width={chartWidth}
                height={250}
                theme={VictoryTheme.material}
                domainPadding={{ y: 10 }}
                padding={{ top: 10, bottom: 60, left: 35, right: 30 }}
                minDomain={{ y: 0 }}
              >
                <VictoryAxis
                  tickFormat={formatXAxisLabel}
                  style={{
                    tickLabels: {
                      fill: "white",
                      fontSize: 14,
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
                    tickLabels: { fill: "white", fontSize: 14 },
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
              {/* Custom overlay for glide tooltip */}
              <View
                style={{
                  position: "absolute",
                  left: 35, // Match chart left padding
                  top: 0,
                  width: chartWidth - 35 - 30, // Match chart data area width
                  height: 250,
                }}
                {...panResponder.panHandlers}
                pointerEvents="auto"
                onStartShouldSetResponder={() => { console.log('Responder!'); return true; }}
              >
                {hoveredPoint && (
                  <>
                    {/* Vertical line */}
                    <View
                      style={{
                        position: "absolute",
                        left: hoveredPoint.xPx - 1,
                        top: 0,
                        width: 2,
                        height: 250,
                        backgroundColor: hoveredPoint.color,
                        opacity: 0.5,
                      }}
                    />
                    {/* Tooltip */}
                    <View
                      style={{
                        position: "absolute",
                        left: Math.max(0, Math.min(chartWidth, hoveredPoint.xPx + 8)),
                        top: 40,
                        backgroundColor: "#222",
                        padding: 10,
                        borderRadius: 10,
                        minWidth: 120,
                        borderWidth: 2,
                        borderColor: "#60a5fa",
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 4,
                        zIndex: 100,
                      }}
                    >
                      <Text style={{ color: "#60a5fa", fontWeight: "bold", fontSize: 13 }}>
                        {hoveredPoint.x ? new Date(hoveredPoint.x).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </Text>
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>{hoveredPoint.medication || 'No medication'}</Text>
                      <Text style={{ color: "#fff" }}>{hoveredPoint.label || 'No label'}</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        ) : (
          <View style={{ position: "relative", width: chartWidth, height: 250 }} pointerEvents="box-none">
            <VictoryChart
              width={chartWidth}
              height={250}
              theme={VictoryTheme.material}
              domainPadding={{ y: 10 }}
              padding={{ top: 10, bottom: 60, left: 35, right: 30 }}
              minDomain={{ y: 0 }}
            >
              <VictoryAxis
                tickFormat={formatXAxisLabel}
                style={{
                  tickLabels: {
                    fill: "white",
                    fontSize: 14,
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
                  tickLabels: { fill: "white", fontSize: 14 },
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
            {/* Custom overlay for glide tooltip */}
            <View
              style={{
                position: "absolute",
                left: 35, // Match chart left padding
                top: 0,
                width: chartWidth - 35 - 30, // Match chart data area width
                height: 250,
              }}
              {...panResponder.panHandlers}
              pointerEvents="auto"
              onStartShouldSetResponder={() => { console.log('Responder!'); return true; }}
            >
              {hoveredPoint && (
                <>
                  {/* Vertical line */}
                  <View
                    style={{
                      position: "absolute",
                      left: hoveredPoint.xPx - 1,
                      top: 0,
                      width: 2,
                      height: 250,
                      backgroundColor: hoveredPoint.color,
                      opacity: 0.5,
                    }}
                  />
                  {/* Tooltip */}
                  <View
                    style={{
                      position: "absolute",
                      left: Math.max(0, Math.min(chartWidth - 140, hoveredPoint.xPx + 8)),
                      top: 40,
                      backgroundColor: "#222",
                      padding: 10,
                      borderRadius: 10,
                      minWidth: 120,
                      borderWidth: 2,
                      borderColor: "#60a5fa",
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                      zIndex: 100,
                    }}
                  >
                    <Text style={{ color: "#60a5fa", fontWeight: "bold", fontSize: 13 }}>
                      {hoveredPoint.x ? new Date(hoveredPoint.x).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </Text>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>{hoveredPoint.medication || 'No medication'}</Text>
                    <Text style={{ color: "#fff" }}>{hoveredPoint.label || 'No label'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )
      ) : (
        <View className="items-center justify-center h-full">
          <Text className="text-gray-400">
            No data available for this period
          </Text>
        </View>
      )}

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
            labels: { fill: "white", fontSize: 14 },
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
