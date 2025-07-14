import song1 from './assets/song1.mp3';
// import song2 from './assets/song2.mp3';
// import song3 from './assets/song3.mp3';

export const playlist = [
  { name: 'GoldFish', src: song1 },
  // { name: 'Breeze', src: song2 },
  // { name: 'Dreams', src: song3 },
].sort((a, b) => a.name.localeCompare(b.name));
