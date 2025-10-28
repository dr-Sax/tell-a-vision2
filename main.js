const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
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
      // Additional security settings
      nodeIntegration: false,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');
}

// Disable hardware acceleration to prevent GPU crashes
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  startFlaskServer();
  createWindow();
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