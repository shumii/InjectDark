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
} from "react-native";
import { Calendar, Clock, Check, ChevronDown, Repeat } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import StarRating from "./StarRating";
import AsyncStorage from "@react-native-async-storage/async-storage";


interface InjectionFormProps {
  onClose: () => void,
  onSave: (data:InjectionData) => void,
  onSubmit?: (data: InjectionData) => void;
  isOpen?: boolean;
  lastInjection?: InjectionData;
  defaultDosageUnit?: 'mg' | 'ml';
  defaultInjectionTime: Date;
  useCurrentTime: boolean;
}

export interface InjectionData {
  id: string;
  medicationName: string;
  dosage: number;
  dateTime: Date;
  injectionSite: string;
  halfLifeDescription?: string;
  halfLifeMinutes?:number;
  concentration?: number;
  moodRating:number;
  sleepRating:number;
  libidoRating:number;
  energyRating:number;
  sidesRating:number;
  notes:string;
}

interface Medication {
  name: string;
  halfLifeDescription?: string;
  halfLifeMinutes?:number;
  concentration: number;
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
  onSave = (data:InjectionData) => {},
  onSubmit = () => { },
  isOpen = true,
  lastInjection,
  defaultDosageUnit = 'mg',
  defaultInjectionTime,
  useCurrentTime,
}: InjectionFormProps) => {
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

  console.log('Last Injection received:', lastInjection); // Debug log

  const [medicationName, setMedicationName] = useState(() => {
    console.log('Setting initial medication name:', lastInjection?.medicationName); // Debug log
    return lastInjection?.medicationName || "";
  });

  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(() => {
    if (lastInjection?.medicationName) {
      const found = medications.find(med => med.name === lastInjection.medicationName);
      console.log('Found medication:', found); // Debug log
      return found || null;
    }
    return null;
  });

  const [showMedicationDropdown, setShowMedicationDropdown] = useState(false);
  const [dosageUnit, setDosageUnit] = useState<'mg' | 'ml'>(defaultDosageUnit);
  
  // Get the current medication's concentration for conversion
  const getCurrentConcentration = () => {
    return selectedMedication?.concentration || 100; // Default to 100mg/ml if not specified
  };

  const [dosage, setDosage] = useState(() => {
    console.log('Setting initial dosage:', lastInjection?.dosage); // Debug log
    
    // If default unit is ml and we have a dosage and medication, convert from mg to ml
    if (defaultDosageUnit === 'ml' && lastInjection?.dosage && selectedMedication?.concentration) {
      const mlValue = (lastInjection.dosage / selectedMedication.concentration).toFixed(2);
      console.log('Converting initial dosage to ml:', mlValue);
      return mlValue;
    }
    
    return lastInjection?.dosage?.toString() || "";
  });

  const [dateTime, setDateTime] = useState(() => {    
    if (useCurrentTime) {
      return new Date();
    }
    const currentDate = new Date();
    currentDate.setHours(defaultInjectionTime.getHours(), defaultInjectionTime.getMinutes(), defaultInjectionTime.getSeconds(), defaultInjectionTime.getMilliseconds());
    return currentDate;
  });

  const [injectionSite, setInjectionSite] = useState(() => {
    console.log('Setting initial injection site:', lastInjection?.injectionSite); // Debug log
    return lastInjection?.injectionSite || "";
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedMoodRating, setSelectedMoodRating] = useState(0);
  const [selectedSleepRating, setSelectedSleepRating] = useState(0);
  const [selectedLibidoRating, setSelectedLibidoRating] = useState(0);
  const [selectedEnergyRating, setSelectedEnergyRating] = useState(0);
  const [selectedSidesRating, setSelectedSidesRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

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
        id: new Date().getTime().toString(),
        medicationName,
        dosage: dosageInMg, // Save dosage in mg
        dateTime,
        injectionSite,
        halfLifeDescription: selectedMedication?.halfLifeDescription,
        halfLifeMinutes: selectedMedication?.halfLifeMinutes,
        concentration: selectedMedication?.concentration, // Save the concentration
        moodRating: selectedMoodRating,
        sleepRating: selectedSleepRating,
        libidoRating: selectedLibidoRating,
        energyRating: selectedEnergyRating,
        sidesRating: selectedSidesRating,
        notes
      });

      // Reset form
      setMedicationName("");
      setSelectedMedication(null);
      setDosage("");
      setDosageUnit(defaultDosageUnit); // Reset to default
      setDateTime(new Date());
      setInjectionSite("");         

      setSelectedMoodRating(0);
      setSelectedSleepRating(0);
      setSelectedLibidoRating(0);
      setSelectedEnergyRating(0);
      setSelectedSidesRating(0);

      setNotes("");
    }
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

  const handleCancel = () => {
    onClose();
  }

  const handleSelectMedication = (medication: Medication) => {
    setSelectedMedication(medication);
    setMedicationName(medication.name);
    setShowMedicationDropdown(false);
    
    // If currently in ml, recalculate dosage with new concentration
    if (dosageUnit === 'ml' && dosage !== '') {
      // Keep the same ml amount, but the mg equivalent will change based on new concentration
      setDosage(dosage);
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
    // Don't close the time picker automatically
    // Only update the time if a time was selected
    if (selectedTime) {
      const currentDateTime = new Date(dateTime);
      currentDateTime.setHours(selectedTime.getHours());
      currentDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(currentDateTime);
    }
  };

  const handleMoodRatingChange = (rating:number) =>{
    setSelectedMoodRating(rating);
  }

  const handleSleepRatingChange = (rating:number) =>{
    setSelectedSleepRating(rating);
  }

  const handleLibidoRatingChange = (rating:number) =>{
    setSelectedLibidoRating(rating);
  }

  const handleEnergyRatingChange = (rating:number) =>{
    setSelectedEnergyRating(rating);
  }

  const handleSidesRatingChange = (rating:number) =>{
    setSelectedSidesRating(rating);
  }

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

        <View className="mb-4">
          <Text className="text-white text-base mb-2">Dosage</Text>
          <View className="flex-row items-center">
            <TextInput
              className={`flex-1 bg-gray-700 text-white p-3 rounded-l-md ${errors.dosage ? "border border-red-500" : ""}`}
              placeholder={`Enter dosage (${dosageUnit})`}
              placeholderTextColor="#9ca3af"
              value={dosage}
              keyboardType="numeric"
              onChangeText={(value)=>{
                setDosage(value.replace(/[^0-9.]/g, ''));
              }}            
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
          {dosageUnit === 'ml' && dosage && !isNaN(Number(dosage)) && selectedMedication && selectedMedication.concentration > 0 && (
            <Text className="text-gray-400 text-xs">
              Equivalent to {Math.round(parseFloat(dosage) * selectedMedication.concentration)}mg
            </Text>
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
            <Modal
              transparent={true}
              animationType="fade"
              visible={showDatePicker}
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}}>
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  paddingBottom: 20,
                }}>
                  <View style={{padding: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e5e5e5'}}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={{color: '#007AFF', fontSize: 16}}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={{color: '#007AFF', fontSize: 16}}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{width: '100%', alignItems: 'center'}}>
                    <DateTimePicker
                      testID="datePicker"
                      value={dateTime}
                      mode="date"
                      display="inline"
                      onChange={handleDateChange}
                      style={{
                        height: 350,
                        width: '100%',
                        marginHorizontal: -10,
                      }}
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
              <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)'}}>
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  paddingBottom: 20,
                }}>
                  <View style={{padding: 10, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e5e5e5'}}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={{color: '#007AFF', fontSize: 16}}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={{fontWeight: 'bold', fontSize: 16}}>Select Time</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={{color: '#007AFF', fontSize: 16}}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{width: '100%', alignItems: 'center', paddingVertical: 20}}>
                    <DateTimePicker
                      testID="timePicker"
                      value={dateTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={{
                        width: '100%',
                      }}
                    />
                  </View>
                </View>
              </View>
            </Modal>
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
          {/* {injectionSite && (
            <Text className="text-green-400 mt-2">
              Selected site: {injectionSite}
            </Text>
          )} */}
        </View>


        <View>
          <Text className="text-white text-base mb-2">How have you been feeling recently?</Text>
          <Text className="text-white text-base mb-2">Mood</Text>
          <StarRating onRatingChange={handleMoodRatingChange}></StarRating>
          <Text className="text-white text-base mb-2">Sleep</Text>
          <StarRating onRatingChange={handleSleepRatingChange}></StarRating>
          <Text className="text-white text-base mb-2">Libido</Text>
          <StarRating onRatingChange={handleLibidoRatingChange}></StarRating>
          <Text className="text-white text-base mb-2">Energy</Text>
          <StarRating onRatingChange={handleEnergyRatingChange}></StarRating>
          <Text className="text-white text-base mb-2">Side Effects</Text>
          <StarRating onRatingChange={handleSidesRatingChange}></StarRating>
        </View>

        <View className="mb-7">
        <Text className="text-white text-base mb-2">Notes</Text>
          <TextInput multiline={true} className={'bg-gray-700 text-white p-3 rounded-md'} style={{height:80}}></TextInput>
        </View>



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
