const path = require('path');
const Pet = require('./logic/petLogic');

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
    
    // Fixed dimensions for the sprite
    this.displayWidth = 200;
    this.displayHeight = 200;
    
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
    const spritePath = path.join(__dirname, '..', 'assets', 'sprites').replace('app.asar', 'app.asar.unpacked');
    console.log('Sprite path:', spritePath);
    
    this.actions = {
      cleaning: { sheetPath: path.join(spritePath, 'cleaning.png') },
      eating: { sheetPath: path.join(spritePath, 'eating.png') },
      learning: { sheetPath: path.join(spritePath, 'learning.png') },
      myob: { sheetPath: path.join(spritePath, 'myob.png') },
      playing: { sheetPath: path.join(spritePath, 'playing.png') },
      sleeping: { sheetPath: path.join(spritePath, 'sleeping.png') }
    };
    
    this.emotions = {
      happy: { sheetPath: path.join(spritePath, 'happy.png') },
      neutral: { sheetPath: path.join(spritePath, 'neutral.png') },
      sad: { sheetPath: path.join(spritePath, 'sad.png') }
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
    const row = Math.floor(frameNumber / this.framesPerRow);
    const col = frameNumber % this.framesPerRow;
    return { row, col };
  }

  animate(timestamp) {
    if (!this.isAnimating) return;

    if (!this.lastFrameTime) this.lastFrameTime = timestamp;

    if (timestamp - this.lastFrameTime >= this.animationSpeed) {
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      
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

// Initialize when DOM is loaded
console.log('Setting up DOM content loaded listener');
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM content loaded, initializing game');
  try {
    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.style.display = 'flex';
    gameContainer.style.flexDirection = 'column';
    gameContainer.style.alignItems = 'center';
    gameContainer.style.padding = '20px';
    document.body.appendChild(gameContainer);

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'pet-sprite';
    canvas.width = 400;  // Increased canvas size
    canvas.height = 400; // Increased canvas size
    canvas.style.border = '2px solid #ccc';
    canvas.style.borderRadius = '10px';
    canvas.style.marginBottom = '20px';
    canvas.style.background = 'white'; // Add white background
    gameContainer.appendChild(canvas);

    // Create metrics display
    const metricsDiv = document.createElement('div');
    metricsDiv.style.marginBottom = '20px';
    metricsDiv.style.width = '300px';
    gameContainer.appendChild(metricsDiv);

    // Create action buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.display = 'grid';
    buttonsDiv.style.gridTemplateColumns = 'repeat(3, 1fr)';
    buttonsDiv.style.gap = '10px';
    buttonsDiv.style.width = '300px';
    gameContainer.appendChild(buttonsDiv);

    // Initialize pet and animator
    const pet = new Pet();
    const animator = new SpriteAnimator('pet-sprite');
    animator.start();

    // Set initial emotion
    await animator.setEmotion(pet.getEmotionalState());

    // Create action buttons
    const actions = [
      { name: 'Feed', method: 'feed' },
      { name: 'Play', method: 'play' },
      { name: 'Clean', method: 'clean' },
      { name: 'Sleep', method: 'sleep' },
      { name: 'Teach', method: 'teach' },
      { name: 'MYOB', method: 'myob' }
    ];

    actions.forEach(({ name, method }) => {
      const button = document.createElement('button');
      button.textContent = name;
      button.style.padding = '10px';
      button.style.borderRadius = '5px';
      button.style.border = '1px solid #ccc';
      button.style.cursor = 'pointer';
      button.onclick = async () => {
        const action = pet[method]();
        if (action) {
          try {
            // Just set the action - the animation system will handle the timing
            await animator.setAction(action);
          } catch (error) {
            console.error('Error during action animation:', error);
          }
        }
      };
      buttonsDiv.appendChild(button);
    });

    // Update metrics display
    function updateMetricsDisplay(metrics) {
      const bars = [
        { name: 'Hunger', value: metrics.hunger },
        { name: 'Happiness', value: metrics.happiness },
        { name: 'Energy', value: metrics.energy },
        { name: 'Health', value: metrics.health },
        { name: 'Love', value: metrics.love }
      ];

      metricsDiv.innerHTML = bars.map(bar => `
        <div style="margin-bottom: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${bar.name}</span>
            <span>${Math.floor(bar.value)}%</span>
          </div>
          <div style="width: 100%; height: 10px; background: #eee; border-radius: 5px;">
            <div style="width: ${bar.value}%; height: 100%; background: ${
              bar.value > 60 ? '#4CAF50' : 
              bar.value > 30 ? '#FFC107' : 
              '#F44336'
            }; border-radius: 5px;"></div>
          </div>
        </div>
      `).join('') + `
        <div style="margin-top: 10px; text-align: center;">
          Age: ${Math.floor(metrics.age)} days
        </div>
      `;
    }

    // Listen for metric updates
    window.addEventListener('pet-metrics-update', (event) => {
      updateMetricsDisplay(event.detail);
      animator.setEmotion(event.detail.emotion).catch(console.error);
    });

    // Initial metrics display
    updateMetricsDisplay(pet.getMetrics());

  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}); 