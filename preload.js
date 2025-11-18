const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideoUrl: (youtubeUrl) => ipcRenderer.invoke('get-video-url', youtubeUrl),
  sendVideoToThreejs: (videoData) => ipcRenderer.invoke('send-video-to-threejs', videoData),
  sendClipPathToThreejs: (clipPath) => ipcRenderer.invoke('send-clippath-to-threejs', clipPath)
});

// Listen for video play events (for the Three.js window)
ipcRenderer.on('play-video', (event, videoData) => {
  console.log('Preload received play-video event:', videoData);
  window.postMessage({ type: 'play-video', ...videoData }, '*');
});

// Listen for clip-path events (for the Three.js window)
ipcRenderer.on('apply-clippath', (event, clipPath) => {
  console.log('Preload received apply-clippath event:', clipPath);
  window.postMessage({ type: 'apply-clippath', clipPath: clipPath }, '*');
});