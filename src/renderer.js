// Initialization will happen when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Rest of initialization code will be here
  initializeGame();
});

// Main initialization function
function initializeGame() {
  try {
    // Code to initialize the game
    const isPip = window.location.pathname.endsWith('pip.html');
    const canvasId = isPip ? 'pet-sprite-pip' : 'pet-sprite';
    
    // Initialize pet
    let pet;
    try {
      // Try to dynamically load the Pet class
      const script = document.createElement('script');
      script.src = 'logic/petLogic.js';
      script.onload = () => {
        if (window.Pet) {
          pet = new window.Pet();
          initializeAnimator(pet, canvasId, isPip);
        } else {
          console.error('Pet class not found after loading script');
        }
      };
      script.onerror = (err) => {
        console.error('Error loading Pet script:', err);
      };
      document.head.appendChild(script);
    } catch (err) {
      console.error('Failed to initialize Pet:', err);
    }
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}

// Function to initialize the animator once Pet is loaded
function initializeAnimator(pet, canvasId, isPip) {
  // Initialize animator
  const animator = new SpriteAnimator(canvasId);
  animator.start();

  // Set initial emotion
  animator.setEmotion(pet.getEmotionalState()).catch(console.error);

  // Create action buttons
  createButtons(pet, animator, isPip);

  // Initial metrics display
  updateMetricsDisplay(pet.getMetrics(), isPip);

  // Listen for metric updates
  window.addEventListener('pet-metrics-update', (event) => {
    updateMetricsDisplay(event.detail, isPip);
    animator.setEmotion(event.detail.emotion).catch(console.error);
    // Sync state with other windows
    if (window.electron) {
      window.electron.ipcRenderer.send('update-pet-state', {
        metrics: event.detail,
        emotion: event.detail.emotion
      });
    }
  });

  // Listen for state updates from other windows
  if (window.electron) {
    window.electron.ipcRenderer.on('pet-state-update', (state) => {
      if (state.action) {
        animator.setAction(state.action).catch(console.error);
      }
      if (state.metrics) {
        updateMetricsDisplay(state.metrics, isPip);
      }
      if (state.emotion) {
        animator.setEmotion(state.emotion).catch(console.error);
      }
    });
  }
}

// Update metrics display function
function updateMetricsDisplay(metrics, isPip) {
  const metricsContainer = document.getElementById(isPip ? 'metrics-pip' : 'metrics');
  if (!metricsContainer) return;
  
  const bars = [
    { name: 'Hunger', value: metrics.hunger },
    { name: 'Happiness', value: metrics.happiness },
    { name: 'Energy', value: metrics.energy },
    { name: 'Health', value: metrics.health },
    { name: 'Love', value: metrics.love }
  ];

  metricsContainer.innerHTML = bars.map(bar => `
    <div style="margin-bottom: ${isPip ? '2px' : '5px'};">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>${bar.name}</span>
        <span>${Math.floor(bar.value)}%</span>
      </div>
      <div class="metric-bar">
        <div class="metric-bar-fill" style="width: ${bar.value}%; background: ${
          bar.value > 60 ? '#4CAF50' : 
          bar.value > 30 ? '#FFC107' : 
          '#F44336'
        };"></div>
      </div>
    </div>
  `).join('') + `
    <div style="margin-top: ${isPip ? '4px' : '10px'}; text-align: center;">
      Age: ${Math.floor(metrics.age)} days
    </div>
  `;
}

// Create buttons function
function createButtons(pet, animator, isPip) {
  const actions = [
    { name: 'Feed', method: 'feed' },
    { name: 'Play', method: 'play' },
    { name: 'Clean', method: 'clean' },
    { name: 'Sleep', method: 'sleep' },
    { name: 'Teach', method: 'teach' },
    { name: 'MYOB', method: 'myob' }
  ];

  const buttonsContainer = document.getElementById(isPip ? 'buttons-pip' : 'buttons');
  if (!buttonsContainer) return;
  
  actions.forEach(({ name, method }) => {
    const button = document.createElement('button');
    button.textContent = name;
    if (!isPip) {
      button.style.padding = '10px';
      button.style.borderRadius = '5px';
      button.style.border = '1px solid #ccc';
      button.style.cursor = 'pointer';
    }
    button.onclick = async () => {
      const action = pet[method]();
      if (action) {
        try {
          await animator.setAction(action);
          // Sync state with other windows
          if (window.electron) {
            window.electron.ipcRenderer.send('update-pet-state', {
              action,
              metrics: pet.getMetrics()
            });
          }
        } catch (error) {
          console.error('Error during action animation:', error);
        }
      }
    };
    buttonsContainer.appendChild(button);
  });
}

class SpriteAnimator {
  constructor(canvasId) {
    console.log('\n========== CANVAS AND SPRITE DETAILS ==========');
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    // Get canvas properties
    const canvasRect = this.canvas.getBoundingClientRect();
    
    console.log('\nCANVAS DIMENSIONS:');
    console.log('Canvas Width:', this.canvas.width);
    console.log('Canvas Height:', this.canvas.height);
    console.log('\nCANVAS POSITION:');
    console.log('Canvas Top:', canvasRect.top);
    console.log('Canvas Left:', canvasRect.left);
    console.log('Canvas Bottom:', canvasRect.bottom);
    console.log('Canvas Right:', canvasRect.right);
    
    this.ctx = this.canvas.getContext('2d');
    this.spriteSheet = new Image();
    this.currentFrame = 0;
    this.framesPerRow = 6;
    this.totalFrames = 29;
    this.rows = 5;
    
    // Store canvas ID to determine if we're in PiP mode
    this.canvasId = canvasId;
    this.isPip = canvasId === 'pet-sprite-pip';
    
    // Adjust display size for PiP
    if (this.isPip) {
      this.displayWidth = 150;
      this.displayHeight = 150;
      this.canvas.width = 150;
      this.canvas.height = 150;
    } else {
      // Fixed dimensions for the sprite
      this.displayWidth = 200;
      this.displayHeight = 200;
    }
    
    // Calculate sprite positions
    this.drawX = (this.canvas.width - this.displayWidth) / 2;
    this.drawY = (this.canvas.height - this.displayHeight) / 2;
    
    console.log('\nSPRITE DETAILS:');
    console.log('Sprite Display Width:', this.displayWidth);
    console.log('Sprite Display Height:', this.displayHeight);
    console.log('Sprite Position X:', this.drawX);
    console.log('Sprite Position Y:', this.drawY);
    
    // Source frame dimensions
    this.frameWidth = 1280 / this.framesPerRow;
    this.frameHeight = 1066 / this.rows;
    console.log('\nSPRITE FRAME DETAILS:');
    console.log('Frame Width:', this.frameWidth);
    console.log('Frame Height:', this.frameHeight);
    console.log('==========================================\n');
    
    this.animationSpeed = 200;
    this.lastFrameTime = 0;
    this.isLoading = false;
    this.loadingQueue = [];
    this.loadingTimeout = null;
    this.isActionPlaying = false;
    this.actionStartFrame = 0;
    
    // Define available actions and emotions with proper path resolution
    // Use relative paths that work in browser
    this.actions = {
      cleaning: { sheetPath: '../assets/sprites/cleaning.png' },
      eating: { sheetPath: '../assets/sprites/eating.png' },
      learning: { sheetPath: '../assets/sprites/learning.png' },
      myob: { sheetPath: '../assets/sprites/myob.png' },
      playing: { sheetPath: '../assets/sprites/playing.png' },
      sleeping: { sheetPath: '../assets/sprites/sleeping.png' }
    };
    
    this.emotions = {
      happy: { sheetPath: '../assets/sprites/happy.png' },
      neutral: { sheetPath: '../assets/sprites/neutral.png' },
      sad: { sheetPath: '../assets/sprites/sad.png' }
    };

    this.currentAction = null;
    this.currentEmotion = 'neutral';
    this.isAnimating = false;
    
    console.log('SpriteAnimator initialized');
    this.drawLoadingState('Initializing...');
  }

  drawLoadingState(message) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
  }

  async loadSprite(spriteSheetPath) {
    // Clear any existing loading timeout
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }

    if (this.isLoading) {
      console.log('Already loading a sprite, queueing:', spriteSheetPath);
      return new Promise((resolve, reject) => {
        this.loadingQueue.push({ path: spriteSheetPath, resolve, reject });
      });
    }

    this.isLoading = true;
    this.drawLoadingState('Loading sprite...');
    console.log('Loading sprite sheet:', spriteSheetPath);

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        // Set a timeout for loading
        this.loadingTimeout = setTimeout(() => {
          reject(new Error('Sprite loading timed out'));
        }, 5000);

        img.onload = () => {
          clearTimeout(this.loadingTimeout);
          resolve();
        };
        
        img.onerror = () => {
          clearTimeout(this.loadingTimeout);
          reject(new Error(`Failed to load sprite: ${spriteSheetPath}`));
        };

        // Add timestamp to prevent caching
        img.src = `${spriteSheetPath}?t=${Date.now()}`;
      });
      
      console.log('Sprite sheet loaded successfully:', spriteSheetPath);
      console.log('Sprite dimensions:', img.width, 'x', img.height);
      this.spriteSheet = img;
      this.isLoading = false;

      // Process next sprite in queue if any
      if (this.loadingQueue.length > 0) {
        const next = this.loadingQueue.shift();
        setTimeout(() => {
          this.loadSprite(next.path).then(next.resolve).catch(next.reject);
        }, 100); // Add small delay between loading sprites
      }
    } catch (error) {
      console.error('Failed to load sprite sheet:', spriteSheetPath, error);
      this.drawLoadingState(`Error loading sprite: ${error.message}`);
      this.isLoading = false;
      throw error;
    }
  }

  setAction(action) {
    console.log('Setting action:', action);
    if (this.actions[action]) {
      this.currentAction = action;
      this.currentFrame = 0;
      this.isActionPlaying = true;
      this.actionStartFrame = 0;
      return this.loadSprite(this.actions[action].sheetPath);
    }
    return Promise.reject(new Error(`Invalid action: ${action}`));
  }

  setEmotion(emotion) {
    console.log('Setting emotion:', emotion);
    // Don't interrupt action animations
    if (this.isActionPlaying) {
      console.log('Action animation in progress, queueing emotion change');
      return Promise.resolve();
    }
    if (this.emotions[emotion]) {
      this.currentEmotion = emotion;
      this.currentFrame = 0;
      return this.loadSprite(this.emotions[emotion].sheetPath);
    }
    return Promise.reject(new Error(`Invalid emotion: ${emotion}`));
  }

  getFramePosition(frameNumber) {
    // Add special handling for the last row
    const row = Math.floor(frameNumber / this.framesPerRow);
    const col = frameNumber % this.framesPerRow;
    // If we're on the last row and beyond the last valid frame
    if (row === this.rows - 1 && col >= this.totalFrames % this.framesPerRow) {
        return { row: 0, col: 0 }; // Reset to first frame
    }
    return { row, col };
  }

  animate(timestamp) {
    if (!this.isAnimating) return;

    if (!this.lastFrameTime) this.lastFrameTime = timestamp;

    if (timestamp - this.lastFrameTime >= this.animationSpeed) {
      const oldFrame = this.currentFrame;
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      
      // Debug logging for frame transitions
      const oldPos = this.getFramePosition(oldFrame);
      const newPos = this.getFramePosition(this.currentFrame);
      // console.log(`Frame transition: ${oldFrame}(${oldPos.row},${oldPos.col}) -> ${this.currentFrame}(${newPos.row},${newPos.col})`);
      
      if (this.isActionPlaying) {
        this.actionStartFrame++;
        if (this.actionStartFrame >= this.totalFrames) {
          this.isActionPlaying = false;
          this.currentAction = null;
          this.setEmotion(this.currentEmotion);
        }
      }
      
      this.lastFrameTime = timestamp;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw current frame
    try {
      if (this.spriteSheet && this.spriteSheet.complete) {
        const { row, col } = this.getFramePosition(this.currentFrame);
        
        // Log frame drawing details on first frame
        if (this.currentFrame === 0) {
          console.log('Drawing frame details:');
          console.log('Source:', {
            x: col * this.frameWidth,
            y: row * this.frameHeight,
            width: this.frameWidth,
            height: this.frameHeight
          });
          console.log('Destination:', {
            x: this.drawX,
            y: this.drawY,
            width: this.displayWidth,
            height: this.displayHeight
          });
        }
        
        this.ctx.drawImage(
          this.spriteSheet,
          col * this.frameWidth,
          row * this.frameHeight,
          this.frameWidth,
          this.frameHeight,
          this.drawX,
          this.drawY,
          this.displayWidth,
          this.displayHeight
        );
      }
    } catch (error) {
      console.error('Error drawing frame:', error);
      this.drawLoadingState('Error drawing frame!');
    }

    requestAnimationFrame(this.animate.bind(this));
  }

  start() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate(performance.now());
    }
  }

  stop() {
    this.isAnimating = false;
  }
} 