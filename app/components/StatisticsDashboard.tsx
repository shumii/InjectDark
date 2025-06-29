import React, { useMemo, useEffect, useState } from "react";
import { View, Text, Dimensions, ScrollView } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryScatter } from "victory-native";
import { getOppositeSite } from '../utils/injectionUtils';

interface StatisticsDashboardProps {
  injectionData?: Array<{
    id: string;
    medicationName: string;
    dosage: string;
    dateTime: string;
    site: string;
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
          setData(parsed);
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
            console.log(`TLevelTS: date=${dateStr}, injDate=${injection.dateTime}, minDiff=${minutesDiff}, decay=${decayFactor}, partial=${partial}, tLevel=${tLevel}`);
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
      const site = i % 2 === 0 ? lastInjection.site : getOppositeSite(lastInjection.site);
      injections = [
        {
          ...lastInjection,
          dateTime: currentDate.toISOString(),
          site,
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
    console.log('StatisticsDashboard projectedData:', projections);
    console.log('StatisticsDashboard tLevelTimeSeries:', tLevelTimeSeries);
    console.log('StatisticsDashboard input data:', data);
    return projections;
  }, [data, tLevelTimeSeries]);

  const screenWidth = Dimensions.get("window").width - 32;

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <Text className="text-white text-2xl font-bold mb-6">Projected Testosterone Levels (90 Days)</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8 }}>
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
    </ScrollView>
  );
};

export default StatisticsDashboard;
