/* ═══════════════════════════════════════════════════════
   Constants — All magic numbers in one place
   ═══════════════════════════════════════════════════════ */

// ─── CV Pipeline ───
export const CV_PROCESS_FPS = 10;
export const CV_PROCESS_INTERVAL = 1000 / CV_PROCESS_FPS;
export const CV_FRAME_WIDTH = 320;
export const CV_FRAME_HEIGHT = 240;
export const CV_MIN_CONTOUR_AREA = 800;
export const CV_DEFAULT_THRESHOLD = 80;
export const CV_TEMPORAL_FRAMES = 3; // frames to agree before lock-in

// ─── Shape Classification Thresholds ───
export const SHAPE = {
  UNKNOWN: 'unknown',
  OPEN_HAND: 'open_hand',
  FIST: 'fist',
  SCISSORS: 'scissors',
  PEACE_SIGN: 'peace_sign',
  POINTING: 'pointing',
};

export const SHAPE_LABELS = {
  [SHAPE.UNKNOWN]: 'No Shape',
  [SHAPE.OPEN_HAND]: 'Open Hand',
  [SHAPE.FIST]: 'Fist',
  [SHAPE.SCISSORS]: 'Scissors',
  [SHAPE.PEACE_SIGN]: 'Summon',
  [SHAPE.POINTING]: 'Pointing',
};

export const SHAPE_ICONS = {
  [SHAPE.UNKNOWN]: '—',
  [SHAPE.OPEN_HAND]: '✋',
  [SHAPE.FIST]: '✊',
  [SHAPE.SCISSORS]: '✌️',
  [SHAPE.PEACE_SIGN]: '🤘',
  [SHAPE.POINTING]: '👆',
};

// ─── Game Timing ───
export const DAY_DURATION_MS = 60_000;       // 60 seconds per day/night cycle
export const SEASON_DURATION_MS = 240_000;   // 4 minutes per season
export const GAME_TICK_MS = 50;              // 20 ticks per second for simulation

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const DAY_PHASES = ['dawn', 'day', 'dusk', 'night'];

// ─── Biomes ───
export const BIOMES = {
  MEADOW: { id: 'meadow', name: 'Meadow', icon: '🌸', cost: 0, unlocked: true },
  FOREST: { id: 'forest', name: 'Deep Forest', icon: '🌲', cost: 50 },
  DESERT: { id: 'desert', name: 'Desert Oasis', icon: '🌵', cost: 100 },
  REEF: { id: 'reef', name: 'Coral Reef', icon: '🐠', cost: 200 },
  CRYSTAL: { id: 'crystal', name: 'Crystal Cave', icon: '💎', cost: 350 },
};

