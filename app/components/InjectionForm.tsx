import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { Calendar, Clock, Check, ChevronDown } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface InjectionFormProps {
  onClose: () => void,
  onSave: () => void,
  onSubmit?: (data: InjectionData) => void;
  isOpen?: boolean;
}

export interface InjectionData {
  medicationName: string;
  dosage: string;
  dateTime: Date;
  injectionSite: string;
  halfLife?: string;
}

interface Medication {
  name: string;
  halfLife: string;
}

// Placeholder component for BodyDiagram until the actual component is implemented
const PlaceholderBodyDiagram = ({
  onSelectSite = (site: string) => { },
  selectedSite = "",
}: {
  onSelectSite: (site: string) => void;
  selectedSite: string;
}) => {
  const sites = [

    "Left Delt",
    "Right Delt",
    "Left Arm",
    "Right Arm",
    "Left Glute",
    "Right Glute",
    "Left Thigh",
    "Right Thigh",
    "Abdomen",
  ];

  return (
    <View className="w-full bg-gray-700 p-4 rounded-lg">
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
  onClose,
  onSave,
  onSubmit = () => { },
  isOpen = true,
}: InjectionFormProps) => {
  // List of medications with their half-lives
  const medications: Medication[] = [
    { name: "Insulin Glargine", halfLife: "24 hours" },
    { name: "Insulin Lispro", halfLife: "1 hour" },
    { name: "Insulin Aspart", halfLife: "81 minutes" },
    { name: "Heparin", halfLife: "1-2 hours" },
    { name: "Enoxaparin", halfLife: "4.5 hours" },
    { name: "Morphine", halfLife: "2-3 hours" },
    { name: "Epinephrine", halfLife: "2 minutes" },
    { name: "Methotrexate", halfLife: "3-10 hours" },
    { name: "Vitamin B12", halfLife: "6 days" },
    { name: "Growth Hormone", halfLife: "3.4 hours" },
  ];
  const [medicationName, setMedicationName] = useState("");
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
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
        halfLife: selectedMedication?.halfLife,
      });

      // Reset form
      setMedicationName("");
      setSelectedMedication(null);
      setDosage("");
      setDateTime(new Date());
      setInjectionSite("");

      onSave();
    }
  };

  const handleCancel = () => {
    onClose();
  }

  const handleSelectMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setMedicationName(medication.name);
    setShowMedicationDropdown(false);
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
          <TouchableOpacity
            className={`bg-gray-700 p-3 rounded-md flex-row justify-between items-center ${errors.medicationName ? "border border-red-500" : ""}`}
            onPress={() => setShowMedicationDropdown(true)}
          >
            <Text className="text-white">
              {medicationName || "Select medication"}
            </Text>
            <ChevronDown size={20} color="#fff" />
          </TouchableOpacity>
          {selectedMedication && (
            <Text className="text-gray-400 mt-1">
              Half-life: {selectedMedication.halfLife}
            </Text>
          )}
          {errors.medicationName && (
            <Text className="text-red-500 mt-1">{errors.medicationName}</Text>
          )}
          <Modal
            visible={showMedicationDropdown}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowMedicationDropdown(false)}
          >
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
              activeOpacity={1}
              onPress={() => setShowMedicationDropdown(false)}
            >
              <View className="bg-gray-800 rounded-t-lg absolute bottom-0 left-0 right-0 max-h-96">
                <View className="p-4 border-b border-gray-700">
                  <Text className="text-white text-lg font-bold">
                    Select Medication
                  </Text>
                </View>
                <FlatList
                  data={medications}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="p-4 border-b border-gray-700"
                      onPress={() => handleSelectMedication(item)}
                    >
                      <Text className="text-white text-base">{item.name}</Text>
                      <Text className="text-gray-400 text-sm">
                        Half-life: {item.halfLife}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
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


        <View>
          <Text className="text-white text-base mb-2">How have you been feeling recently?</Text>
          <Text className="text-white text-base mb-2">Mood</Text>
          <Text className="text-white text-base mb-2">Sleep</Text>
          <Text className="text-white text-base mb-2">Libido</Text>
          <Text className="text-white text-base mb-2">Energy</Text>
          <Text className="text-white text-base mb-2">Sides</Text>
        </View>




        <TouchableOpacity
          className="bg-blue-600 py-4 px-6 rounded-md items-center"
          onPress={handleSubmit}
        >
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg ml-2">
              Save
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-red-600 py-4 px-6 rounded-md items-center mt-2"
          onPress={handleCancel}
        >
          <View className="flex-row items-center">

            <Text className="text-white font-bold text-lg ml-2">
              Cancel
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default InjectionForm;
