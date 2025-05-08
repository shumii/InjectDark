import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Calendar, Clock, Check } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface InjectionFormProps {
  onSubmit?: (data: InjectionData) => void;
  isOpen?: boolean;
}

export interface InjectionData {
  medicationName: string;
  dosage: string;
  dateTime: Date;
  injectionSite: string;
}

// Placeholder component for BodyDiagram until the actual component is implemented
const PlaceholderBodyDiagram = ({
  onSelectSite = (site: string) => {},
  selectedSite = "",
}: {
  onSelectSite: (site: string) => void;
  selectedSite: string;
}) => {
  const sites = [
    "Left Arm",
    "Right Arm",
    "Left Thigh",
    "Right Thigh",
    "Abdomen",
  ];

  return (
    <View className="w-full bg-gray-700 p-4 rounded-lg">
      <Text className="text-white text-center mb-4">
        Body Diagram Placeholder
      </Text>
      <View className="flex-row flex-wrap justify-center">
        {sites.map((site) => (
          <TouchableOpacity
            key={site}
            className={`m-2 p-3 rounded-md ${selectedSite === site ? "bg-blue-600" : "bg-gray-600"}`}
            onPress={() => onSelectSite(site)}
          >
            <Text className="text-white">{site}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const InjectionForm = ({
  onSubmit = () => {},
  isOpen = true,
}: InjectionFormProps) => {
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [injectionSite, setInjectionSite] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!medicationName.trim()) {
      newErrors.medicationName = "Medication name is required";
    }

    if (!dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }

    if (!injectionSite) {
      newErrors.injectionSite = "Please select an injection site";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit({
        medicationName,
        dosage,
        dateTime,
        injectionSite,
      });

      // Reset form
      setMedicationName("");
      setDosage("");
      setDateTime(new Date());
      setInjectionSite("");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const currentDateTime = new Date(dateTime);
      currentDateTime.setFullYear(selectedDate.getFullYear());
      currentDateTime.setMonth(selectedDate.getMonth());
      currentDateTime.setDate(selectedDate.getDate());
      setDateTime(currentDateTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDateTime = new Date(dateTime);
      currentDateTime.setHours(selectedTime.getHours());
      currentDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(currentDateTime);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ScrollView className="bg-gray-900 p-4">
      <View className="bg-gray-800 rounded-lg p-5 mb-5">
        <Text className="text-2xl font-bold text-white mb-6">
          Add Injection
        </Text>

        <View className="mb-4">
          <Text className="text-white text-base mb-2">Medication Name</Text>
          <TextInput
            className={`bg-gray-700 text-white p-3 rounded-md ${errors.medicationName ? "border border-red-500" : ""}`}
            placeholder="Enter medication name"
            placeholderTextColor="#9ca3af"
            value={medicationName}
            onChangeText={setMedicationName}
          />
          {errors.medicationName && (
            <Text className="text-red-500 mt-1">{errors.medicationName}</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-white text-base mb-2">Dosage</Text>
          <TextInput
            className={`bg-gray-700 text-white p-3 rounded-md ${errors.dosage ? "border border-red-500" : ""}`}
            placeholder="Enter dosage (e.g., 10mg)"
            placeholderTextColor="#9ca3af"
            value={dosage}
            onChangeText={setDosage}
          />
          {errors.dosage && (
            <Text className="text-red-500 mt-1">{errors.dosage}</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-white text-base mb-2">Date & Time</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-gray-700 p-3 rounded-md mr-2"
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#fff" />
              <Text className="text-white ml-2">{formatDate(dateTime)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center bg-gray-700 p-3 rounded-md ml-2"
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color="#fff" />
              <Text className="text-white ml-2">{formatTime(dateTime)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateTime}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={dateTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        <View className="mb-6">
          <Text className="text-white text-base mb-2">Injection Site</Text>
          <View className="items-center">
            <PlaceholderBodyDiagram
              onSelectSite={(site) => setInjectionSite(site)}
              selectedSite={injectionSite}
            />
          </View>
          {errors.injectionSite && (
            <Text className="text-red-500 mt-1">{errors.injectionSite}</Text>
          )}
          {injectionSite && (
            <Text className="text-green-400 mt-2">
              Selected site: {injectionSite}
            </Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-blue-600 py-4 px-6 rounded-md items-center"
          onPress={handleSubmit}
        >
          <View className="flex-row items-center">
            <Check size={20} color="#fff" />
            <Text className="text-white font-bold text-lg ml-2">
              Save Injection
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default InjectionForm;
