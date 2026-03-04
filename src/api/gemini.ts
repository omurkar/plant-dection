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
  if (!API_KEY || API_KEY.includes("PASTE")) {
    alert("⛔ Missing API Key in src/api/gemini.ts");
    return null;
  }

  const realLocation = await getRealLocation(pinCode);
  const locationContext = realLocation ? `The specific location is verified as: ${realLocation}` : "Location verification failed, please estimate based on PIN.";

  const prompt = `
    Act as a botanical expert for India. 
    User Input: "${plantName}" for ${type} (indoor/outdoor) at PIN Code "${pinCode}".
    ${locationContext}
    
    Respond in STRICT JSON format:
    {
      "isValidPin": boolean,
      "pinError": "Message if PIN is invalid",
      "locationName": "${realLocation || "Area Name, City"}", 
      "isValidPlant": boolean,
      "warning": "Error message if plant invalid",
      "isSuitable": boolean, 
      "climateSummary": "1 sentence summary", 
      "recommendation": "1 sentence recommendation", 
      "careGuide": { "water": "tip", "sun": "tip", "soil": "tip" } 
    }
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", 
      temperature: 0.3,
      response_format: { type: "json_object" }
    });
    return cleanAndParseJSON(completion.choices[0]?.message?.content || "{}");
  } catch (e: any) {
    alert(`❌ Text Error: ${e.message}`);
    return null;
  }
};

// --- 2. VISION SCANNING (UPDATED for 2026) ---
// Using Llama 4 Scout (The new Vision standard)
export const identifyPlantDisease = async (imageBase64: string) => {
  if (!API_KEY || API_KEY.includes("PASTE")) {
    alert("⛔ Missing API Key in src/api/gemini.ts");
    return null;
  }

  const formattedImage = imageBase64.startsWith("data:") 
    ? imageBase64 
    : `data:image/jpeg;base64,${imageBase64}`;

  const prompt = `
    Act as a plant pathologist. Analyze this image.
    1. Identify disease (or if it is Healthy).
    2. Cause (1 sentence).
    3. Cure (3 short bullet points).
    
    Respond in STRICT JSON format:
    { "diseaseName": "...", "cause": "...", "cure": ["step1", "step2"], "isHealthy": boolean }
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: formattedImage } }
          ]
        }
      ],
      // ✅ UPDATED: The decommissioned 'preview' models are replaced by this
      model: "meta-llama/llama-4-scout-17b-16e-instruct", 
      temperature: 0.1,
      response_format: { type: "json_object" }
    });
    return cleanAndParseJSON(completion.choices[0]?.message?.content || "{}");
  } catch (e: any) {
    console.error("Vision Error:", e);
    // Fallback error alert to help debug
    alert(`❌ Vision Error: ${e.message}`);
    return null;
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
  if (!API_KEY || API_KEY.includes("PASTE")) return null;

  const randomTopic = PLANT_TOPICS[Math.floor(Math.random() * PLANT_TOPICS.length)];
  const uniqueId = Date.now().toString();

  const prompt = `
    Tell me ONE short, fascinating, and obscure fun fact specifically about: ${randomTopic}.
    Constraints: Unique, surprising, max 1 sentence. Context ID: ${uniqueId}
    Respond in JSON only: { "fact": "The fact text here" }
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile", 
      temperature: 1.3, 
      response_format: { type: "json_object" }
    });

    const data = cleanAndParseJSON(completion.choices[0]?.message?.content || "{}");
    return data?.fact || `Did you know? ${randomTopic} have amazing adaptations!`;
  } catch (e) {
    return "Plants communicate with each other through underground fungal networks.";
  }
};