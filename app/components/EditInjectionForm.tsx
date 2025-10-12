import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Calendar, Clock, Check, ChevronDown, Repeat } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import SatisfactionRating from "./SatisfactionRating";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EditInjectionFormProps {
  onClose: () => void,
  onSave: (data: InjectionData) => void,
  injection: InjectionData;
}

export interface InjectionData {
  id: string;
  medicationName: string;
  dosage: number;
  dateTime: Date;
  injectionSite: string;
  halfLifeDescription?: string;
  halfLifeMinutes?: number;
  concentration?: number;
  moodRating: number;
  sleepRating: number;
  libidoRating: number;
  energyRating: number;
  sidesRating: number;
  notes: string;
}

interface Medication {
  name: string;
  halfLifeDescription?: string;
  halfLifeMinutes?: number;
  concentration: number;
}

const EditInjectionForm = ({
  onClose,
  onSave,
  injection,
}: EditInjectionFormProps) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  // Load medications from AsyncStorage
  useEffect(() => {
    const loadMedications = async () => {
      try {
        const stored = await AsyncStorage.getItem('medications');
        if (stored) {
          const parsed = JSON.parse(stored);
          setMedications(parsed);
        }
      } catch (error) {
        console.error('Error loading medications:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMedications();
  }, []);

  // Set selectedMedication after medications are loaded
  useEffect(() => {
    if (medications.length > 0 && !selectedMedication) {
      const found = medications.find(med => med.name === injection.medicationName);
      setSelectedMedication(found || null);
    }
  }, [medications, injection.medicationName, selectedMedication]);

  const [medicationName, setMedicationName] = useState(injection.medicationName);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [dosageUnit, setDosageUnit] = useState<'mg' | 'ml'>('mg');
  const [dosage, setDosage] = useState(injection.dosage.toString());
  const [dateTime, setDateTime] = useState(new Date(injection.dateTime));
  const [injectionSite, setInjectionSite] = useState(injection.injectionSite);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMoodRating, setSelectedMoodRating] = useState(injection.moodRating);
  const [selectedSleepRating, setSelectedSleepRating] = useState(injection.sleepRating);
  const [selectedLibidoRating, setSelectedLibidoRating] = useState(injection.libidoRating);
  const [selectedEnergyRating, setSelectedEnergyRating] = useState(injection.energyRating);
  const [selectedSidesRating, setSelectedSidesRating] = useState(injection.sidesRating);
  const [notes, setNotes] = useState(injection.notes);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load dosage unit preference and convert dosage if needed
  useEffect(() => {
    const loadDosageUnitPreference = async () => {
      try {
        const storedUnit = await AsyncStorage.getItem('defaultDosageUnit');
        if (storedUnit && (storedUnit === 'mg' || storedUnit === 'ml')) {
          setDosageUnit(storedUnit as 'mg' | 'ml');
          
          // If preference is ml and we have a medication with concentration, convert the dosage
          if (storedUnit === 'ml' && selectedMedication?.concentration) {
            const mlValue = (injection.dosage / selectedMedication.concentration).toFixed(2);
            setDosage(mlValue);
          }
        }
      } catch (error) {
        console.error('Error loading dosage unit preference:', error);
      }
    };
    
    loadDosageUnitPreference();
  }, [selectedMedication]);

  // Get the current medication's concentration for conversion
  const getCurrentConcentration = () => {
    return selectedMedication?.concentration || 100; // Default to 100mg/ml if not specified
  };

  // Function to toggle between mg and ml
  const toggleDosageUnit = () => {
    const concentration = getCurrentConcentration();
    
    if (dosage && !isNaN(Number(dosage))) {
      if (dosageUnit === 'mg') {
        // Convert from mg to ml
        setDosage((Number(dosage) / concentration).toFixed(2));
        setDosageUnit('ml');
      } else {
        // Convert from ml to mg
        setDosage(Math.round(Number(dosage) * concentration).toString());
        setDosageUnit('mg');
      }
    } else {
      setDosageUnit(prevUnit => prevUnit === 'mg' ? 'ml' : 'mg');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!medicationName.trim()) {
      newErrors.medicationName = "Medication name is required";
    }
    if (!dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    } else if (isNaN(Number(dosage))) {
      newErrors.dosage = "Dosage must be a number";
    }
    if (!injectionSite) {
      newErrors.injectionSite = "Please select an injection site";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const concentration = getCurrentConcentration();
      
      // Convert dosage to mg if currently in ml
      const dosageInMg = dosageUnit === 'ml' 
        ? Number(dosage) * concentration 
        : Number(dosage);
      
      onSave({
        ...injection,
        medicationName,
        dosage: dosageInMg,
        dateTime,
        injectionSite,
        halfLifeDescription: selectedMedication?.halfLifeDescription,
        halfLifeMinutes: selectedMedication?.halfLifeMinutes,
        concentration: selectedMedication?.concentration,
        moodRating: selectedMoodRating,
        sleepRating: selectedSleepRating,
        libidoRating: selectedLibidoRating,
        energyRating: selectedEnergyRating,
        sidesRating: selectedSidesRating,
        notes,
      });
    }
  };

  const handleSelectMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setMedicationName(medication.name);
    setShowMedicationDropdown(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const currentDateTime = new Date(dateTime);
      currentDateTime.setFullYear(selectedDate.getFullYear());
      currentDateTime.setMonth(selectedDate.getMonth());
      currentDateTime.setDate(selectedDate.getDate());
      setDateTime(currentDateTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const currentDateTime = new Date(dateTime);
        currentDateTime.setHours(selectedTime.getHours());
        currentDateTime.setMinutes(selectedTime.getMinutes());
        setDateTime(currentDateTime);
      }
    } else {
      // iOS behavior - keep picker open, only update time
      if (selectedTime) {
        const currentDateTime = new Date(dateTime);
        currentDateTime.setHours(selectedTime.getHours());
        currentDateTime.setMinutes(selectedTime.getMinutes());
        setDateTime(currentDateTime);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView className="bg-gray-900 p-4">
        <View className="bg-gray-800 rounded-lg p-5 mb-5">
          <Text className="text-2xl font-bold text-white mb-6">
            Edit Injection
        </Text>
        {/* Medication Name */}
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
            <View className="mt-1">
              <Text className="text-gray-400">
                Half-life: {selectedMedication.halfLifeDescription}
              </Text>
            </View>
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
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-gray-400 text-sm">
                          Half-life: {item.halfLifeDescription}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          {item.concentration}mg/ml
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
        {/* Dosage */}
        <View className="mb-4">
          <Text className="text-white text-base mb-2">Dosage</Text>
          <View className="flex-row items-center">
            <TextInput
              className={`flex-1 bg-gray-700 text-white p-3 rounded-l-md ${errors.dosage ? "border border-red-500" : ""}`}
              placeholder={`Enter dosage (${dosageUnit})`}
              placeholderTextColor="#9ca3af"
              value={dosage}
              keyboardType="numeric"
              onChangeText={(value) => setDosage(value.replace(/[^0-9.]/g, ""))}
            />
            <TouchableOpacity
              className="bg-blue-600 p-3 rounded-r-md flex-row items-center"
              onPress={toggleDosageUnit}
            >
              <Repeat size={16} color="white" />
              <Text className="text-white ml-2 font-bold">{dosageUnit}</Text>
            </TouchableOpacity>
          </View>
          {errors.dosage && (
            <Text className="text-red-500 mt-1">{errors.dosage}</Text>
          )}
          {dosageUnit === 'ml' && dosage && !isNaN(Number(dosage)) && selectedMedication && selectedMedication.concentration && selectedMedication.concentration > 0 && (
            <Text className="text-gray-400 text-xs mt-1">
              Equivalent to {Math.round(parseFloat(dosage) * selectedMedication.concentration)}mg
            </Text>
          )}
        </View>
        {/* Date & Time */}
        <View className="mb-4">
          <Text className="text-white text-base mb-2">Date & Time</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-gray-700 p-3 rounded-md mr-2"
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color="#fff" />
              <Text className="text-white ml-2">{dateTime.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-gray-700 p-3 rounded-md ml-2"
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color="#fff" />
              <Text className="text-white ml-2">{dateTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingBottom: 20 }}>
                  <View style={{ padding: 10, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e5e5e5" }}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={{ color: "#007AFF", fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{ fontWeight: "bold", fontSize: 16 }}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={{ color: "#007AFF", fontSize: 16 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: "100%", alignItems: "center" }}>
                    <DateTimePicker
                      testID="datePicker"
                      value={dateTime}
                      mode="date"
                      display="inline"
                      onChange={handleDateChange}
                      style={{ height: 350, width: "100%", marginHorizontal: -10 }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          )}
          {showTimePicker && (
            <Modal
              transparent={true}
              animationType="fade"
              visible={showTimePicker}
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingBottom: 20 }}>
                  <View style={{ padding: 10, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e5e5e5" }}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={{ color: "#007AFF", fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{ fontWeight: "bold", fontSize: 16 }}>Select Time</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={{ color: "#007AFF", fontSize: 16 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: "100%", alignItems: "center", paddingVertical: 20 }}>
                    <DateTimePicker
                      testID="timePicker"
                      value={dateTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      is24Hour={true}
                      style={{ width: "100%" }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
        {/* Injection Site */}
        <View className="mb-6">
          <Text className="text-white text-base mb-2">Injection Site</Text>
          <TextInput
            className="bg-gray-700 text-white p-3 rounded-md"
            placeholder="Enter injection site"
            placeholderTextColor="#9ca3af"
            value={injectionSite}
            onChangeText={setInjectionSite}
          />
          {errors.injectionSite && (
            <Text className="text-red-500 mt-1">{errors.injectionSite}</Text>
          )}
        </View>
        {/* Ratings */}
        <View>
          <Text className="text-white text-base mb-2">How have you been feeling recently?</Text>
          <Text className="text-white text-base mb-2">Mood</Text>
          <SatisfactionRating onRatingChange={setSelectedMoodRating} initialRating={selectedMoodRating} />
          <Text className="text-white text-base mb-2">Sleep</Text>
          <SatisfactionRating onRatingChange={setSelectedSleepRating} initialRating={selectedSleepRating} />
          <Text className="text-white text-base mb-2">Libido</Text>
          <SatisfactionRating onRatingChange={setSelectedLibidoRating} initialRating={selectedLibidoRating} />
          <Text className="text-white text-base mb-2">Energy</Text>
          <SatisfactionRating onRatingChange={setSelectedEnergyRating} initialRating={selectedEnergyRating} />
          <Text className="text-white text-base mb-2">Side Effects</Text>
          <SatisfactionRating onRatingChange={setSelectedSidesRating} initialRating={selectedSidesRating} />
        </View>
        {/* Notes */}
        <View className="mb-7">
          <Text className="text-white text-base mb-2">Notes</Text>
          <TextInput
            multiline={true}
            className={'bg-gray-700 text-white p-3 rounded-md'}
            style={{ height: 80 }}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
        {/* Save/Cancel Buttons */}
        <TouchableOpacity
          className="bg-blue-500 py-4 px-6 rounded-md items-center"
          onPress={handleSubmit}
        >
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg ml-2">
              Save
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          className="border-blue-500 border-2 py-4 px-6 rounded-md items-center mt-2"
          onPress={onClose}
        >
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg ml-2">
              Cancel
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditInjectionForm; 