// Curated atmospheric royalty-free ambient audio presets
// Readers and Admin can choose these or input custom audio URLs
const AUDIO_PRESETS = [
  {
    id: 'rain-thunder',
    title: 'Gentle Rain & Soft Thunder',
    mood: 'Melancholic / Atmospheric',
    url: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg'
  },
  {
    id: 'melancholy-piano',
    title: 'Nocturne Piano Reverie',
    mood: 'Emotional / Reflective',
    url: 'https://cdn.freesound.org/previews/612/612604_11861866-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/ambiences/humming_meditation.ogg'
  },
  {
    id: 'mystic-forest',
    title: 'Enchanted Forest & Birds',
    mood: 'Peaceful / Fantasy',
    url: 'https://cdn.freesound.org/previews/512/512471_10488277-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/environments/forest_birds.ogg'
  },
  {
    id: 'suspense-drone',
    title: 'Dark Mystery & Deep Drone',
    mood: 'Thrilling / Suspense',
    url: 'https://cdn.freesound.org/previews/415/415804_5121236-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/ambiences/low_drone.ogg'
  },
  {
    id: 'celestial-space',
    title: 'Cosmic Shimmer & Stars',
    mood: 'Sci-Fi / Ethereal',
    url: 'https://cdn.freesound.org/previews/467/467657_9497060-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/ambiences/space_ship_engine.ogg'
  },
  {
    id: 'campfire-wind',
    title: 'Crackling Campfire & Night Breeze',
    mood: 'Cozy / Adventure',
    url: 'https://cdn.freesound.org/previews/387/387405_5121236-lq.mp3',
    fallbackUrl: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg'
  }
];

module.exports = { AUDIO_PRESETS };
