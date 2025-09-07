import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, SafeAreaView } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pencil, Plus } from "lucide-react-native";

interface Medication {
  id: string;
  name: string;
  halfLifeDescription?: string;
  halfLifeMinutes?: number;
  concentration: number;
}

const MedicationManagementScreen = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

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
      }
    };
    loadMedications();
  }, []);

  const saveMedications = async (newMeds: Medication[]) => {
    try {
      setMedications(newMeds);
      await AsyncStorage.setItem('medications', JSON.stringify(newMeds));
    } catch (error) {
      // Error saving medications
    }
  };

  // Add Medication
  const handleAddMedication = (med: Omit<Medication, 'id'>) => {
    const newMed: Medication = { ...med, id: Date.now().toString() };
    const newMeds = [...medications, newMed];
    saveMedications(newMeds);
    setShowAddModal(false);
  };

  // Edit Medication
  const handleEditMedication = (med: Medication) => {
    const newMeds = medications.map(m => m.id === med.id ? med : m);
    saveMedications(newMeds);
    setShowEditModal(false);
    setEditingMedication(null);
  };

  // AddMedicationForm
  const AddMedicationForm = ({ onSave, onClose }: { onSave: (med: Omit<Medication, 'id'>) => void, onClose: () => void }) => {
    const [name, setName] = useState("");
    const [halfLifeDescription, setHalfLifeDescription] = useState("");
    const [halfLifeMinutes, setHalfLifeMinutes] = useState("");
    const [concentration, setConcentration] = useState("");
    return (
      <View style={{ backgroundColor: '#181c26', padding: 24, borderRadius: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18 }}>Add Medication</Text>
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Half-life Description" placeholderTextColor="#888" value={halfLifeDescription} onChangeText={setHalfLifeDescription} />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Half-life (minutes)" placeholderTextColor="#888" value={halfLifeMinutes} onChangeText={setHalfLifeMinutes} keyboardType="numeric" />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 18 }} placeholder="Concentration (mg/ml)" placeholderTextColor="#888" value={concentration} onChangeText={setConcentration} keyboardType="numeric" />
        <TouchableOpacity style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 10, marginBottom: 10, alignItems: 'center' }} onPress={() => {
          if (!name || !concentration) return Alert.alert('Name and concentration are required');
          onSave({ name, halfLifeDescription, halfLifeMinutes: halfLifeMinutes ? Number(halfLifeMinutes) : undefined, concentration: Number(concentration) });
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ borderColor: '#2563eb', borderWidth: 2, padding: 14, borderRadius: 10, alignItems: 'center' }} onPress={onClose}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // EditMedicationForm
  const EditMedicationForm = ({ medication, onSave, onClose }: { medication: Medication, onSave: (med: Medication) => void, onClose: () => void }) => {
    const [name, setName] = useState(medication.name);
    const [halfLifeDescription, setHalfLifeDescription] = useState(medication.halfLifeDescription || "");
    const [halfLifeMinutes, setHalfLifeMinutes] = useState(medication.halfLifeMinutes?.toString() || "");
    const [concentration, setConcentration] = useState(medication.concentration.toString());
    return (
      <View style={{ backgroundColor: '#181c26', padding: 24, borderRadius: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18 }}>Edit Medication</Text>
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Name" placeholderTextColor="#888" value={name} onChangeText={setName} />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Half-life Description" placeholderTextColor="#888" value={halfLifeDescription} onChangeText={setHalfLifeDescription} />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 }} placeholder="Half-life (minutes)" placeholderTextColor="#888" value={halfLifeMinutes} onChangeText={setHalfLifeMinutes} keyboardType="numeric" />
        <TextInput style={{ backgroundColor: '#23283a', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 18 }} placeholder="Concentration (mg/ml)" placeholderTextColor="#888" value={concentration} onChangeText={setConcentration} keyboardType="numeric" />
        <TouchableOpacity style={{ backgroundColor: '#2563eb', padding: 14, borderRadius: 10, marginBottom: 10, alignItems: 'center' }} onPress={() => {
          if (!name || !concentration) return Alert.alert('Name and concentration are required');
          onSave({ ...medication, name, halfLifeDescription, halfLifeMinutes: halfLifeMinutes ? Number(halfLifeMinutes) : undefined, concentration: Number(concentration) });
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ borderColor: '#2563eb', borderWidth: 2, padding: 14, borderRadius: 10, alignItems: 'center' }} onPress={onClose}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#181c26" }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 24 }}>Medications</Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#2563eb",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 20,
          }}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16, marginLeft: 8 }}>Add Medication</Text>
        </TouchableOpacity>
        <FlatList
          data={medications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: '#23283a', borderRadius: 12, padding: 18, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{item.name}</Text>
                <Text style={{ color: '#a3a3a3', fontSize: 14 }}>{item.concentration} mg/ml</Text>
                {item.halfLifeDescription && <Text style={{ color: '#a3a3a3', fontSize: 12 }}>Half-life: {item.halfLifeDescription}</Text>}
              </View>
              <TouchableOpacity onPress={() => { setEditingMedication(item); setShowEditModal(true); }} style={{ backgroundColor: '#2563eb22', borderRadius: 20, padding: 8 }}>
                <Pencil size={16} color="#60a5fa" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color: "#aaa", textAlign: "center", marginTop: 40 }}>No medications added yet.</Text>}
        />
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ width: '90%', maxWidth: 400 }}>
              <AddMedicationForm onSave={handleAddMedication} onClose={() => setShowAddModal(false)} />
            </View>
          </View>
        </Modal>
        <Modal visible={showEditModal} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ width: '90%', maxWidth: 400 }}>
              {editingMedication && <EditMedicationForm medication={editingMedication} onSave={handleEditMedication} onClose={() => setShowEditModal(false)} />}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default MedicationManagementScreen; 