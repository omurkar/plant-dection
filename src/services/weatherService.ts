export interface ClimateData {
  temperature: string;
  humidity: string;
  recommendations: string[];
}

export const getClimateByPin = (pin: string): ClimateData => {
  // Mock climate data based on PIN
  if (pin.startsWith('1')) {
    return {
      temperature: 'Hot',
      humidity: 'Low',
      recommendations: ['Cactus', 'Succulents']
    };
  } else if (pin.startsWith('2')) {
    return {
      temperature: 'Mild',
      humidity: 'Medium',
      recommendations: ['Tomatoes', 'Herbs']
    };
  } else {
    return {
      temperature: 'Cool',
      humidity: 'High',
      recommendations: ['Fern', 'Moss']
    };
  }
};