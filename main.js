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

// Handle sending video data to Three.js window
ipcMain.handle('send-video-to-threejs', async (event, videoData) => {
  console.log('Received request to send video to Three.js window:', videoData);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending play-video event to Three.js window');
    threejsWindow.webContents.send('play-video', videoData);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});
// Handle sending clip-path to Three.js window
ipcMain.handle('send-clippath-to-threejs', async (event, clipPath) => {
  console.log('Received request to send clip-path to Three.js window:', clipPath);
  if (threejsWindow && !threejsWindow.isDestroyed()) {
    console.log('Sending apply-clippath event to Three.js window');
    threejsWindow.webContents.send('apply-clippath', clipPath);
    return { success: true };
  }
  console.log('Three.js window not available');
  return { success: false, error: 'Three.js window not available' };
});