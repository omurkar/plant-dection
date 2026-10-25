export type PlantData = {
  id: string;
  name: string;
  isNative: boolean;
  isInvasive: boolean;
  carbonOffsetKgPerYear: number;
  pollinatorFriendly: string[];
  compostCategory: 'Green' | 'Brown';
};

export const MOCK_PLANT_DATABASE: Record<string, PlantData> = {
  tulsi: { id: '1', name: 'Holy Basil (Tulsi)', isNative: true, isInvasive: false, carbonOffsetKgPerYear: 1.2, pollinatorFriendly: ['Bees'], compostCategory: 'Green' },
  lantana: { id: '2', name: 'Lantana Camara', isNative: false, isInvasive: true, carbonOffsetKgPerYear: 0.8, pollinatorFriendly: ['Butterflies'], compostCategory: 'Brown' },
  neem: { id: '3', name: 'Neem Tree', isNative: true, isInvasive: false, carbonOffsetKgPerYear: 15.0, pollinatorFriendly: ['Birds', 'Bees'], compostCategory: 'Brown' },
  aloe: { id: '4', name: 'Aloe Vera', isNative: false, isInvasive: false, carbonOffsetKgPerYear: 0.6, pollinatorFriendly: ['Hummingbirds'], compostCategory: 'Green' },
  basil: { id: '5', name: 'Basil', isNative: false, isInvasive: false, carbonOffsetKgPerYear: 0.7, pollinatorFriendly: ['Bees'], compostCategory: 'Green' },
  'snake plant': { id: '6', name: 'Snake Plant', isNative: false, isInvasive: false, carbonOffsetKgPerYear: 0.9, pollinatorFriendly: ['Bees'], compostCategory: 'Brown' },
  mango: { id: '7', name: 'Mango', isNative: true, isInvasive: false, carbonOffsetKgPerYear: 8.5, pollinatorFriendly: ['Bees', 'Birds'], compostCategory: 'Brown' },
  banyan: { id: '8', name: 'Banyan Tree', isNative: true, isInvasive: false, carbonOffsetKgPerYear: 12.0, pollinatorFriendly: ['Birds'], compostCategory: 'Brown' },
};

export const shouldWaterOutdoorPlants = (currentCondition: string = 'Heavy Monsoon Rain'): boolean => {
  const rainyConditions = ['Rain', 'Heavy Monsoon Rain', 'Drizzle', 'Thunderstorm', 'Monsoon', 'Cloudy with rain'];
  return !rainyConditions.includes(currentCondition);
};

export const diagnosePlantLocally = (imageFeatures: string) => {
  const normalized = imageFeatures.toLowerCase();

  if (normalized.includes('white spots') || normalized.includes('powdery')) {
    return {
      issue: 'Powdery Mildew',
      ecoRemedy: 'Mix 1 tablespoon baking soda with 1 teaspoon dormant oil and liquid soap in 1 gallon of water. Spray on leaves.'
    };
  }

  if (normalized.includes('yellow') || normalized.includes('curl')) {
    return {
      issue: 'Leaf Yellowing',
      ecoRemedy: 'Improve drainage and avoid overwatering. Spray a diluted neem solution on the undersides of new leaves.'
    };
  }

  return {
    issue: 'Aphids',
    ecoRemedy: 'Apply a cold water spray to dislodge them, followed by a light organic Neem oil spray.'
  };
};

export const calculateCompostRatio = (userPlants: PlantData[]) => {
  const greens = userPlants.filter((p) => p.compostCategory === 'Green').length;
  const browns = userPlants.filter((p) => p.compostCategory === 'Brown').length;

  return {
    currentRatio: `${browns} Browns : ${greens} Greens`,
    advice: browns < greens * 3
      ? 'Add more browns (dry leaves, cardboard) to balance your green plant waste.'
      : 'Great compost balance! Keep adding vegetable scraps (greens).'
  };
};

export const getLocalEcoCommunityData = () => {
  return {
    nearbySwaps: [
      { user: 'Jagruti M.', offering: 'Tulsi cuttings', seeking: 'Aloe Vera', location: 'Goregaon East' },
      { user: 'Om M.', offering: 'Extra Neem Seeds', seeking: 'Any native flowering plant', location: 'Kandivali' },
      { user: 'Aisha K.', offering: 'Spider Plant', seeking: 'Basil', location: 'Andheri West' }
    ],
    biodiversityPins: [
      { species: 'Banyan Tree', lat: 19.1692, lng: 72.8461, loggedBy: 'Anonymous' },
      { species: 'Neem Tree', lat: 19.1466, lng: 72.8639, loggedBy: 'Community' }
    ]
  };
};

export const getUserEcoProfile = (userPlants: PlantData[]) => {
  const nativeCount = userPlants.filter((p) => p.isNative).length;
  const totalCarbonOffset = userPlants.reduce((sum, plant) => sum + plant.carbonOffsetKgPerYear, 0);
  const badges: string[] = [];

  if (nativeCount >= 3) badges.push('Native Flora Champion 🌿');
  if (totalCarbonOffset > 10) badges.push('Carbon Crusher ☁️');
  if (userPlants.some((p) => p.isInvasive)) badges.push('Invasive Watcher 🛡️');

  return {
    totalCarbonOffset,
    badges,
    tasks: {
      urgent: 'Pause watering! Monsoon rain detected.',
      seasonal: 'Pre-monsoon pruning recommended for your outdoor Neem tree.'
    }
  };
};
