// // import Groq from "groq-sdk";

// // // ⚠️ PASTE YOUR GROQ API KEY HERE ⚠️
// // const API_KEY = "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"; 

// // const groq = new Groq({
// //   apiKey: API_KEY,
// //   dangerouslyAllowBrowser: true 
// // });

// // // --- HELPER 1: JSON CLEANER ---
// // const cleanAndParseJSON = (rawText: string) => {
// //   try {
// //     let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '');
// //     cleanText = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
// //         return char === '\n' || char === '\r' || char === '\t' ? char : '';
// //     });
// //     return JSON.parse(cleanText.trim());
// //   } catch (error) {
// //     // Fallback: manual extract
// //     try {
// //         const firstOpen = rawText.indexOf('{');
// //         const lastClose = rawText.lastIndexOf('}');
// //         if (firstOpen !== -1 && lastClose !== -1) {
// //             return JSON.parse(rawText.substring(firstOpen, lastClose + 1));
// //         }
// //     } catch (e) {}
// //     console.error("JSON Parse Failed:", rawText);
// //     return null; // Return null to handle gracefully
// //   }
// // };

// // // --- HELPER 2: REAL PINCODE LOOKUP (New!) ---
// // // Fetches official Area Name from Indian Post API
// // const getRealLocation = async (pincode: string) => {
// //   try {
// //     // Basic validation: India PIN codes are 6 digits
// //     if (!/^\d{6}$/.test(pincode)) return null;

// //     const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
// //     const data = await response.json();

// //     if (data && data[0].Status === "Success" && data[0].PostOffice) {
// //       // Get the first area name (e.g., "Santacruz East")
// //       const postOffice = data[0].PostOffice[0]; 
// //       return `${postOffice.Name}, ${postOffice.District}`;
// //     }
// //     return null;
// //   } catch (e) {
// //     console.warn("Pin API lookup failed, falling back to AI guess.");
// //     return null;
// //   }
// // };

// // // --- 1. INDOOR / OUTDOOR SEARCH (Updated) ---
// // export const getPlantRecommendation = async (plantName: string, pinCode: string, type: string) => {
// //   if (!API_KEY || API_KEY.includes("PASTE")) {
// //     alert("⛔ Missing API Key in src/api/gemini.ts");
// //     return null;
// //   }

// //   // STEP 1: Get the REAL location name first
// //   const realLocation = await getRealLocation(pinCode);
// //   const locationContext = realLocation ? `The specific location is verified as: ${realLocation}` : "Location verification failed, please estimate based on PIN.";

// //   const prompt = `
// //     Act as a botanical expert for India. 
// //     User Input: "${plantName}" for ${type} (indoor/outdoor) at PIN Code "${pinCode}".
// //     ${locationContext}

// //     TASK:
// //     1. If the location was verified above, use THAT name (e.g. "Vakola, Mumbai") in your response.
// //     2. Verify if the plant is valid.
// //     3. Provide climate details specific to this area.

// //     Respond in STRICT JSON format only.
// //     Structure:
// //     {
// //       "isValidPin": boolean,
// //       "pinError": "Message if PIN is invalid",
// //       "locationName": "${realLocation || "Area Name, City"}", 
// //       "isValidPlant": boolean,
// //       "warning": "Error message if plant invalid",
// //       "isSuitable": boolean, 
// //       "climateSummary": "1 sentence summary starting with 'The climate in [Area Name]...'", 
// //       "recommendation": "1 sentence recommendation", 
// //       "careGuide": { "water": "tip", "sun": "tip", "soil": "tip" } 
// //     }
// //   `;

// //   try {
// //     const completion = await groq.chat.completions.create({
// //       messages: [{ role: "user", content: prompt }],
// //       model: "llama-3.3-70b-versatile", 
// //       temperature: 0.3,
// //       response_format: { type: "json_object" }
// //     });

// //     const content = completion.choices[0]?.message?.content || "{}";
// //     return cleanAndParseJSON(content);

// //   } catch (e: any) {
// //     alert(`❌ Error: ${e.message}`);
// //     return null;
// //   }
// // };

// // // --- 2. VISION SCANNING (Updated for Llama 4) ---
// // export const identifyPlantDisease = async (imageBase64: string) => {
// //   if (!API_KEY || API_KEY.includes("PASTE")) {
// //     alert("⛔ Missing API Key in src/api/gemini.ts");
// //     return null;
// //   }

