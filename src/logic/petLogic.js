class Pet {
  constructor() {
    // Load saved state or initialize default values
    this.loadState();
    
    // If loadState didn't set lastTick (new game), set it now
    if (!this.lastTick) {
      this.lastTick = Date.now();
    }

    // Start the decay timer
    this.startDecayTimer();
    
    // Set up auto-save timer (save every 5 minutes)
    this.startAutoSaveTimer();
  }

  // Ensure value stays within 0-100 range
  clampValue(value) {
    return Math.max(0, Math.min(100, value));
  }

  // Update all metrics based on time passed
  tick() {
    const now = Date.now();
    const minutesPassed = (now - this.lastTick) / (1000 * 60);
    this.lastTick = now;

    // Apply decay rates
    this.hunger = this.clampValue(this.hunger - minutesPassed / 5);     // -1 per 5 minutes
    this.happiness = this.clampValue(this.happiness - minutesPassed / 5); // -1 per 5 minutes
    this.energy = this.clampValue(this.energy - minutesPassed / 15);     // -1 per 15 minutes
    this.health = this.clampValue(this.health - minutesPassed / 30);     // -1 per 30 minutes
    this.love = this.clampValue(this.love - minutesPassed / 30);         // -1 per 30 minutes

    // Increment age (1 day = 24 real minutes)
    this.age += minutesPassed / 24;

    // Emit metrics update event
    this.emitMetricsUpdate();
  }

  startDecayTimer() {
    // Update metrics every minute
    setInterval(() => this.tick(), 60000);
  }
  
  startAutoSaveTimer() {
    // Auto-save every 5 minutes
    setInterval(() => this.saveState(), 5 * 60 * 1000);
    
    // Also save when the window is about to close
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveState();
      });
    }
  }

  // Save pet state to a local file
  saveState() {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const state = {
          hunger: this.hunger,
          happiness: this.happiness,
          energy: this.energy,
          health: this.health,
          love: this.love,
          age: this.age,
          lastTick: this.lastTick
        };
        
        window.electron.ipcRenderer.invoke('save-pet-state', state)
          .then(success => {
            if (success) {
              console.log('Pet state saved successfully');
            } else {
              console.warn('Failed to save pet state');
            }
          })
          .catch(error => {
            console.error('Error while saving pet state:', error);
          });
      }
    } catch (error) {
      console.error('Failed to save pet state:', error);
    }
  }

  // Load pet state from the local file
  loadState() {
    // Initialize with default values first
    this.hunger = 50;
    this.happiness = 50;
    this.energy = 50;
    this.health = 50;
    this.love = 50;
    this.age = 0;
    this.lastTick = Date.now();
    
    // Then try to load saved state
    try {
      if (typeof window !== 'undefined' && window.electron) {
        // Use async loading with a promise
        window.electron.ipcRenderer.invoke('load-pet-state')
          .then(savedState => {
            if (savedState) {
              this.hunger = savedState.hunger || 50;
              this.happiness = savedState.happiness || 50;
              this.energy = savedState.energy || 50;
              this.health = savedState.health || 50;
              this.love = savedState.love || 50;
              this.age = savedState.age || 0;
              this.lastTick = savedState.lastTick || Date.now();
              console.log('Pet state loaded successfully');
              
              // Update the UI after loading state
              this.emitMetricsUpdate();
            } else {
              console.log('No saved state found, using default values');
            }
          })
          .catch(error => {
            console.error('Error loading pet state:', error);
          });
      }
    } catch (error) {
      console.error('Failed to load pet state:', error);
    }
  }

  // Action methods
  feed() {
    this.hunger = this.clampValue(this.hunger + 10);
    this.happiness = this.clampValue(this.happiness + 5);
    this.energy = this.clampValue(this.energy + 5);
    this.health = this.clampValue(this.health + 5);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'eating';
  }

  play() {
    if (this.energy < 20) {
      return null; // Too tired to play
    }
    this.hunger = this.clampValue(this.hunger - 15);
    this.happiness = this.clampValue(this.happiness + 5);
    this.energy = this.clampValue(this.energy - 20);
    this.health = this.clampValue(this.health + 10);
    this.love = this.clampValue(this.love + 15);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'playing';
  }

  clean() {
    this.hunger = this.clampValue(this.hunger - 10);
    this.happiness = this.clampValue(this.happiness + 5);
    this.health = this.clampValue(this.health + 10);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'cleaning';
  }

  sleep() {
    this.hunger = this.clampValue(this.hunger - 5);
    this.energy = this.clampValue(this.energy + 10);
    this.health = this.clampValue(this.health + 5);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'sleeping';
  }

  teach() {
    if (this.energy < 15) {
      return null; // Too tired to learn
    }
    this.hunger = this.clampValue(this.hunger - 15);
    this.happiness = this.clampValue(this.happiness - 5);
    this.energy = this.clampValue(this.energy - 15);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'learning';
  }

  myob() { // Mind Your Own Business - special action
    this.happiness = this.clampValue(this.happiness + 15);
    this.energy = this.clampValue(this.energy + 15);
    this.love = this.clampValue(this.love + 20);
    this.emitMetricsUpdate();
    // Save state after action
    this.saveState();
    return 'myob';
  }

  // Get current emotional state based on happiness
  getEmotionalState() {
    if (this.happiness > 80) return 'happy';
    if (this.happiness < 30) return 'sad';
    return 'neutral';
  }

  // Get all current metrics
  getMetrics() {
    return {
      hunger: this.hunger,
      happiness: this.happiness,
      energy: this.energy,
      health: this.health,
      love: this.love,
      age: Math.floor(this.age),
      emotion: this.getEmotionalState()
    };
  }

  // Emit metrics update event
  emitMetricsUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pet-metrics-update', {
        detail: this.getMetrics()
      }));
    }
  }
}

// Make it work in both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Pet;
} else if (typeof window !== 'undefined') {
  window.Pet = Pet;
} 