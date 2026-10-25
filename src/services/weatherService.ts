export interface ClimateData {
  temperature: string;
  humidity: string;
  recommendations: string[];
}

export const shouldWaterOutdoorPlants = (currentCondition: string = 'Heavy Monsoon Rain'): boolean => {
  const rainyConditions = ['Rain', 'Heavy Monsoon Rain', 'Drizzle', 'Thunderstorm', 'Monsoon', 'Cloudy with rain'];
  return !rainyConditions.includes(currentCondition);
};

export const getClimateByPin = (pin: string): ClimateData => {
  // Mock climate data based on PIN with a Mumbai/Maharashtra fallback for the app
  const normalizedPin = pin?.trim() || '400001';

  if (normalizedPin.startsWith('4') || normalizedPin.startsWith('5')) {
    return {
      temperature: 'Warm and humid',
      humidity: 'High',
      recommendations: ['Tulsi', 'Neem', 'Basil']
    };
  } else if (normalizedPin.startsWith('1') || normalizedPin.startsWith('2')) {
    return {
      temperature: 'Hot',
      humidity: 'Low to medium',
      recommendations: ['Cactus', 'Succulents', 'Aloe Vera']
    };
  } else {
    return {
      temperature: 'Mild to cool',
      humidity: 'Medium to high',
      recommendations: ['Fern', 'Moss', 'Banyan']
    };
  }
};