// ─── Plant Species ───
export const PLANT_SPECIES = {
  // Meadow
  daisy: { id: 'daisy', name: 'Daisy', biome: 'meadow', icon: '🌼', growthRate: 1.0, maxHeight: 60, rarity: 'common' },
  tulip: { id: 'tulip', name: 'Tulip', biome: 'meadow', icon: '🌷', growthRate: 0.8, maxHeight: 70, rarity: 'common' },
  sunflower: { id: 'sunflower', name: 'Sunflower', biome: 'meadow', icon: '🌻', growthRate: 0.6, maxHeight: 120, rarity: 'uncommon' },
  clover: { id: 'clover', name: 'Lucky Clover', biome: 'meadow', icon: '🍀', growthRate: 1.2, maxHeight: 30, rarity: 'rare' },
  // Forest
  oak: { id: 'oak', name: 'Oak Tree', biome: 'forest', icon: '🌳', growthRate: 0.3, maxHeight: 180, rarity: 'common' },
  mushroom: { id: 'mushroom', name: 'Mushroom', biome: 'forest', icon: '🍄', growthRate: 1.5, maxHeight: 40, rarity: 'common' },
  fern: { id: 'fern', name: 'Fern', biome: 'forest', icon: '🌿', growthRate: 0.9, maxHeight: 55, rarity: 'uncommon' },
  vine: { id: 'vine', name: 'Glowing Vine', biome: 'forest', icon: '🪴', growthRate: 0.7, maxHeight: 100, rarity: 'rare' },
  // Desert
  cactus: { id: 'cactus', name: 'Cactus', biome: 'desert', icon: '🌵', growthRate: 0.4, maxHeight: 90, rarity: 'common' },
  agave: { id: 'agave', name: 'Agave', biome: 'desert', icon: '🪴', growthRate: 0.5, maxHeight: 50, rarity: 'uncommon' },
  desert_rose: { id: 'desert_rose', name: 'Desert Rose', biome: 'desert', icon: '🌺', growthRate: 0.3, maxHeight: 60, rarity: 'rare' },
  // Reef
  coral: { id: 'coral', name: 'Coral', biome: 'reef', icon: '🪸', growthRate: 0.2, maxHeight: 70, rarity: 'common' },
  anemone: { id: 'anemone', name: 'Sea Anemone', biome: 'reef', icon: '🌺', growthRate: 0.6, maxHeight: 50, rarity: 'uncommon' },
  kelp: { id: 'kelp', name: 'Giant Kelp', biome: 'reef', icon: '🌿', growthRate: 0.8, maxHeight: 160, rarity: 'rare' },
  // Crystal
  crystal_shard: { id: 'crystal_shard', name: 'Crystal Shard', biome: 'crystal', icon: '🔮', growthRate: 0.15, maxHeight: 100, rarity: 'common' },
  glow_moss: { id: 'glow_moss', name: 'Glow Moss', biome: 'crystal', icon: '✨', growthRate: 1.0, maxHeight: 20, rarity: 'uncommon' },
  gem_flower: { id: 'gem_flower', name: 'Gem Flower', biome: 'crystal', icon: '💐', growthRate: 0.2, maxHeight: 80, rarity: 'rare' },
  // Special (combo / condition unlocks)
  storm_flower: { id: 'storm_flower', name: 'Storm Flower', biome: 'any', icon: '⚡', growthRate: 0.1, maxHeight: 90, rarity: 'legendary', condition: 'lightning+rain' },
  moonbloom: { id: 'moonbloom', name: 'Moonbloom', biome: 'any', icon: '🌙', growthRate: 0.5, maxHeight: 70, rarity: 'legendary', condition: 'night+rain' },
};

// ─── Growth Stages ───
export const GROWTH_STAGES = ['seed', 'sprout', 'sapling', 'mature', 'flowering', 'fruiting'];

// ─── Creature Types ───
export const CREATURE_TYPES = {
  butterfly: { id: 'butterfly', name: 'Butterfly', biomes: ['meadow', 'forest'], speed: 1.5 },
  firefly: { id: 'firefly', name: 'Firefly', biomes: ['meadow', 'forest', 'crystal'], speed: 1.0, nocturnal: true },
  bird: { id: 'bird', name: 'Songbird', biomes: ['meadow', 'forest'], speed: 2.5 },
  frog: { id: 'frog', name: 'Frog', biomes: ['meadow', 'reef'], speed: 0.8 },
  fish: { id: 'fish', name: 'Tropical Fish', biomes: ['reef'], speed: 1.2 },
  moth: { id: 'moth', name: 'Luna Moth', biomes: ['forest', 'crystal'], speed: 1.0, nocturnal: true },
};

// ─── Combos ───
export const COMBOS = {
  RAINBOW_HARVEST: { id: 'rainbow_harvest', name: '🌈 Rainbow Harvest', sequence: ['open_hand', 'scissors'], timeWindow: 1500 },
  REPLANT: { id: 'replant', name: '🌱 Replant', sequence: ['fist', 'open_hand'], timeWindow: 1500 },
  STORM: { id: 'storm', name: '⛈️ Storm', sequence: ['pointing', 'open_hand'], timeWindow: 2000 },
  MIGRATION: { id: 'migration', name: '🐦 Migration', sequence: ['peace_sign', 'peace_sign'], timeWindow: 3000, sustained: true },
};

