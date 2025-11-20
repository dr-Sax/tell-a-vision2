const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script loaded');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideoUrl: (youtubeUrl) => ipcRenderer.invoke('get-video-url', youtubeUrl),
  sendRightHandVideo: (videoData) => ipcRenderer.invoke('send-right-hand-video', videoData),
  sendLeftHandVideo: (videoData) => ipcRenderer.invoke('send-left-hand-video', videoData),
  sendRightHandClipPath: (clipPath) => ipcRenderer.invoke('send-right-hand-clippath', clipPath),
  sendLeftHandClipPath: (clipPath) => ipcRenderer.invoke('send-left-hand-clippath', clipPath),
  sendRightHandParameters: (params) => ipcRenderer.invoke('send-right-hand-parameters', params),
  sendLeftHandParameters: (params) => ipcRenderer.invoke('send-left-hand-parameters', params)
});

// Listen for right hand video events
ipcRenderer.on('play-right-hand-video', (event, videoData) => {
  console.log('Preload received play-right-hand-video event:', videoData);
  window.postMessage({ type: 'play-right-hand-video', ...videoData }, '*');
});

// Listen for left hand video events
ipcRenderer.on('play-left-hand-video', (event, videoData) => {
  console.log('Preload received play-left-hand-video event:', videoData);
  window.postMessage({ type: 'play-left-hand-video', ...videoData }, '*');
});

// Listen for right hand clip-path events
ipcRenderer.on('apply-right-hand-clippath', (event, clipPath) => {
  console.log('Preload received apply-right-hand-clippath event:', clipPath);
  window.postMessage({ type: 'apply-right-hand-clippath', clipPath: clipPath }, '*');
});

// Listen for left hand clip-path events
ipcRenderer.on('apply-left-hand-clippath', (event, clipPath) => {
  console.log('Preload received apply-left-hand-clippath event:', clipPath);
  window.postMessage({ type: 'apply-left-hand-clippath', clipPath: clipPath }, '*');
});

// Listen for right hand parameter events
ipcRenderer.on('apply-right-hand-parameters', (event, params) => {
  console.log('Preload received apply-right-hand-parameters event:', params);
  window.postMessage({ type: 'apply-parameters', hand: 'right', params: params }, '*');
});

// Listen for left hand parameter events
ipcRenderer.on('apply-left-hand-parameters', (event, params) => {
  console.log('Preload received apply-left-hand-parameters event:', params);
  window.postMessage({ type: 'apply-parameters', hand: 'left', params: params }, '*');
});