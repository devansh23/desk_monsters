const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let pipWindow;

// Define path for the save file
const savePath = path.join(app.getPath('userData'), 'petState.json');
console.log('Save file path:', savePath);

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // Register file protocol for loading local resources
  protocol.registerFileProtocol('file', (request, callback) => {
    const url = request.url.substr(7);    /* all urls start with 'file://' */
    callback(decodeURIComponent(path.normalize(url)));
  });

  // Set Content Security Policy headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file: asset:;"
        ]
      }
    });
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Create PiP window but keep it hidden
  createPiPWindow();

  // Handle window minimize
  mainWindow.on('minimize', () => {
    if (pipWindow) {
      pipWindow.show();
    }
  });

  // Handle window restore
  mainWindow.on('restore', () => {
    if (pipWindow) {
      pipWindow.hide();
    }
  });

  // Handle window close
  mainWindow.on('close', () => {
    if (pipWindow) {
      pipWindow.close();
    }
  });

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

const createPiPWindow = () => {
  pipWindow = new BrowserWindow({
    width: 200,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  pipWindow.loadFile(path.join(__dirname, 'pip.html'));
  pipWindow.hide(); // Initially hidden

  // Position PiP window in the bottom right corner
  const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  pipWindow.setPosition(width - 220, height - 320);
};

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  protocol.registerFileProtocol('asset', (request, callback) => {
    const url = request.url.replace('asset://', '');
    callback(path.normalize(`${__dirname}/${url}`));
  });
  
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC communication for syncing state between windows
ipcMain.on('update-pet-state', (event, state) => {
  // Broadcast state update to all windows
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents !== event.sender) {
      window.webContents.send('pet-state-update', state);
    }
  });
});

// Handle saving pet state
ipcMain.handle('save-pet-state', async (event, state) => {
  try {
    // Ensure the directory exists
    const directory = path.dirname(savePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Write the state to the file
    fs.writeFileSync(savePath, JSON.stringify(state, null, 2));
    console.log('Pet state saved successfully to:', savePath);
    return true;
  } catch (error) {
    console.error('Error saving pet state:', error);
    return false;
  }
});

// Handle loading pet state
ipcMain.handle('load-pet-state', async (event) => {
  try {
    if (fs.existsSync(savePath)) {
      const data = fs.readFileSync(savePath, 'utf8');
      const state = JSON.parse(data);
      console.log('Pet state loaded successfully from:', savePath);
      return state;
    } else {
      console.log('No saved state found at:', savePath);
      return null;
    }
  } catch (error) {
    console.error('Error loading pet state:', error);
    return null;
  }
}); 