// //   const formattedImage = imageBase64.startsWith("data:") 
// //     ? imageBase64 
// //     : `data:image/jpeg;base64,${imageBase64}`;

// //   const prompt = `
// //     Act as a plant pathologist. Analyze this image.
// //     1. Identify disease (or if it is Healthy).
// //     2. Cause (1 sentence).
// //     3. Cure (3 short bullet points).

// //     Respond in STRICT JSON format only.
// //     Structure:
// //     { "diseaseName": "...", "cause": "...", "cure": ["step1", "step2"], "isHealthy": boolean }
// //   `;

// //   try {
// //     const completion = await groq.chat.completions.create({
// //       messages: [
// //         {
// //           role: "user",
// //           content: [
// //             { type: "text", text: prompt },
// //             { type: "image_url", image_url: { url: formattedImage } }
// //           ]
// //         }
// //       ],
// //       // ✅ USING LLAMA 4 (Newest Model)
// //       model: "meta-llama/llama-4-scout-17b-16e-instruct", 
// //       temperature: 0.1,
// //       response_format: { type: "json_object" }
// //     });

// //     const content = completion.choices[0]?.message?.content || "{}";
// //     return cleanAndParseJSON(content);

// //   } catch (e: any) {
// //     alert(`❌ Vision Error: ${e.message}`);
// //     return null;
// //   }
// // };

// // // --- 3. FUN FACT GENERATOR ---
// // export const getFunPlantFact = async () => {
// //   if (!API_KEY || API_KEY.includes("PASTE")) return null;

// //   // We add a random number to the prompt to ensure a unique answer each time
// //   const randomSeed = Math.floor(Math.random() * 1000);

// //   const prompt = `
// //     Tell me ONE short, fascinating, and random fun fact about plants. 
// //     It should be unique and surprising. Max 1 sentence. 
// //     Random seed: ${randomSeed}

// //     Respond in JSON only: { "fact": "The fact text here" }
// //   `;

// //   try {
// //     const completion = await groq.chat.completions.create({
// //       messages: [{ role: "user", content: prompt }],
// //       model: "llama-3.3-70b-versatile", // Fast and smart
// //       temperature: 0.9, // High temperature = more random/creative
// //       response_format: { type: "json_object" }
// //     });

// //     const content = completion.choices[0]?.message?.content || "{}";
// //     const data = cleanAndParseJSON(content);
// //     return data?.fact || "Plants can communicate with each other using chemical signals!";

// //   } catch (e) {
// //     console.error("Fact Error:", e);
// //     return null;
// //   }
// // };

// import Groq from "groq-sdk";

// // ⚠️ PASTE YOUR GROQ API KEY HERE ⚠️
// const API_KEY = "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"; 

// const groq = new Groq({
//   apiKey: API_KEY,
//   dangerouslyAllowBrowser: true 
// });

// // --- HELPER 1: JSON CLEANER ---
// const cleanAndParseJSON = (rawText: string) => {
//   try {
//     let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '');
//     cleanText = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
//         return char === '\n' || char === '\r' || char === '\t' ? char : '';
//     });
//     return JSON.parse(cleanText.trim());
//   } catch (error) {
//     // Fallback: manual extract
//     try {
//         const firstOpen = rawText.indexOf('{');
//         const lastClose = rawText.lastIndexOf('}');
//         if (firstOpen !== -1 && lastClose !== -1) {
//             return JSON.parse(rawText.substring(firstOpen, lastClose + 1));
//         }
//     } catch (e) {}
//     console.error("JSON Parse Failed:", rawText);
//     return null; // Return null to handle gracefully
//   }
// };

// // --- HELPER 2: REAL PINCODE LOOKUP ---
// // Fetches official Area Name from Indian Post API
// const getRealLocation = async (pincode: string) => {
//   try {
//     // Basic validation: India PIN codes are 6 digits
//     if (!/^\d{6}$/.test(pincode)) return null;

//     const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
//     const data = await response.json();

//     if (data && data[0].Status === "Success" && data[0].PostOffice) {
//       // Get the first area name (e.g., "Santacruz East")
//       const postOffice = data[0].PostOffice[0]; 
//       return `${postOffice.Name}, ${postOffice.District}`;
//     }
//     return null;
//   } catch (e) {
//     console.warn("Pin API lookup failed, falling back to AI guess.");
//     return null;
//   }
// };

