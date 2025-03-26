// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// IPC and other Electron features
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // Whitelist channels
      const validChannels = ['update-pet-state'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      // Whitelist channels
      const validChannels = ['pet-state-update'];
      if (validChannels.includes(channel)) {
        // Strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
        return () => {
          ipcRenderer.removeListener(channel, func);
        };
      }
    },
    invoke: async (channel, data) => {
      const validChannels = ['save-pet-state', 'load-pet-state'];
      if (validChannels.includes(channel)) {
        try {
          return await ipcRenderer.invoke(channel, data);
        } catch (error) {
          console.error(`Error invoking ${channel}:`, error);
          return null;
        }
      }
      return null;
    }
  }
});
