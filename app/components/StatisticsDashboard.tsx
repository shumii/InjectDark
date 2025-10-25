import React, { useMemo, useEffect, useState, useRef } from "react";
import { View, Text, Dimensions, ScrollView, PanResponder, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryScatter, VictoryBar, VictoryPie } from "victory-native";
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


// Helper function to filter projections after stabilization
const filterProjectionsAfterStabilization = (projections: any[], stabilizedDate: Date | null, lastInjectionDate: Date) => {  
  if (!stabilizedDate) {
    return projections;
  }
  
  // Calculate minimum days (30 days from last injection)
  const minDays = 30;
  const minDate = new Date(lastInjectionDate);
  minDate.setDate(minDate.getDate() + minDays);
  
  // Use the later of stabilized date or minimum date
  const cutoffDate = stabilizedDate > minDate ? stabilizedDate : minDate;
  
  // Filter projections to only include data up to cutoff date
  const filtered = projections.filter(proj => {
    const projDate = new Date(proj.x);
    return projDate <= cutoffDate;
  });
  
  return filtered;
};

const StatisticsDashboard = () => {
  const [data, setData] = useState<any[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const screenWidth = Dimensions.get("window").width - 32;
  const chartWidth = screenWidth;
  const touchStartTime = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data on mount
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
          
          // Sort by date descending (newest first) to ensure data[0] is most recent
          const sortedData = cleanedData.sort((a: any, b: any) => 
            new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
          
          // If we made changes, save the cleaned data back to storage
          if (JSON.stringify(cleanedData) !== storedInjections) {
            await AsyncStorage.setItem("injections", JSON.stringify(cleanedData));
          }
          
          setData(sortedData);
        } else {
          setData([]);
        }
      } catch (e) {
        setData([]);
      }
    };
    loadInjections();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
    const timeSeries = dateRange.map(dateStr => {
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
      
      const roundedTLevel = Math.round(tLevel);
      return { x: new Date(currentDate), y: roundedTLevel };
    });
    
    return timeSeries;
  }, [data]);

  const lastInjection = useMemo(() => {
    return data[0];
  }, [data]);

  // Project 90 days of future injections and T-levels, starting from last real day
  const projectedData = useMemo(() => {
    if (data.length < 2 || tLevelTimeSeries.length === 0) return [];
    
    const secondLastInjection = data[1];
    const lastDate = new Date(lastInjection.dateTime);
    const secondLastDate = new Date(secondLastInjection.dateTime);
    const diffInMinutes = Math.floor((lastDate.getTime() - secondLastDate.getTime()) / (1000 * 60));
    
    // Start from the last injection date and add the interval to get the next injection
    let currentDate = new Date(lastDate);
    const projections = [];
    
    // Show daily T-levels for all 90 days, with projected injections added at the correct intervals
    let dailyDate = new Date(lastDate);
    let nextInjectionDate = new Date(currentDate.getTime() +(diffInMinutes * (60 * 1000))); 
    let injectionCount = 0;
    
    for (let day = 1; day <= 90; day++) {
      dailyDate.setDate(dailyDate.getDate() + 1);
      
      // Create array of all injections (real + projected up to this day)
      let allInjections = [...data];
      
      // Add projected injections up to this day
      let tempInjectionDate = new Date(currentDate.getTime() + (diffInMinutes * (60 * 1000)));
      for (let i = 0; i < injectionCount; i++) {
        const site = i % 2 === 0 ? lastInjection.injectionSite : getOppositeSite(lastInjection.injectionSite);
        const projectedInjection = {
          ...lastInjection,
          dateTime: tempInjectionDate.toISOString(),
          injectionSite: site,
        };
        allInjections = [projectedInjection, ...allInjections];
        tempInjectionDate = new Date(tempInjectionDate.getTime() + (diffInMinutes * (60 * 1000)));
      }
      
      let addedInjectionToday = false;
      
      // Check if we need to add a projected injection on this day
      if (dailyDate.toDateString() === nextInjectionDate.toDateString()) {
        const site = injectionCount % 2 === 0 ? lastInjection.injectionSite : getOppositeSite(lastInjection.injectionSite);
        
        const projectedInjection = {
          ...lastInjection,
          dateTime: nextInjectionDate.toISOString(),
          injectionSite: site,
        };
        
        allInjections = [projectedInjection, ...allInjections];
        injectionCount++;
        addedInjectionToday = true;
        
        dailyDate.setTime(nextInjectionDate.getTime());
        
        // Calculate next injection date
        nextInjectionDate = new Date(nextInjectionDate.getTime() + (diffInMinutes * (60 * 1000)));
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
      
      allInjections.forEach(injection => {      
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
      
      // Log T-level calculation for each day
      // console.log(`Day ${day} (${dailyDate.toISOString().split('T')[0]}): T-level = ${roundedTLevel}`, {
      //   totalContributions: contributions.length,
      //   contributions: contributions.map(c => ({
      //     date: c.date.split('T')[0],
      //     dosage: c.dosage,
      //     minutesDiff: Math.round(c.minutesDiff),
      //     halfLifePeriods: c.halfLifePeriods.toFixed(2),
      //     decayFactor: c.decayFactor.toFixed(3),
      //     contribution: c.contribution.toFixed(1),
      //     isProjected: c.isProjected
      //   }))
      // });
      
      projections.push({ x: dailyDate.toISOString().split('T')[0], y: roundedTLevel, isInjection: addedInjectionToday });
    }
    
    return projections;
  }, [data, tLevelTimeSeries]);

  // Calculate stabilization date separately
  const stabilizedDate = useMemo(() => {
    if (!projectedData || projectedData.length === 0) return null;
    
    const currentDate = new Date();
    
    // Find injection days using the isInjection flag, but only future dates
    const injectionDays: { date: Date, tLevel: number }[] = [];
    
    for (let i = 0; i < projectedData.length; i++) {
      if (projectedData[i].isInjection) {
        const injectionDate = new Date(projectedData[i].x);
        // Only consider future injection dates
        if (injectionDate > currentDate) {
          injectionDays.push({
            date: injectionDate,
            tLevel: projectedData[i].y
          });
        }
      }
    }
    
    // Look for 3 consecutive injections with T-levels within 2 of each other
    if (injectionDays.length < 3) return null;
    
    let consecutiveCount = 0;
    
    for (let i = 1; i < injectionDays.length; i++) {
      const currentTLevel = injectionDays[i].tLevel;
      const previousTLevel = injectionDays[i - 1].tLevel;
      const difference = Math.abs(currentTLevel - previousTLevel);
      
      if (difference <= 2) {
        consecutiveCount++;
        
        if (consecutiveCount === 3) {
          return injectionDays[i].date; // Return the date of the 3rd consecutive injection
        }
      } else {
        consecutiveCount = 0; // Reset counter if T-levels are too different
      }
    }
    
    return null; // No stabilization found
  }, [projectedData]);

  // Calculate injection site frequency
  const siteFrequencyData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const siteCounts: { [key: string]: number } = {};
    
    data.forEach((injection, index) => {
      const site = injection.injectionSite;
      
      // Only count injections with valid site names
      if (site && site.trim() !== '' && site !== 'undefined' && site !== 'null') {
        siteCounts[site] = (siteCounts[site] || 0) + 1;
      }
    });
    
    return Object.entries(siteCounts).map(([site, count]) => ({
      x: site,
      y: count
    }));
  }, [data]);

  // Helper to convert x (date) to pixel
  function chartXToPixel(x: Date | string) {    
    const filteredProjectedData = filterProjectionsAfterStabilization(projectedData, stabilizedDate, lastInjection?.dateTime);

    if (!filteredProjectedData || filteredProjectedData.length === 0) return 0;
    
    const minX = Math.min(...filteredProjectedData.map(p => new Date(p.x).getTime()));
    const maxX = Math.max(...filteredProjectedData.map(p => new Date(p.x).getTime()));
    const xMs = new Date(x).getTime();

    if (maxX === minX) return (chartWidth - 35 - 30) / 2; // Center in data area
    
    // Calculate position relative to data area width
    const dataAreaWidth = chartWidth - 35 - 30;
    const relativePosition = (xMs - minX) / (maxX - minX);
    return relativePosition * dataAreaWidth;
  }

  // Touch handlers for better iOS compatibility with fast movements
  const handleTouchStart = (evt: any) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Record touch start time to detect tap vs drag
    touchStartTime.current = Date.now();
    
    const x = evt.nativeEvent.locationX || evt.nativeEvent.pageX - 35;
    updateHoveredPoint(x);
  };

  const handleTouchMove = (evt: any) => {
    // Clear any existing timeout when moving
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const x = evt.nativeEvent.locationX || evt.nativeEvent.pageX - 35;
    updateHoveredPoint(x);
  };

  const handleTouchEnd = () => {
    // Calculate touch duration to determine if it was a tap or drag
    const touchDuration = Date.now() - touchStartTime.current;
    const isTap = touchDuration < 200; // Less than 200ms is considered a tap
    
    // For taps, show tooltip for longer (2.5 seconds)
    // For drags, hide quickly (300ms)
    const hideDelay = isTap ? 2500 : 300;
    
    timeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
      timeoutRef.current = null;
    }, hideDelay);
  };

  // Helper function to update hovered point
  const updateHoveredPoint = (x: number) => {
    const filteredProjectedData = filterProjectionsAfterStabilization(projectedData, stabilizedDate, lastInjection?.dateTime);
    
    if (filteredProjectedData && filteredProjectedData.length > 0) {        
      const allPoints = filteredProjectedData.map(point => ({
        ...point,
        xPx: chartXToPixel(point.x),
        label: `${point.y}mg`,
      }));
      
      let closest = null;
      let minDiff = Infinity;
      
      // Only update if x is within reasonable bounds - be more lenient for iOS rapid movements
      if (x >= -20 && x <= (chartWidth - 35 - 30 + 20)) {
        for (const pt of allPoints) {
          const diff = Math.abs(pt.xPx - x);
          if (diff < minDiff) {
            minDiff = diff;
            closest = pt;
          }
        }
        
        if (closest) {
          closest.y = Number(Number(closest.y).toFixed(0));
          closest.label = closest.y.toString() + 'mg';
        }
      }
      
      // Only update if the closest point has actually changed
      setHoveredPoint((prev: any) => {
        if (!prev && !closest) return prev;
        if (!prev || !closest) return closest;
        if (prev.x !== closest.x || prev.y !== closest.y) return closest;
        return prev;
      });
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-900 p-4">
      <Text className="text-white text-2xl font-bold mb-6">Analysis</Text>
      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8, marginBottom: 20 }}>
        <Text className="text-white text-lg font-semibold mb-4 px-2">Projected Testosterone Levels</Text>
        <View style={{ position: "relative", width: chartWidth, height: 250 }} pointerEvents="box-none">
          <VictoryChart
            width={chartWidth}
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
              data={filterProjectionsAfterStabilization(projectedData, stabilizedDate, lastInjection?.dateTime)}
              style={{
                data: {
                  stroke: "#60a5fa",
                  strokeWidth: 2,
                },
              }}
              interpolation="monotoneX"
            />
            <VictoryScatter
              data={filterProjectionsAfterStabilization(projectedData, stabilizedDate, lastInjection?.dateTime)}
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
              width: chartWidth - 35 - 30, // Match chart data area width
              height: 250,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            pointerEvents="auto"
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
                  pointerEvents="none"
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
                  pointerEvents="none"
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
        const intervalDays = diffInMinutes / (24 * 60); // Keep as decimal
        
        // Use the stabilization date from the useMemo
        const stabilizationDate = stabilizedDate;
        
        // Calculate days from current date to stabilization date
        const currentDate = new Date();
        const daysToStabilization = stabilizationDate ? 
          Math.ceil((stabilizationDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) : 
          null;
        
        return (
          <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <Text className="text-white text-sm leading-6">
              If you continue to inject <Text className="font-semibold text-blue-400">{lastInjection.dosage}mg</Text> every <Text className="font-semibold text-blue-400">{intervalDays.toFixed(1)}</Text> days then your testosterone levels will stabilize on <Text className="font-semibold text-green-400">{stabilizationDate ? stabilizationDate.toLocaleDateString() : 'TBD'}</Text>{daysToStabilization ? <Text className="font-semibold text-green-400"> ({daysToStabilization} days)</Text> : ''}.
            </Text>
          </View>
        );
      })()}

      <View style={{ backgroundColor: '#232b36', borderRadius: 16, padding: 8 }}>
        <Text className="text-white text-lg font-semibold mb-4 px-2">Injection Site Frequency</Text>
        <VictoryPie
          width={chartWidth}
          height={250}
          data={siteFrequencyData}
          colorScale={["#8b5cf6", "#60a5fa", "#a855f7", "#3b82f6", "#7c3aed", "#2563eb", "#9333ea", "#1d4ed8"]}
          style={{
            labels: {
              fill: "transparent"
            }
          }}
          innerRadius={60}
          padAngle={2}
        />
        {/* Legend */}
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          marginTop: 15,
          paddingHorizontal: 20
        }}>
          {siteFrequencyData.map((item, index) => {
            const colors = ["#8b5cf6", "#60a5fa", "#a855f7", "#3b82f6", "#7c3aed", "#2563eb", "#9333ea", "#1d4ed8"];
            const total = siteFrequencyData.reduce((sum, d) => sum + d.y, 0);
            const percentage = ((item.y / total) * 100).toFixed(1);
            
            return (
              <View key={item.x} style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                margin: 8,
                backgroundColor: '#1f2937',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                minWidth: 120
              }}>
                <View style={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: colors[index % colors.length], 
                  borderRadius: 8,
                  marginRight: 10 
                }} />
                <View style={{ flex: 1 }}>
                  <Text className="text-white text-sm font-medium">{item.x}</Text>
                  <Text className="text-gray-400 text-xs">{item.y} injections ({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

export default StatisticsDashboard;
