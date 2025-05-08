import React, { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

interface BodyDiagramProps {
  onSiteSelect?: (site: string) => void;
  selectedSite?: string;
  heatmapData?: Record<string, number>;
  mode?: "select" | "heatmap";
}

const injectionSites = {
  "left-arm": { x: 80, y: 150, label: "Left Arm" },
  "right-arm": { x: 220, y: 150, label: "Right Arm" },
  "left-thigh": { x: 110, y: 280, label: "Left Thigh" },
  "right-thigh": { x: 190, y: 280, label: "Right Thigh" },
  abdomen: { x: 150, y: 200, label: "Abdomen" },
  "left-buttock": { x: 120, y: 230, label: "Left Buttock" },
  "right-buttock": { x: 180, y: 230, label: "Right Buttock" },
  "left-calf": { x: 110, y: 350, label: "Left Calf" },
  "right-calf": { x: 190, y: 350, label: "Right Calf" },
};

export default function BodyDiagram({
  onSiteSelect = () => {},
  selectedSite = "",
  heatmapData = {},
  mode = "select",
}: BodyDiagramProps) {
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);

  const getCircleColor = (siteId: string) => {
    if (mode === "select") {
      return selectedSite === siteId ? "#3b82f6" : "rgba(255, 255, 255, 0.5)";
    } else {
      // Heatmap mode
      const count = heatmapData[siteId] || 0;
      if (count === 0) return "rgba(255, 255, 255, 0.2)";
      if (count < 3) return "rgba(59, 130, 246, 0.5)";
      if (count < 6) return "rgba(59, 130, 246, 0.8)";
      return "rgba(59, 130, 246, 1)";
    }
  };

  return (
    <View className="bg-gray-900 p-4 rounded-lg w-full items-center">
      <Text className="text-white text-lg mb-4">
        {mode === "select"
          ? "Select Injection Site"
          : "Injection Site Frequency"}
      </Text>

      <View className="relative w-[300px] h-[400px] items-center justify-center">
        <Svg width="300" height="400" viewBox="0 0 300 400">
          {/* Simple body outline */}
          <Path
            d="M150,50 C180,50 200,70 200,90 C200,110 190,120 190,140 
               L190,250 C190,270 200,280 200,300 C200,340 180,380 150,380 
               C120,380 100,340 100,300 C100,280 110,270 110,250 
               L110,140 C110,120 100,110 100,90 C100,70 120,50 150,50 Z"
            fill="#1f2937"
            stroke="#4b5563"
            strokeWidth="2"
          />

          {/* Head */}
          <Circle
            cx="150"
            cy="30"
            r="20"
            fill="#1f2937"
            stroke="#4b5563"
            strokeWidth="2"
          />

          {/* Injection sites */}
          {Object.entries(injectionSites).map(([siteId, { x, y, label }]) => (
            <Circle
              key={siteId}
              cx={x}
              cy={y}
              r={12}
              fill={getCircleColor(siteId)}
              stroke="#4b5563"
              strokeWidth="1"
              opacity={hoveredSite === siteId ? 1 : 0.8}
            />
          ))}
        </Svg>

        {/* Interactive touch areas */}
        {Object.entries(injectionSites).map(([siteId, { x, y, label }]) => (
          <TouchableOpacity
            key={siteId}
            className="absolute w-[40px] h-[40px] items-center justify-center"
            style={{ left: x - 20, top: y - 20 }}
            onPress={() => onSiteSelect(siteId)}
            onPressIn={() => setHoveredSite(siteId)}
            onPressOut={() => setHoveredSite(null)}
          >
            {(hoveredSite === siteId || selectedSite === siteId) && (
              <View className="absolute -top-8 bg-gray-800 px-2 py-1 rounded">
                <Text className="text-white text-xs">{label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {mode === "heatmap" && (
        <View className="flex-row justify-between w-full mt-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-white opacity-20 mr-2" />
            <Text className="text-white text-xs">None</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-blue-500 opacity-50 mr-2" />
            <Text className="text-white text-xs">Low</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-blue-500 opacity-80 mr-2" />
            <Text className="text-white text-xs">Medium</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            <Text className="text-white text-xs">High</Text>
          </View>
        </View>
      )}
    </View>
  );
}
