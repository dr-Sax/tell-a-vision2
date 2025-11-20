const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let threejsWindow;
let flaskProcess;
const FLASK_PORT = 5000;

function startFlaskServer() {
  const isWindows = process.platform === 'win32';
  const venvPython = isWindows
    ? path.join(__dirname, '.venv', 'Scripts', 'python.exe')
    : path.join(__dirname, '.venv', 'bin', 'python');
  
  flaskProcess = spawn(venvPython, [path.join(__dirname, 'server.py'), FLASK_PORT.toString()]);
  
  // Wait for server to start
  setTimeout(() => {}, 2000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('livecode.html');
}

function createThreejsWindow() {
  threejsWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Allow loading video URLs from different origins
    }
  });

  threejsWindow.loadFile('juggler.html');
}

// Disable hardware acceleration to prevent GPU crashes
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  startFlaskServer();
  createWindow();
  createThreejsWindow();
});

app.on('window-all-closed', () => {
  if (flaskProcess) flaskProcess.kill();
  app.quit();
});

ipcMain.handle('get-video-url', async (event, youtubeUrl) => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ url: youtubeUrl });
    
    const req = http.request({
      hostname: '127.0.0.1',
      port: FLASK_PORT,
      path: '/get-video-url',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.write(postData);
    req.end();
  });
});

// Handle sending right hand video to Three.js window
ipcMain.handle('send-right-hand-video', async (event, videoData) => {
  console.log('Received request to send right hand video to Three.js window:', videoData);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending play-right-hand-video event to Three.js window');
    threejsWindow.webContents.send('play-right-hand-video', videoData);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});

// Handle sending left hand video to Three.js window
ipcMain.handle('send-left-hand-video', async (event, videoData) => {
  console.log('Received request to send left hand video to Three.js window:', videoData);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending play-left-hand-video event to Three.js window');
    threejsWindow.webContents.send('play-left-hand-video', videoData);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});

// Handle sending right hand clip-path to Three.js window
ipcMain.handle('send-right-hand-clippath', async (event, clipPath) => {
  console.log('Received request to send right hand clip-path to Three.js window:', clipPath);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending apply-right-hand-clippath event to Three.js window');
    threejsWindow.webContents.send('apply-right-hand-clippath', clipPath);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});

// Handle sending left hand clip-path to Three.js window
ipcMain.handle('send-left-hand-clippath', async (event, clipPath) => {
  console.log('Received request to send left hand clip-path to Three.js window:', clipPath);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending apply-left-hand-clippath event to Three.js window');
    threejsWindow.webContents.send('apply-left-hand-clippath', clipPath);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});

// Handle sending right hand parameters to Three.js window
ipcMain.handle('send-right-hand-parameters', async (event, params) => {
  console.log('Main process: Received right hand parameters:', params);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Main process: Sending to Three.js window');
    threejsWindow.webContents.send('apply-right-hand-parameters', params);
    return { success: true };
  }
  console.log('Main process: Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});

// Handle sending left hand parameters to Three.js window
ipcMain.handle('send-left-hand-parameters', async (event, params) => {
  console.log('Main process: Received left hand parameters:', params);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Main process: Sending to Three.js window');
    threejsWindow.webContents.send('apply-left-hand-parameters', params);
    return { success: true };
  }
  console.log('Main process: Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});