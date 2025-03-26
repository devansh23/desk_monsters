class Pet {
  constructor() {
    // Initialize all metrics to 50 (middle value)
    this.hunger = 50;
    this.happiness = 50;
    this.energy = 50;
    this.health = 50;
    this.love = 50;
    this.age = 0;
    this.lastTick = Date.now();

    // Start the decay timer
    this.startDecayTimer();
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

  // Action methods
  feed() {
    this.hunger = this.clampValue(this.hunger + 10);
    this.happiness = this.clampValue(this.happiness + 5);
    this.energy = this.clampValue(this.energy + 5);
    this.health = this.clampValue(this.health + 5);
    this.emitMetricsUpdate();
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
    return 'playing';
  }

  clean() {
    this.hunger = this.clampValue(this.hunger - 10);
    this.happiness = this.clampValue(this.happiness + 5);
    this.health = this.clampValue(this.health + 10);
    this.emitMetricsUpdate();
    return 'cleaning';
  }

  sleep() {
    this.hunger = this.clampValue(this.hunger - 5);
    this.energy = this.clampValue(this.energy + 10);
    this.health = this.clampValue(this.health + 5);
    this.emitMetricsUpdate();
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
    return 'learning';
  }

  myob() { // Mind Your Own Business - special action
    this.happiness = this.clampValue(this.happiness + 15);
    this.energy = this.clampValue(this.energy + 15);
    this.love = this.clampValue(this.love + 20);
    this.emitMetricsUpdate();
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

// Export the Pet class
module.exports = Pet; 