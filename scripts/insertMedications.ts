import AsyncStorage from '@react-native-async-storage/async-storage';

const medications = [
  { name: "Testosterone Enanthate 300", halfLifeDescription: "4 days", halfLifeMinutes: 5760, concentration: 300 },
  { name: "Testosterone Cypionate 200", halfLifeDescription: "8 days", halfLifeMinutes: 11520, concentration: 200 },
  { name: "Testosterone Cypionate 250", halfLifeDescription: "8 days", halfLifeMinutes: 11520, concentration: 250 },  
  { name: "Testosterone Propionate", halfLifeDescription: "2 days", halfLifeMinutes: 2880, concentration: 100 }
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