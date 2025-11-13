const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideoUrl: (youtubeUrl) => ipcRenderer.invoke('get-video-url', youtubeUrl),
  sendVideoToThreejs: (videoData) => ipcRenderer.invoke('send-video-to-threejs', videoData)
});

// Listen for video play events (for the Three.js window)
ipcRenderer.on('play-video', (event, videoData) => {
  console.log('Preload received play-video event:', videoData);
  window.postMessage({ type: 'play-video', ...videoData }, '*');
});