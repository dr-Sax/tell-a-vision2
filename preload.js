const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVideoUrl: (youtubeUrl) => ipcRenderer.invoke('get-video-url', youtubeUrl)
});