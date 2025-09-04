import React, { useMemo, useEffect, useState } from "react";
import { View, Text, Dimensions, ScrollView } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryScatter, VictoryBar } from "victory-native";
import { getOppositeSite } from '../utils/injectionUtils';

interface StatisticsDashboardProps {
  injectionData?: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    dateTime: string;
    injectionSite?: string;
    halfLifeMinutes?: number;
  }>;
}

const StatisticsDashboard = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const loadInjections = async () => {
      try {
        const storedInjections = await AsyncStorage.getItem("injections");
        if (storedInjections) {
          const parsed = JSON.parse(storedInjections);
          
          // Clean up any data with missing or undefined site values
          const cleanedData = parsed.map((injection: any) => {
            if (!injection.injectionSite) {
              // If injectionSite is missing, set a default site
              return {
                ...injection,
                injectionSite: 'Unknown Site'
              };
            }
            return injection;
          });
          
          // If we made changes, save the cleaned data back to storage
          if (JSON.stringify(cleanedData) !== storedInjections) {
            console.log('StatisticsDashboard: Data cleaned, saving back to storage');
            await AsyncStorage.setItem("injections", JSON.stringify(cleanedData));
          }
          
          setData(cleanedData);
        } else {
          setData([]);
        }
      } catch (e) {
        setData([]);
      }
    };
    loadInjections();
  }, []);

  // Calculate daily T-levels for the input data (like MedicationChart)
  const tLevelTimeSeries = useMemo(() => {
    if (!data || data.length === 0) return [];
    // Get date range from first to last injection
    const sorted = [...data].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const startDate = new Date(sorted[0].dateTime);
    const endDate = new Date(sorted[sorted.length - 1].dateTime);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dateRange: string[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dateRange.push(d.toISOString().split('T')[0]);
    }
    // For each day, sum decayed T from all previous injections
    return dateRange.map(dateStr => {
      const currentDate = new Date(dateStr + 'T23:59:59');
      let tLevel = 0;
      data.forEach(injection => {
        const injectionDate = new Date(injection.dateTime);
        const halfLifeMinutes = injection.halfLifeMinutes || 0;
        if (halfLifeMinutes > 0 && injection.medicationName.toLowerCase().includes('testosterone')) {
          const minutesDiff = (currentDate.getTime() - injectionDate.getTime()) / (1000 * 60);
          if (minutesDiff >= 0) {
            const halfLifePeriods = minutesDiff / halfLifeMinutes;
            const decayFactor = Math.pow(0.5, halfLifePeriods);
            const dosage = parseFloat(injection.dosage.toString());
            const partial = dosage * decayFactor;
            tLevel += partial;
          }
        }
      });
      return { x: new Date(currentDate), y: Math.round(tLevel) };
    });
  }, [data]);

  // Project 90 days of future injections and T-levels, starting from last real day
  const projectedData = useMemo(() => {
    if (data.length < 2 || tLevelTimeSeries.length === 0) return [];
    const lastInjection = data[0];
    const secondLastInjection = data[1];
    const lastDate = new Date(lastInjection.dateTime);
    const secondLastDate = new Date(secondLastInjection.dateTime);
    const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));
    // Start from the day after the last day in the time series
    let currentDate = new Date(tLevelTimeSeries[tLevelTimeSeries.length - 1].x);
    currentDate.setDate(currentDate.getDate() + 1);
    let injections = [...data];
    const projections = [];
    for (let i = 0; i < 90; i++) {
              // Project next injection
        currentDate = new Date(currentDate.getTime() + diffInMinutes * 60 * 1000);
        const site = i % 2 === 0 ? lastInjection.injectionSite : getOppositeSite(lastInjection.injectionSite);
      injections = [
        {
          ...lastInjection,
          dateTime: currentDate.toISOString(),
          injectionSite: site,
        },
        ...injections,
      ];
      // Calculate T-level for this day
      let tLevel = 0;
      injections.forEach(injection => {
        const injectionDate = new Date(injection.dateTime);
        const halfLifeMinutes = injection.halfLifeMinutes || 0;
        if (halfLifeMinutes > 0 && injection.medicationName.toLowerCase().includes('testosterone')) {
          const minutesDiff = (currentDate.getTime() - injectionDate.getTime()) / (1000 * 60);
          if (minutesDiff >= 0) {
            const halfLifePeriods = minutesDiff / halfLifeMinutes;
            const decayFactor = Math.pow(0.5, halfLifePeriods);
            const dosage = parseFloat(injection.dosage.toString());
            tLevel += dosage * decayFactor;
          }
        }
      });
      projections.push({ x: new Date(currentDate), y: Math.round(tLevel) });
    }
    // Only return projections (future 90 days)
    return projections;
  }, [data, tLevelTimeSeries]);

  // Calculate injection site frequency
  const siteFrequencyData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const siteCounts: { [key: string]: number } = {};
    
    data.forEach((injection, index) => {
      const site = injection.injectionSite;
      
      // Only count injections with valid site names
      if (site && site.trim() !== '' && site !== 'undefined' && site !== 'null') {
        siteCounts[site] = (siteCounts[site] || 0) + 1;
      } else {
        console.warn(`Skipping injection ${index} with invalid site:`, site);
      }
    });
    
    return Object.entries(siteCounts).map(([site, count]) => ({
      x: site,
      y: count
    }));
  }, [data]);

  const screenWidth = Dimensions.get("window").width - 32;

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <Text className="text-white text-2xl font-bold mb-6">Projected Testosterone Levels (90 Days)</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8, marginBottom: 20 }}>
        <VictoryChart
          width={screenWidth}
          height={250}
          theme={VictoryTheme.material}
          padding={{ top: 10, bottom: 60, left: 35, right: 30 }}
          domainPadding={{ y: 10 }}
        >
          <VictoryAxis
            tickFormat={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }}
            style={{
              tickLabels: {
                fill: "white",
                fontSize: 12,
                angle: 45,
                textAnchor: "start",
              },
              grid: { stroke: "transparent" },
              axis: { stroke: "transparent" },
            }}
            tickCount={10}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(t) => Math.round(t)}
            style={{
              tickLabels: { fill: "white", fontSize: 12 },
              ticks: { stroke: "transparent" },
              grid: { stroke: "transparent" },
              axis: { stroke: "transparent" },
            }}
            minDomain={{ y: 0 }}
          />
          <VictoryLine
            data={projectedData}
            style={{
              data: {
                stroke: "#60a5fa",
                strokeWidth: 2,
              },
            }}
            interpolation="monotoneX"
          />
          <VictoryScatter
            data={projectedData}
            size={2}
            style={{ data: { fill: "#60a5fa" } }}
            labels={({ datum }) => `${datum.y}mg`}
            labelComponent={<VictoryTooltip constrainToVisibleArea />}
          />
        </VictoryChart>
      </View>

      <Text className="text-white text-2xl font-bold mb-6">Injection Site Frequency</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8 }}>
        <VictoryChart
          width={screenWidth}
          height={250}
          theme={VictoryTheme.material}
          padding={{ top: 10, bottom: 60, left: 50, right: 30 }}
          domainPadding={{ x: 20 }}
        >
          <VictoryAxis
            style={{
              tickLabels: {
                fill: "white",
                fontSize: 12,
              },
              grid: { stroke: "transparent" },
              axis: { stroke: "transparent" },
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fill: "white", fontSize: 12 },
              ticks: { stroke: "transparent" },
              grid: { stroke: "transparent" },
              axis: { stroke: "transparent" },
            }}
            minDomain={{ y: 0 }}
          />
          <VictoryBar
            data={siteFrequencyData}
            style={{
              data: {
                fill: "#10b981",
                stroke: "#059669",
                strokeWidth: 1,
              },
            }}
            labels={({ datum }) => `${datum.y}`}
            labelComponent={<VictoryTooltip constrainToVisibleArea />}
          />
        </VictoryChart>
      </View>
    </ScrollView>
  );
};

export default StatisticsDashboard;
