// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Expose protected methods that allow the renderer process to use
// IPC and other Electron features
contextBridge.exposeInMainWorld(
  'electron', {
    ipcRenderer: {
      send: (channel, data) => {
        ipcRenderer.send(channel, data);
      },
      on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    path: {
      join: (...args) => path.join(...args),
      resolve: (...args) => path.resolve(...args)
    }
  }
);
