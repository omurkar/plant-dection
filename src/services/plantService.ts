export interface Plant {
  id: string;
  name: string;
  type: 'indoor' | 'outdoor';
  benefits: string[];
  howToGrow: string;
  status: 'wild' | 'hybrid';
}

export const mockPlants: Plant[] = [
  {
    id: '1',
    name: 'Snake Plant',
    type: 'indoor',
    benefits: ['Air purification', 'Low maintenance'],
    howToGrow: 'Water every 2-3 weeks, indirect light',
    status: 'wild'
  },
  {
    id: '2',
    name: 'Tomato',
    type: 'outdoor',
    benefits: ['Edible fruit', 'Rich in vitamins'],
    howToGrow: 'Full sun, regular watering, support with stakes',
    status: 'hybrid'
  },
  // Add more mock plants
];

export const getPlantsByType = (type: 'indoor' | 'outdoor'): Plant[] => {
  return mockPlants.filter(plant => plant.type === type);
};

export const searchPlants = (query: string): Plant[] => {
  return mockPlants.filter(plant =>
    plant.name.toLowerCase().includes(query.toLowerCase())
  );
};