// // --- 1. INDOOR / OUTDOOR SEARCH ---
// export const getPlantRecommendation = async (plantName: string, pinCode: string, type: string) => {
//   if (!API_KEY || API_KEY.includes("PASTE")) {
//     alert("⛔ Missing API Key in src/api/gemini.ts");
//     return null;
//   }

//   // STEP 1: Get the REAL location name first
//   const realLocation = await getRealLocation(pinCode);
//   const locationContext = realLocation ? `The specific location is verified as: ${realLocation}` : "Location verification failed, please estimate based on PIN.";

//   const prompt = `
//     Act as a botanical expert for India. 
//     User Input: "${plantName}" for ${type} (indoor/outdoor) at PIN Code "${pinCode}".
//     ${locationContext}

//     TASK:
//     1. If the location was verified above, use THAT name (e.g. "Vakola, Mumbai") in your response.
//     2. Verify if the plant is valid.
//     3. Provide climate details specific to this area.

//     Respond in STRICT JSON format only.
//     Structure:
//     {
//       "isValidPin": boolean,
//       "pinError": "Message if PIN is invalid",
//       "locationName": "${realLocation || "Area Name, City"}", 
//       "isValidPlant": boolean,
//       "warning": "Error message if plant invalid",
//       "isSuitable": boolean, 
//       "climateSummary": "1 sentence summary starting with 'The climate in [Area Name]...'", 
//       "recommendation": "1 sentence recommendation", 
//       "careGuide": { "water": "tip", "sun": "tip", "soil": "tip" } 
//     }
//   `;

//   try {
//     const completion = await groq.chat.completions.create({
//       messages: [{ role: "user", content: prompt }],
//       model: "llama-3.3-70b-versatile", 
//       temperature: 0.3,
//       response_format: { type: "json_object" }
//     });

//     const content = completion.choices[0]?.message?.content || "{}";
//     return cleanAndParseJSON(content);

//   } catch (e: any) {
//     alert(`❌ Error: ${e.message}`);
//     return null;
//   }
// };

// // --- 2. VISION SCANNING ---
// export const identifyPlantDisease = async (imageBase64: string) => {
//   if (!API_KEY || API_KEY.includes("PASTE")) {
//     alert("⛔ Missing API Key in src/api/gemini.ts");
//     return null;
//   }

//   const formattedImage = imageBase64.startsWith("data:") 
//     ? imageBase64 
//     : `data:image/jpeg;base64,${imageBase64}`;

//   const prompt = `
//     Act as a plant pathologist. Analyze this image.
//     1. Identify disease (or if it is Healthy).
//     2. Cause (1 sentence).
//     3. Cure (3 short bullet points).

//     Respond in STRICT JSON format only.
//     Structure:
//     { "diseaseName": "...", "cause": "...", "cure": ["step1", "step2"], "isHealthy": boolean }
//   `;

//   try {
//     const completion = await groq.chat.completions.create({
//       messages: [
//         {
//           role: "user",
//           content: [
//             { type: "text", text: prompt },
//             { type: "image_url", image_url: { url: formattedImage } }
//           ]
//         }
//       ],
//       // ✅ Updated to the standard Groq Vision model to ensure it works
//       model: "llama-3.2-11b-vision-preview", 
//       temperature: 0.1,
//       response_format: { type: "json_object" }
//     });

//     const content = completion.choices[0]?.message?.content || "{}";
//     return cleanAndParseJSON(content);

//   } catch (e: any) {
//     alert(`❌ Vision Error: ${e.message}`);
//     return null;
//   }
// };

// // --- 3. FUN FACT GENERATOR (UPDATED FOR UNIQUENESS) ---

// // A list of diverse topics to force the AI to rotate subjects
// const PLANT_TOPICS = [
//   "carnivorous plants", "ancient trees", "poisonous plants", "underwater plants",
//   "desert survival plants", "strange pollination methods", "medicinal herbs",
//   "giant fruits", "tiny mosses", "orchids", "bamboo", "fungi interactions",
//   "rainforest canopy", "seeds traveling", "plant defense mechanisms",
//   "bioluminescent plants", "plants in space", "prehistoric plants"
// ];

