import AsyncStorage from '@react-native-async-storage/async-storage';

const medications = [
  { name: "Testosterone Enanthate 300", halfLifeDescription: "4 days", halfLifeMinutes: 1440, concentration: 300 },
  { name: "Testosterone Cypionate 200", halfLifeDescription: "5 days", halfLifeMinutes: 5760, concentration: 200 },
  { name: "Testosterone Cypionate 250", halfLifeDescription: "5 days", halfLifeMinutes: 7200, concentration: 250 },
  { name: "Growth Hormone", halfLifeDescription: "3.4 hours", halfLifeMinutes: 200, concentration: 10 }
];

const insertMedications = async () => {
  try {
    await AsyncStorage.setItem('medications', JSON.stringify(medications));
    console.log('Medications inserted successfully');
  } catch (error) {
    console.error('Error inserting medications:', error);
  }
};

insertMedications(); 