// ─── Achievements ───
export const ACHIEVEMENTS = {
  first_bloom: { id: 'first_bloom', name: 'First Bloom', desc: 'Grow your first flower', icon: '🌸' },
  shadow_master: { id: 'shadow_master', name: 'Shadow Master', desc: 'Use all 5 gestures', icon: '🖐️' },
  ecosystem: { id: 'ecosystem', name: 'Ecosystem', desc: 'Have 5+ different species alive', icon: '🌍' },
  night_garden: { id: 'night_garden', name: 'Night Garden', desc: 'Grow a nocturnal plant', icon: '🌙' },
  storm_caller: { id: 'storm_caller', name: 'Storm Caller', desc: 'Trigger 10 lightning strikes', icon: '⚡' },
  zen_garden: { id: 'zen_garden', name: 'Zen Garden', desc: '10 minutes without using fist', icon: '🧘' },
  green_thumb: { id: 'green_thumb', name: 'Green Thumb', desc: 'Grow 20 plants', icon: '👍' },
  herbalist: { id: 'herbalist', name: 'Herbalist', desc: 'Harvest 50 plants', icon: '🌿' },
  collector: { id: 'collector', name: 'Collector', desc: 'Discover 10 seed types', icon: '📖' },
  combo_master: { id: 'combo_master', name: 'Combo Master', desc: 'Discover all gesture combos', icon: '💫' },
  rain_dancer: { id: 'rain_dancer', name: 'Rain Dancer', desc: 'Call rain 100 times', icon: '💧' },
  destroyer: { id: 'destroyer', name: 'Force of Nature', desc: 'Destroy 30 plants', icon: '💥' },
  biome_explorer: { id: 'biome_explorer', name: 'Biome Explorer', desc: 'Unlock all biomes', icon: '🗺️' },
  legendary_find: { id: 'legendary_find', name: 'Legendary Find', desc: 'Grow a legendary plant', icon: '⭐' },
  creature_friend: { id: 'creature_friend', name: 'Creature Friend', desc: 'Summon 20 creatures', icon: '🦋' },
  butterfly_garden: { id: 'butterfly_garden', name: 'Butterfly Garden', desc: 'Have 5+ butterflies at once', icon: '🦋' },
  aurora_witness: { id: 'aurora_witness', name: 'Aurora Witness', desc: 'See the aurora borealis', icon: '🌌' },
  full_moon: { id: 'full_moon', name: 'Full Moon', desc: 'Play through a complete moon cycle', icon: '🌕' },
  patient_gardener: { id: 'patient_gardener', name: 'Patient Gardener', desc: 'Play for 30 minutes total', icon: '⏰' },
  rainbow: { id: 'rainbow', name: 'Rainbow', desc: 'Trigger the Rainbow Harvest combo', icon: '🌈' },
};

// ─── Particle Limits ───
export const MAX_PARTICLES = 2000;
export const PARTICLE_POOL_SIZE = 2500;

// ─── Colors ───
export const SKY_COLORS = {
  dawn: { top: '#1a1147', bottom: '#e87f4f' },
  day: { top: '#1e3a5f', bottom: '#87ceeb' },
  dusk: { top: '#2d1b4e', bottom: '#e2725b' },
  night: { top: '#0a0e1a', bottom: '#1a1f3a' },
};

export const SEASON_PALETTE = {
  spring: { leaf: '#72b390', flower: '#edc9bd', ground: '#203d2b' },
  summer: { leaf: '#699c72', flower: '#e5d69d', ground: '#203d2b' },
  autumn: { leaf: '#f97316', flower: '#dc2626', ground: '#451a03' },
  winter: { leaf: '#94a3b8', flower: '#e2e8f0', ground: '#374151' },
};
