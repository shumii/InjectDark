import React, { useMemo, useEffect, useState, useRef } from "react";
import { View, Text, Dimensions, ScrollView, PanResponder } from "react-native";
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
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const screenWidth = Dimensions.get("window").width - 32;

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
    
    console.log('=== VERIFICATION: HISTORICAL T-LEVEL CALCULATION ===');
    console.log('Input data:', data.length, 'injections');
    
    // Get date range from first to last injection
    const sorted = [...data].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const startDate = new Date(sorted[0].dateTime);
    const endDate = new Date(sorted[sorted.length - 1].dateTime);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Date range:', {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      days: days
    });
    
    const dateRange: string[] = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dateRange.push(d.toISOString().split('T')[0]);
    }
    
    // For each day, sum decayed T from all previous injections
    const timeSeries = dateRange.map(dateStr => {
      const currentDate = new Date(dateStr + 'T23:59:59');
      let tLevel = 0;
      const dailyContributions: Array<{
        injectionDate: string;
        dosage: number;
        minutesDiff: number;
        halfLifePeriods: number;
        decayFactor: number;
        contribution: number;
      }> = [];
      
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
            
            dailyContributions.push({
              injectionDate: injection.dateTime,
              dosage: dosage,
              minutesDiff: minutesDiff,
              halfLifePeriods: halfLifePeriods,
              decayFactor: decayFactor,
              contribution: partial
            });
          }
        }
      });
      
      const roundedTLevel = Math.round(tLevel);
      
      // Log September 4th specifically for verification
      if (dateStr === '2025-09-04') {
        console.log('September 4th, 2025 T-level calculation:', {
          date: dateStr,
          totalTLevel: roundedTLevel,
          rawTLevel: tLevel,
          contributions: dailyContributions
        });
      }
      
      return { x: new Date(currentDate), y: roundedTLevel };
    });
    
    console.log('=== END HISTORICAL VERIFICATION ===');
    return timeSeries;
  }, [data]);

  // Project 90 days of future injections and T-levels, starting from last real day
  const projectedData = useMemo(() => {
    if (data.length < 2 || tLevelTimeSeries.length === 0) return [];
    
    const lastInjection = data[0];
    const secondLastInjection = data[1];
    const lastDate = new Date(lastInjection.dateTime);
    const secondLastDate = new Date(secondLastInjection.dateTime);
    const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));
    
    console.log('=== VERIFICATION: T-LEVEL CALCULATION ===');
    console.log('Last injection:', {
      date: lastInjection.dateTime,
      dosage: lastInjection.dosage,
      medication: lastInjection.medicationName,
      halfLifeMinutes: lastInjection.halfLifeMinutes
    });
    console.log('Injection interval (days):', diffInMinutes / (24 * 60));
    
    // Start from the last injection date and add the interval to get the next injection
    // This ensures projections start from the next scheduled injection date
    let currentDate = new Date(lastDate);
    let injections = [...data];
    const projections = [];
    
    for (let i = 0; i < 90; i++) {
      // Project next injection
      currentDate = new Date(currentDate.getTime() + diffInMinutes * 60 * 1000);
      const site = i % 2 === 0 ? lastInjection.injectionSite : getOppositeSite(lastInjection.injectionSite);
      
      const projectedInjection = {
        ...lastInjection,
        dateTime: currentDate.toISOString(),
        injectionSite: site,
      };
      
      injections = [projectedInjection, ...injections];
      
      // Calculate T-level for this day
      let tLevel = 0;
      const contributions: Array<{
        date: string;
        dosage: number;
        minutesDiff: number;
        halfLifePeriods: number;
        decayFactor: number;
        contribution: number;
        isProjected: boolean;
      }> = [];
      
      injections.forEach(injection => {
        const injectionDate = new Date(injection.dateTime);
        const halfLifeMinutes = injection.halfLifeMinutes || 0;
        if (halfLifeMinutes > 0 && injection.medicationName.toLowerCase().includes('testosterone')) {
          const minutesDiff = (currentDate.getTime() - injectionDate.getTime()) / (1000 * 60);
          if (minutesDiff >= 0) {
            const halfLifePeriods = minutesDiff / halfLifeMinutes;
            const decayFactor = Math.pow(0.5, halfLifePeriods);
            const dosage = parseFloat(injection.dosage.toString());
            const contribution = dosage * decayFactor;
            tLevel += contribution;
            
            contributions.push({
              date: injection.dateTime,
              dosage: dosage,
              minutesDiff: minutesDiff,
              halfLifePeriods: halfLifePeriods,
              decayFactor: decayFactor,
              contribution: contribution,
              isProjected: injection === projectedInjection
            });
          }
        }
      });
      
      const roundedTLevel = Math.round(tLevel);
      projections.push({ x: new Date(currentDate), y: roundedTLevel });
      
      // Log detailed info for first few projections to verify calculation
      if (i < 3) {
        console.log(`Projection ${i + 1} (${currentDate.toISOString().split('T')[0]}):`, {
          totalTLevel: roundedTLevel,
          rawTLevel: tLevel,
          contributions: contributions.slice(0, 5) // Show first 5 contributions
        });
      }
    }
    
    console.log('=== END VERIFICATION ===');
    
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

  // Helper to convert x (date) to pixel
  function chartXToPixel(x: Date | string) {    
    if (!projectedData || projectedData.length === 0) return 0;
    
    const minX = Math.min(...projectedData.map(p => p.x.getTime()));
    const maxX = Math.max(...projectedData.map(p => p.x.getTime()));
    const xMs = new Date(x).getTime();

    if (maxX === minX) return (screenWidth - 35 - 30) / 2; // Center in data area
    
    // Calculate position relative to data area width
    const dataAreaWidth = screenWidth - 35 - 30;
    const relativePosition = (xMs - minX) / (maxX - minX);
    return relativePosition * dataAreaWidth;
  }

  // PanResponder for overlay (recreated on every render for fresh chartData)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      // Get the x position relative to the overlay (which matches the chart width)
      const x = evt.nativeEvent.locationX;
      
      if (projectedData && projectedData.length > 0) {        
        const allPoints = projectedData.map(point => ({
          ...point,
          xPx: chartXToPixel(point.x),
          label: `${point.y}mg`,
        }));
        
        let closest = null;
        let minDiff = Infinity;
        for (const pt of allPoints) {
          const diff = Math.abs(pt.xPx - x);
          if (diff < minDiff) {
            minDiff = diff;
            closest = pt;
          }
        }
        
        if (closest) {
          closest.y = Number(Number(closest.y).toFixed(0));
          closest.label = closest.y.toString();
        }
        setHoveredPoint(closest);
      }
    },
    onPanResponderRelease: () => setHoveredPoint(null),
    onPanResponderTerminate: () => setHoveredPoint(null),
  });

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <Text className="text-white text-2xl font-bold mb-6">Projected Testosterone Levels (90 Days)</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8, marginBottom: 20 }}>
        <View style={{ position: "relative", width: screenWidth, height: 250 }} pointerEvents="box-none">
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
          
          {/* Custom overlay for glide tooltip */}
          <View
            style={{
              position: "absolute",
              left: 35, // Match chart left padding
              top: 0,
              width: screenWidth - 35 - 30, // Match chart data area width
              height: 250,
            }}
            {...panResponder.panHandlers}
            pointerEvents="auto"
            onStartShouldSetResponder={() => true}
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
                    backgroundColor: "#60a5fa",
                    opacity: 0.5,
                  }}
                />
                {/* Tooltip */}
                <View
                  style={{
                    position: "absolute",
                    left: Math.max(0, Math.min(screenWidth - 140, hoveredPoint.xPx + 8)),
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
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Projected T Level</Text>
                  <Text style={{ color: "#fff" }}>{hoveredPoint.label || 'No label'}</Text>
                </View>
              </>
            )}
          </View>
        </View>
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
