export interface ScanResult {
  diseaseName: string;
  cure: string;
  confidence: number;
}

export const analyzePlantImage = async (imageFile: File): Promise<ScanResult> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        diseaseName: 'Leaf Spot',
        cure: 'Remove affected leaves and apply fungicide',
        confidence: 85
      });
    }, 2000);
  });
};