// export const getFunPlantFact = async () => {
//   if (!API_KEY || API_KEY.includes("PASTE")) return null;

//   // 1. Pick a random topic from the list
//   const randomTopic = PLANT_TOPICS[Math.floor(Math.random() * PLANT_TOPICS.length)];

//   // 2. Add a unique timestamp ID
//   const uniqueId = Date.now().toString();

//   const prompt = `
//     Tell me ONE short, fascinating, and obscure fun fact specifically about: ${randomTopic}.

//     Constraints:
//     - Do NOT mention common facts (like bamboo growing fast or Venus flytraps).
//     - It must be unique and surprising.
//     - Max 1 sentence.
//     - Context ID: ${uniqueId}

//     Respond in JSON only: { "fact": "The fact text here" }
//   `;

//   try {
//     const completion = await groq.chat.completions.create({
//       messages: [{ role: "user", content: prompt }],
//       model: "llama-3.3-70b-versatile", 
//       temperature: 1.2, // Higher temperature = More creative/random
//       response_format: { type: "json_object" }
//     });

//     const content = completion.choices[0]?.message?.content || "{}";
//     const data = cleanAndParseJSON(content);

//     return data?.fact || `Did you know? ${randomTopic} have amazing adaptations!`;

//   } catch (e) {
//     console.error("Fact Error:", e);
//     // Fallback if API fails
//     return "Plants communicate with each other through underground fungal networks called the 'Wood Wide Web'.";
//   }
// };


import Groq from "groq-sdk";
import {
  MOCK_PLANT_DATABASE,
  diagnosePlantLocally,
  getLocalEcoCommunityData,
  getUserEcoProfile,
  calculateCompostRatio,
  shouldWaterOutdoorPlants
} from '../services/mockEcoService';

// ⚠️ PASTE YOUR GROQ API KEY HERE ⚠️
const API_KEY = "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";

const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true
});

// --- HELPER: JSON CLEANER ---
const cleanAndParseJSON = (rawText: string) => {
  try {
    let cleanText = rawText.replace(/```json/g, '').replace(/```/g, '');
    cleanText = cleanText.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
      return char === '\n' || char === '\r' || char === '\t' ? char : '';
    });
    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error("JSON Parse Failed:", rawText);
    return null;
  }
};

// --- HELPER: REAL PINCODE LOOKUP ---
const getRealLocation = async (pincode: string) => {
  try {
    if (!/^\d{6}$/.test(pincode)) return null;
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    if (data && data[0].Status === "Success" && data[0].PostOffice) {
      const postOffice = data[0].PostOffice[0];
      return `${postOffice.Name}, ${postOffice.District}`;
    }
    return null;
  } catch (e) {
    return null;
  }
};

