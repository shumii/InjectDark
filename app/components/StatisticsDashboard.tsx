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

// Helper function to find the stabilized date
const findStabilizedDate = (projections: any[], data: any[], lastInjection: any, diffInMinutes: number) => {
  // Find all injection dates (real + projected)
  const injectionDates: Date[] = [];
  const realInjectionDates = data.map(inj => new Date(inj.dateTime));
  console.log('All real injection dates:', realInjectionDates.map(d => d.toISOString().split('T')[0]));
  
  // Only include real injection dates up to and including the last injection date
  const lastInjectionDate = new Date(lastInjection.dateTime);
  const filteredRealDates = realInjectionDates.filter(date => date.getTime() <= lastInjectionDate.getTime());
  console.log('Filtered real injection dates (up to last injection):', filteredRealDates.map(d => d.toISOString().split('T')[0]));
  injectionDates.push(...filteredRealDates);
  
  // Add projected injection dates starting from the last injection date
  let currentInjectionDate = new Date(lastInjection.dateTime);
  console.log('Starting projected dates from:', currentInjectionDate.toISOString().split('T')[0]);
  const projectedDates: Date[] = [];
  for (let i = 0; i < 10; i++) { // Check up to 10 projected injections
    currentInjectionDate = new Date(currentInjectionDate.getTime() + diffInMinutes * 60 * 1000);
    projectedDates.push(new Date(currentInjectionDate));
  }
  console.log('Projected injection dates:', projectedDates.map(d => d.toISOString().split('T')[0]));
  injectionDates.push(...projectedDates);
  
  // Sort injection dates
  injectionDates.sort((a, b) => a.getTime() - b.getTime());
  
  // Debug: Check for duplicates in injectionDates
  const dateCounts = {};
  injectionDates.forEach(date => {
    const dateStr = date.toISOString().split('T')[0];
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
  });
  console.log('Duplicate dates in injectionDates:', Object.entries(dateCounts).filter(([date, count]) => count > 1));
  
  // Find T-levels at each injection point
  const injectionTLevels: { date: Date, tLevel: number }[] = [];
  
  injectionDates.forEach(injectionDate => {
    // Find the projection data point closest to this injection date
    const closestProjection = projections.find(proj => {
      const projDate = new Date(proj.x);
      return Math.abs(projDate.getTime() - injectionDate.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
    });
    
    if (closestProjection) {
      injectionTLevels.push({
        date: injectionDate,
        tLevel: closestProjection.y
      });
    }
  });
  
  
  // Look for 3 consecutive injections with T-levels within 2 of each other
  let consecutiveCount = 0;
  let stabilizedDate: Date | null = null;
  
  for (let i = 1; i < injectionTLevels.length; i++) {
    const currentTLevel = injectionTLevels[i].tLevel;
    const previousTLevel = injectionTLevels[i - 1].tLevel;
    const difference = Math.abs(currentTLevel - previousTLevel);
    
    if (difference <= 2) {
      consecutiveCount++;
      
      if (consecutiveCount === 3) {
        stabilizedDate = injectionTLevels[i].date;
        break;
      }
    } else {
      consecutiveCount = 0; // Reset counter if T-levels are too different
    }
  }
  
  return stabilizedDate;
};

// Helper function to filter projections after stabilization
const filterProjectionsAfterStabilization = (projections: any[], stabilizedDate: Date | null, lastInjectionDate: Date) => {
  if (!stabilizedDate) {
    console.log('No stabilized date found, returning all projections');
    return projections;
  }
  
  // Calculate minimum days (30 days from last injection)
  const minDays = 30;
  const minDate = new Date(lastInjectionDate);
  minDate.setDate(minDate.getDate() + minDays);
  
  console.log('Minimum date (30 days from last injection):', minDate.toISOString().split('T')[0]);
  console.log('Stabilized date:', stabilizedDate.toISOString().split('T')[0]);
  
  // Use the later of stabilized date or minimum date
  const cutoffDate = stabilizedDate > minDate ? stabilizedDate : minDate;
  console.log('Cutoff date:', cutoffDate.toISOString().split('T')[0]);
  
  // Filter projections to only include data up to cutoff date
  const filtered = projections.filter(proj => {
    const projDate = new Date(proj.x);
    return projDate <= cutoffDate;
  });
  
  console.log(`Filtered ${projections.length} projections down to ${filtered.length} projections`);
  return filtered;
};

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
    
    // Show daily T-levels for all 90 days, with projected injections added at the correct intervals
    let dailyDate = new Date(lastDate);
    let nextInjectionDate = new Date(currentDate.getTime() + diffInMinutes * 60 * 1000);
    let injectionCount = 0;
    
    for (let day = 1; day <= 90; day++) {
      dailyDate.setDate(dailyDate.getDate() + 1);
      
      // Check if we need to add a projected injection on this day
      if (Math.abs(dailyDate.getTime() - nextInjectionDate.getTime()) < 24 * 60 * 60 * 1000) { // Within 1 day
        const site = injectionCount % 2 === 0 ? lastInjection.injectionSite : getOppositeSite(lastInjection.injectionSite);
        
        const projectedInjection = {
          ...lastInjection,
          dateTime: nextInjectionDate.toISOString(),
          injectionSite: site,
        };
        
        injections = [projectedInjection, ...injections];
        injectionCount++;
        
        // Calculate next injection date
        nextInjectionDate = new Date(nextInjectionDate.getTime() + diffInMinutes * 60 * 1000);
        
        console.log(`Added projected injection ${injectionCount} on ${dailyDate.toISOString().split('T')[0]}`);
      }
      
      // Calculate T-level for this day using all injections (real + projected)
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
          const minutesDiff = (dailyDate.getTime() - injectionDate.getTime()) / (1000 * 60);
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
              isProjected: injection.dateTime > lastInjection.dateTime
            });
          }
        }
      });
      
      const roundedTLevel = Math.round(tLevel);
      projections.push({ x: new Date(dailyDate), y: roundedTLevel });
      
      // Log detailed info for first few days and injection days
      if (day <= 5 || Math.abs(dailyDate.getTime() - nextInjectionDate.getTime()) < 24 * 60 * 60 * 1000) {
        console.log(`Day ${day} (${dailyDate.toISOString().split('T')[0]}): T-level = ${roundedTLevel}, injections = ${injections.length}`);
      }
    }
    
    console.log('=== END VERIFICATION ===');
    
    // Filter projections to remove data after stabilized date (unless less than 30 days)
    const filteredProjections = filterProjectionsAfterStabilization(projections, null, lastDate);
    console.log('Filtered projections count:', filteredProjections.length);
    
    return filteredProjections;
  }, [data, tLevelTimeSeries]);

  // Calculate stabilization date separately
  const stabilizedDate = useMemo(() => {
    console.log('StabilizedDate useMemo - data.length:', data.length, 'tLevelTimeSeries.length:', tLevelTimeSeries.length);
    
    if (data.length < 2 || tLevelTimeSeries.length === 0) {
      console.log('Early return: insufficient data');
      return null;
    }
    
    const lastInjection = data[0];
    const secondLastInjection = data[1];
    
    console.log('Last injection full object:', lastInjection);
    console.log('Last injection medication:', lastInjection.medication);
    
    // Skip if last injection doesn't have medication data
    if (!lastInjection.halfLifeMinutes) {
      console.log('Early return: no medication data');
      return null;
    }
    
    const diffInMinutes = (new Date(lastInjection.dateTime).getTime() - new Date(secondLastInjection.dateTime).getTime()) / (1000 * 60);
    
    // Create projections array for stabilization calculation
    const projections = [];
    const lastDate = new Date(lastInjection.dateTime);
    
    // Add daily T-levels for 90 days
    for (let day = 1; day <= 90; day++) {
      const dailyDate = new Date(lastDate.getTime() + day * 24 * 60 * 60 * 1000);
      let totalTLevel = 0;
      
      // Calculate T-level from all injections
      for (const injection of data) {
        if (!injection.halfLifeMinutes) continue; // Skip injections without medication data
        
        const injectionDate = new Date(injection.dateTime);
        const daysSinceInjection = (dailyDate.getTime() - injectionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceInjection >= 0) {
          const halfLifePeriods = daysSinceInjection / (injection.halfLifeMinutes / (24 * 60));
          const remainingDosage = injection.dosage * Math.pow(0.5, halfLifePeriods);
          totalTLevel += remainingDosage;
        }
      }
      
      // Add projected injections
      let currentInjectionDate = new Date(lastDate);
      for (let i = 0; i < 10; i++) {
        currentInjectionDate = new Date(currentInjectionDate.getTime() + diffInMinutes * 60 * 1000);
        const daysSinceProjectedInjection = (dailyDate.getTime() - currentInjectionDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceProjectedInjection >= 0) {
          const halfLifePeriods = daysSinceProjectedInjection / (lastInjection.halfLifeMinutes / (24 * 60));
          const remainingDosage = lastInjection.dosage * Math.pow(0.5, halfLifePeriods);
          totalTLevel += remainingDosage;
        }
      }
      
      projections.push({
        x: dailyDate,
        y: Math.round(totalTLevel)
      });
    }
    
    const result = findStabilizedDate(projections, data, lastInjection, diffInMinutes);
    console.log('Stabilization date result:', result);
    return result;
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
      <Text className="text-white text-2xl font-bold mb-6">Analysis</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8, marginBottom: 20 }}>
        <Text className="text-white text-lg font-semibold mb-4 px-2">Projected Testosterone Levels (90 Days)</Text>
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

      {/* Stabilization explanation */}
      {data.length >= 2 && (() => {
        const lastInjection = data[0];
        const secondLastInjection = data[1];
        const lastDate = new Date(lastInjection.dateTime);
        const secondLastDate = new Date(secondLastInjection.dateTime);
        const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));
        const intervalDays = Math.round(diffInMinutes / (24 * 60));
        
        // Use the stabilization date from the useMemo
        const stabilizationDate = stabilizedDate;
        console.log('Using stabilizationDate in JSX:', stabilizationDate);
        
        return (
          <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <Text className="text-white text-sm leading-6">
              If you continue to inject <Text className="font-semibold text-blue-400">{lastInjection.dosage}mg</Text> every <Text className="font-semibold text-blue-400">{intervalDays}</Text> days then your testosterone levels will stabilize on <Text className="font-semibold text-green-400">{stabilizationDate ? stabilizationDate.toLocaleDateString() : 'TBD'}</Text>.
            </Text>
          </View>
        );
      })()}

      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8 }}>
        <Text className="text-white text-lg font-semibold mb-4 px-2">Injection Site Frequency</Text>
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
            tickFormat={(t) => Math.round(t)}
            tickValues={(() => {
              const maxValue = Math.max(...siteFrequencyData.map(d => d.y), 0);
              const tickCount = maxValue + 1;
              return Array.from({ length: tickCount }, (_, i) => i);
            })()}
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
