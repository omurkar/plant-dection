// src/services/ecoScoreService.ts
// Phase 4: Eco-Score gamification using localStorage

export interface EcoScoreRecord {
  score: number;
  actions: EcoAction[];
  badges: string[];
  lastUpdated: number;
}

export interface EcoAction {
  id: string;
  type: 'native_scan' | 'rain_skip' | 'biodiversity_log' | 'compost_check' | 'plant_swap';
  description: string;
  points: number;
  timestamp: number;
}

const ECO_SCORE_KEY = 'plantscan_eco_score';

export const getEcoScore = (): EcoScoreRecord => {
  try {
    const raw = localStorage.getItem(ECO_SCORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse error
  }
  return { score: 0, actions: [], badges: [], lastUpdated: Date.now() };
};

export const saveEcoScore = (record: EcoScoreRecord): void => {
  record.lastUpdated = Date.now();
  localStorage.setItem(ECO_SCORE_KEY, JSON.stringify(record));
};

const computeBadges = (score: number, actions: EcoAction[]): string[] => {
  const badges: string[] = [];
  const nativeScans = actions.filter((a) => a.type === 'native_scan').length;
  const rainSkips = actions.filter((a) => a.type === 'rain_skip').length;
  const bioLogs = actions.filter((a) => a.type === 'biodiversity_log').length;

  if (score >= 10) badges.push('🌱 Eco Starter');
  if (score >= 50) badges.push('🌿 Green Guardian');
  if (score >= 100) badges.push('🏆 Eco Champion');
  if (score >= 200) badges.push('🌍 Planet Protector');
  if (nativeScans >= 3) badges.push('🌿 Native Flora Champion');
  if (rainSkips >= 3) badges.push('🌧️ Monsoon Mindful');
  if (bioLogs >= 1) badges.push('🗺️ Biodiversity Mapper');

  return [...new Set(badges)];
};

export const addEcoAction = (type: EcoAction['type'], description: string, points: number): EcoScoreRecord => {
  const record = getEcoScore();
  const action: EcoAction = {
    id: `${type}_${Date.now()}`,
    type,
    description,
    points,
    timestamp: Date.now()
  };
  record.actions = [action, ...record.actions].slice(0, 50);
  record.score += points;
  record.badges = computeBadges(record.score, record.actions);
  saveEcoScore(record);
  return record;
};

export const awardNativeScan = (): EcoScoreRecord =>
  addEcoAction('native_scan', 'Scanned a native plant 🌿', 15);

export const awardRainSkip = (): EcoScoreRecord =>
  addEcoAction('rain_skip', 'Skipped watering on a rainy day 🌧️', 10);

export const awardBiodiversityLog = (): EcoScoreRecord =>
  addEcoAction('biodiversity_log', 'Logged a biodiversity sighting 🗺️', 20);

export const awardCompostCheck = (): EcoScoreRecord =>
  addEcoAction('compost_check', 'Checked compost ratio ♻️', 5);

export const awardPlantSwap = (): EcoScoreRecord =>
  addEcoAction('plant_swap', 'Participated in plant swap 🤝', 25);