// --- 1. PLANT RECOMMENDATION (Text) ---
// Using Llama 3.3 70B (Best for text/logic)
export const getPlantRecommendation = async (plantName: string, pinCode: string, type: string) => {
  const normalizedPlantName = (plantName || '').trim();
  const validPinFormat = /^\d{6}$/.test(pinCode || '');
  const knownPlant = MOCK_PLANT_DATABASE[normalizedPlantName.toLowerCase()];

  const fallbackLocalRecommendation = (locationName: string) => {
    const plant = knownPlant || {
      id: 'local',
      name: normalizedPlantName || 'Unknown Plant',
      isNative: false,
      isInvasive: false,
      carbonOffsetKgPerYear: 0.8,
      pollinatorFriendly: ['Bees'],
      compostCategory: 'Green' as const
    };

    const isSuitable = type.toLowerCase() === 'indoor' ? !plant.isInvasive : true;

    return {
      isValidPin: validPinFormat,
      pinError: validPinFormat ? '' : 'PIN code is invalid for this local recommendation fallback.',
      locationName,
      isValidPlant: Boolean(knownPlant || normalizedPlantName),
      warning: knownPlant ? '' : `"${normalizedPlantName}" was not found in the local eco database, so a general recommendation is being used.`,
      isSuitable,
      climateSummary: `The climate in ${locationName} is warm, humid, and ideal for resilient tropical plants. This supports easy maintenance, strong growth, and good rainfall adaptation in Mumbai-style conditions.`,
      recommendation: knownPlant
        ? `${knownPlant.name} is a strong local fit for ${type.toLowerCase()} planting in this climate and can be managed with low-water, native-friendly care.`
        : `A general ${type.toLowerCase()} plant recommendation is provided for this climate with a focus on resilient, low-stress care and rain-aware watering.`,
      careGuide: {
        water: 'Use filtered or rainwater where possible; avoid chlorinated tap water directly and allow it to sit for 24 hours before use.',
        waterTemperature: 'Room temperature, ideally 20-25°C; avoid cold water on tender roots.',
        wateringSchedule: {
          summer: 'Water once daily in the early morning or every other day for outdoor plants in intense heat.',
          winter: 'Reduce to once every 3-4 days or when soil feels dry at depth.',
          monsoon: 'Skip watering when rain is active; check soil moisture before watering.',
          perMonth: 'Approximately 12-18 watering events per month depending on rainfall and plant exposure.'
        },
        sun: 'Aim for bright indirect light indoors or 4-6 hours of filtered sunlight outdoors. Avoid harsh afternoon exposure for tender plants.',
        soil: 'Use well-draining loamy soil enriched with compost and a little cocopeat for water retention without compaction.',
        soilComparison: [
          { soilType: 'Red Soil (Laterite)', suitability: 'Good', effect: 'Fast drainage but low nutrient retention; add compost and organic mulch.', rating: 3 },
          { soilType: 'Black Soil (Regur/Cotton Soil)', suitability: 'Average', effect: 'Retains more moisture but can compact; mix in cocopeat and sand.', rating: 3 },
          { soilType: 'Brown/Loamy Soil', suitability: 'Excellent', effect: 'Balanced drainage and nutrients for most plant types.', rating: 5 },
          { soilType: 'Sandy Soil', suitability: 'Good', effect: 'Drains well but dries quickly; enrich with compost regularly.', rating: 4 },
          { soilType: 'Clay Soil', suitability: 'Average', effect: 'Can hold too much water; add organic matter to improve drainage.', rating: 2 }
        ],
        bestSoilMix: '40% garden soil + 30% cocopeat + 20% compost + 10% perlite or sand.',
        homeRemedies: [
          'Banana peel compost tea: soak peels in water for 48 hours and use it to feed potassium-loving plants.',
          'Crushed eggshell powder: sprinkle lightly around the root zone once a month for calcium support.',
          'Neem leaf spray: apply diluted neem to deter pests and support plant resilience naturally.'
        ],
        fertilizer: 'Use a balanced organic compost or NPK 10-10-10 monthly during active growth periods.',
        commonProblems: 'Overwatering, low sunlight, and pest pressure are the most common issues in tropical climates.'
      },
      plantMeta: {
        isNative: plant.isNative,
        isInvasive: plant.isInvasive,
        commonPests: ['Aphids', 'Mealybugs', 'Leaf miners'],
        organicRemedies: ['Neem oil spray', 'Soapy water rinse', 'Manual pest removal'],
        ecoScore: Math.round((plant.carbonOffsetKgPerYear || 0.8) * 100)
      },
      community: getLocalEcoCommunityData(),
      ecoProfile: getUserEcoProfile([plant]),
      compostRatio: calculateCompostRatio([plant]),
      wateringAdvice: shouldWaterOutdoorPlants('Heavy Monsoon Rain') ? 'Reduce watering because rain is active.' : 'Water today because no rain is detected.'
    };
  };

  if (!API_KEY || API_KEY.includes('PASTE')) {
    return fallbackLocalRecommendation('Mumbai, Maharashtra');
  }

  try {
    const realLocation = await getRealLocation(pinCode);
    const locationContext = realLocation ? `The specific location is verified as: ${realLocation}` : 'Location verification failed, please estimate based on PIN.';

    const prompt = `
      You are a professional botanist and horticulture expert specializing in ${type.toLowerCase()} plant care in India.
      User wants to grow: "${plantName}" as an ${type} plant at PIN Code "${pinCode}".
      ${locationContext}
      Provide extremely practical care information.
      Respond in STRICT JSON format: { "isValidPin": boolean, "pinError": "Message if PIN is invalid", "locationName": "${realLocation || 'Area Name, City'}", "isValidPlant": boolean, "warning": "Error message if plant name is not a real plant", "isSuitable": boolean, "climateSummary": "2-3 sentence climate analysis", "recommendation": "1-2 sentence recommendation", "careGuide": { "water": "text", "waterTemperature": "text", "wateringSchedule": { "summer": "text", "winter": "text", "monsoon": "text", "perMonth": "text" }, "sun": "text", "soil": "text", "soilComparison": [{ "soilType": "Red Soil (Laterite)", "suitability": "Good", "effect": "text", "rating": 3 }], "bestSoilMix": "text", "homeRemedies": ["text"], "fertilizer": "text", "commonProblems": "text" } }
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const data = cleanAndParseJSON(completion.choices[0]?.message?.content || '{}');
    if (!data) {
      return fallbackLocalRecommendation(realLocation || 'Mumbai, Maharashtra');
    }

    return {
      ...data,
      plantMeta: {
        isNative: knownPlant?.isNative ?? false,
        isInvasive: knownPlant?.isInvasive ?? false,
        commonPests: ['Aphids', 'Mealybugs', 'Leaf miners'],
        organicRemedies: ['Neem oil spray', 'Companion planting', 'Manual pest removal'],
        ecoScore: knownPlant ? Math.round(knownPlant.carbonOffsetKgPerYear * 100) : 80
      },
      community: getLocalEcoCommunityData(),
      ecoProfile: getUserEcoProfile(knownPlant ? [knownPlant] : []),
      compostRatio: calculateCompostRatio(knownPlant ? [knownPlant] : [])
    };
  } catch (e: any) {
    console.warn('Groq recommendation failed, using offline fallback.', e);
    return fallbackLocalRecommendation('Mumbai, Maharashtra');
  }
};

// --- HELPER: Generate REAL working reference links ---
// AI models hallucinate URLs, so we build real links programmatically
const generateRealReferences = (plantName: string, diseaseName: string, isHealthy: boolean) => {
  const cleanPlant = plantName.replace(/\(.*?\)/g, '').trim(); // Remove scientific name in parens
  const scientificMatch = plantName.match(/\(([^)]+)\)/);
  const scientificName = scientificMatch ? scientificMatch[1].trim() : cleanPlant;
  const cleanDisease = diseaseName.replace(/healthy.*detected/i, '').trim();

  // Build search-based URLs that will always work
  const searchQuery = isHealthy
    ? `${cleanPlant} plant care guide`
    : `${cleanPlant} ${cleanDisease} treatment`;

  const diseaseQuery = isHealthy
    ? `${cleanPlant} plant health`
    : `${cleanPlant} ${cleanDisease}`;

  const refs = [
    {
      title: `${diseaseQuery} - Google Scholar Research`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(diseaseQuery)}`,
      source: "Google Scholar"
    },
    {
      title: `${cleanPlant} - Plant Disease Information`,
      url: `https://plantvillage.psu.edu/search?q=${encodeURIComponent(searchQuery)}`,
      source: "PlantVillage (Penn State University)"
    },
    {
      title: `${scientificName} - Wikipedia`,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(scientificName)}`,
      source: "Wikipedia"
    },
    {
      title: `${cleanPlant} Disease Database`,
      url: `https://gd.eppo.int/search?k=${encodeURIComponent(scientificName)}`,
      source: "EPPO Global Database"
    },
    {
      title: `${diseaseQuery} - Plant Pathology Resources`,
      url: `https://www.apsnet.org/pages/SearchResults.aspx?k=${encodeURIComponent(diseaseQuery)}`,
      source: "American Phytopathological Society"
    }
  ];

  // If diseased, add a Google search for treatment
  if (!isHealthy) {
    refs.push({
      title: `${cleanDisease} in ${cleanPlant} - Treatment Guide`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${cleanPlant} ${cleanDisease} treatment cure pesticide`)}`,
      source: "Google Search"
    });
  }

  return refs;
};

// --- 2. VISION SCANNING (UPDATED for 2026) ---
// Two-message approach: system priming + detailed user prompt for maximum accuracy
export const identifyPlantDisease = async (imageBase64: string) => {
  const localDiagnosis = diagnosePlantLocally(imageBase64 || 'white spots');

  const offlineResult = {
    plantName: 'Tulsi',
    diseaseName: localDiagnosis.issue,
    isHealthy: false,
    identificationReasoning: 'Fallback diagnosis uses leaf pattern clues and the local eco scan rules for tropical urban plants.',
    cause: 'This condition most often develops under humid conditions with poor airflow or when moisture remains on leaves for long periods.',
    causeDetails: ['High humidity', 'Poor air circulation', 'Water stress', 'Frequent overhead watering'],
    homeopathicRemedies: ['Neem oil spray (Azadirachtin)', 'Diluted baking soda mix', 'Morning sunlight and ventilation'],
    pesticideNames: ['Neem Oil (Azadirachtin)', 'Bacillus thuringiensis spray', 'Dormant oil spray'],
    cure: [
      'Trim the affected leaves and dispose of them away from the plant.',
      'Improve airflow and water the soil instead of wetting leaves.',
      'Apply an organic neem or baking soda treatment every few days until symptoms ease.'
    ],
    isNative: true,
    isInvasive: false,
    commonPests: ['Aphids', 'Mealybugs'],
    organicRemedies: ['Neem oil spray', 'Cold water rinse', 'Manual removal'],
    plantMeta: {
      isNative: true,
      isInvasive: false,
      commonPests: ['Aphids', 'Mealybugs'],
      organicRemedies: ['Neem oil spray', 'Cold water rinse', 'Manual removal'],
      ecoScore: 92
    },
    ecoProfile: getUserEcoProfile([MOCK_PLANT_DATABASE.tulsi]),
    compostRatio: calculateCompostRatio([MOCK_PLANT_DATABASE.tulsi]),
    community: getLocalEcoCommunityData(),
    references: []
  };

  if (!API_KEY || API_KEY.includes('PASTE')) {
    return offlineResult;
  }

  const formattedImage = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // System message to prime the model as an expert botanist
  const systemMessage = `You are Dr. Flora, a world-renowned botanist and plant pathologist with 35 years of field experience identifying thousands of plant species across tropical, temperate, and arid climates. You have an exceptional eye for distinguishing plants by their leaves, flowers, fruits, stems, and overall growth habit. You NEVER guess — you only identify what you can confirm from visual evidence. If uncertain, you honestly say "Unknown Plant" rather than giving wrong identification.`;

  const userPrompt = `
Carefully analyze this plant image. Follow this EXACT identification process:

═══════════════════════════════════════
PHASE 1: PLANT IDENTIFICATION (Most Important)
═══════════════════════════════════════

Examine ALL visible features systematically:

🍃 LEAF ANALYSIS (if leaves are visible):
  - Shape: Is it oval, lanceolate, heart-shaped, palmate, pinnate, needle-like, linear, round, elliptic?
  - Margins: Smooth (entire), serrated (toothed), lobed, wavy, spiny?
  - Venation: Parallel veins (monocot) or net-like veins (dicot)?
  - Arrangement: Alternate, opposite, whorled, rosette, basal?
  - Texture: Smooth, hairy, rough, waxy, glossy, leathery, succulent/fleshy?
  - Color: Dark green, light green, variegated, purple-tinged, silver/gray?
  - Size: Small (<5cm), medium (5-15cm), large (>15cm)?
  - Special features: Compound leaves? Tendrils? Thorns on stem? Aromatic smell?

🌸 FLOWER ANALYSIS (if flowers are visible):
  - Petal count: 3 petals (monocot), 4 petals (crucifer), 5 petals (rose family), many petals?
  - Color: Red, pink, white, yellow, orange, purple, blue, multi-colored?
  - Shape: Tubular, bell-shaped, star-shaped, butterfly-shaped, daisy-like, spike?
  - Arrangement: Single, cluster, spike, umbel, panicle, head?
  - Symmetry: Radial (actinomorphic) or bilateral (zygomorphic)?
  - Size: Small (<2cm), medium (2-5cm), large (>5cm)?

🌿 STEM & GROWTH ANALYSIS:
  - Stem type: Herbaceous (green, soft), woody, vine, climbing, creeping?
  - Growth habit: Upright, bushy, trailing, tree, shrub, ground cover?

IDENTIFICATION RULES:
★ Use ALL visible clues together — don't rely on just one feature
★ Rose = serrated oval leaves + thorny stems + multi-petaled flowers
★ Tomato = compound leaves with strong smell + small yellow flowers
★ Tulsi/Basil = opposite oval leaves + square stem + spike flowers
★ Mango = long lanceolate leathery leaves + panicle flowers
★ Neem = pinnate compound leaves + small white flowers
★ Banana = huge oblong leaves + pseudo-stem
★ Maize/Corn = long linear leaves + parallel veins + tall stalk
★ Money Plant/Pothos = heart-shaped glossy leaves + vine
★ If confidence < 70%, set plantName to "Unknown Plant (needs closer image)"

═══════════════════════════════════════
PHASE 2: DISEASE DETECTION
═══════════════════════════════════════

Check for these symptoms ON the identified plant:
  - Brown/black spots or lesions on leaves
  - Yellow patches or chlorosis
  - White powdery coating (powdery mildew)
  - Gray fuzzy growth (downy mildew/botrytis)
  - Rust-colored pustules on leaf underside
  - Wilting despite adequate water
  - Curled, distorted, or deformed leaves
  - Holes from pest damage
  - Cankers or sunken areas on stems
  - Mosaic patterns (viral)

If NO symptoms visible → plant is HEALTHY. Do NOT fabricate a disease.

═══════════════════════════════════════
PHASE 3: TREATMENT (only if diseased)
═══════════════════════════════════════

Provide REAL product names that exist in the market.
Do NOT include any URLs or web links.

Respond in STRICT JSON only:
{
  "plantName": "Common Name (Scientific Name)",
  "diseaseName": "Specific Disease Name or Healthy - No Disease Detected",
  "isHealthy": true or false,
  "identificationReasoning": "Brief explanation of which visual features (leaf shape, flower type, etc.) helped identify this specific plant",
  "cause": "2-3 sentence detailed explanation of WHY this plant has this disease",
  "causeDetails": ["Factor 1", "Factor 2", "Factor 3", "Factor 4"],
  "homeopathicRemedies": ["Neem oil spray (Azadirachtin)", "Remedy 2 with product name", "Remedy 3 with product name"],
  "pesticideNames": ["Dithane M-45 (Mancozeb 75% WP)", "Product 2 (Active Ingredient)", "Product 3 (Active Ingredient)"],
  "cure": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}
`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: formattedImage } }
          ]
        }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.01,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    });

    const result = cleanAndParseJSON(completion.choices[0]?.message?.content || '{}');

    if (result) {
      result.references = generateRealReferences(
        result.plantName || 'Unknown Plant',
        result.diseaseName || 'Plant Disease',
        result.isHealthy || false
      );
      result.commonPests = result.commonPests || ['Aphids', 'Mealybugs'];
      result.organicRemedies = result.organicRemedies || ['Neem oil spray', 'Manual removal', 'Soap solution rinse'];
      result.isNative = result.isNative ?? false;
      result.isInvasive = result.isInvasive ?? false;
    }

    return result;
  } catch (e: any) {
    console.warn('Vision analysis failed, using offline mock diagnosis.', e);
    return offlineResult;
  }
};

// --- 3. FUN FACT GENERATOR ---
const PLANT_TOPICS = [
  "carnivorous plants", "ancient trees", "poisonous plants", "underwater plants",
  "desert survival plants", "strange pollination methods", "medicinal herbs",
  "giant fruits", "tiny mosses", "orchids", "bamboo", "fungi interactions",
  "rainforest canopy", "seeds traveling", "plant defense mechanisms",
  "bioluminescent plants", "plants in space", "prehistoric plants"
];

export const getFunPlantFact = async () => {
  const fallbackFact = 'Plants communicate with each other through underground fungal networks called the Wood Wide Web.';

  if (!API_KEY || API_KEY.includes('PASTE')) return fallbackFact;

  const randomTopic = PLANT_TOPICS[Math.floor(Math.random() * PLANT_TOPICS.length)];
  const uniqueId = Date.now().toString();

  const prompt = `
    Tell me ONE short, fascinating, and obscure fun fact specifically about: ${randomTopic}.
    Constraints: Unique, surprising, max 1 sentence. Context ID: ${uniqueId}
    Respond in JSON only: { "fact": "The fact text here" }
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 1.3,
      response_format: { type: 'json_object' }
    });

    const data = cleanAndParseJSON(completion.choices[0]?.message?.content || '{}');
    return data?.fact || `Did you know? ${randomTopic} have amazing adaptations!`;
  } catch (e) {
    return fallbackFact;
  }
};