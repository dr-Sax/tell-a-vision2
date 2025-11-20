const codeEditor = document.getElementById('codeEditor');
const statusText = document.getElementById('statusText');
const videoContainer = document.getElementById('videoContainer');
const modeDisplay = document.getElementById('modeDisplay');
const modeParams = document.getElementById('modeParams');

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 180;

let rightHandVideo = null;
let leftHandVideo = null;

// Foot mouse control system
let footModes = [];
let currentModeIndex = 0;
let footMouseActive = false;

// Video parameter state (persists across mode changes)
let videoParams = {
  right: {
    volume: 100,
    speed: 1.0,
    hue: 0,
    saturation: 100,
    brightness: 100,
    contrast: 100,
    blur: 0,
    timestamp: 0,
    scale: 1.0,
    opacity: 1.0,
    grayscale: 0,
    sepia: 0
  },
  left: {
    volume: 100,
    speed: 1.0,
    hue: 0,
    saturation: 100,
    brightness: 100,
    contrast: 100,
    blur: 0,
    timestamp: 0,
    scale: 1.0,
    opacity: 1.0,
    grayscale: 0,
    sepia: 0
  }
};

// Parameter ranges and types
const parameterConfig = {
  volume: { min: 0, max: 100, default: 100, type: 'absolute', unit: '%' },
  speed: { min: 0.25, max: 2.0, default: 1.0, type: 'absolute', unit: 'x' },
  hue: { min: 0, max: 360, default: 0, type: 'accumulated', unit: '°', wrap: true },
  saturation: { min: 0, max: 200, default: 100, type: 'absolute', unit: '%' },
  brightness: { min: 0, max: 200, default: 100, type: 'absolute', unit: '%' },
  contrast: { min: 0, max: 200, default: 100, type: 'absolute', unit: '%' },
  blur: { min: 0, max: 10, default: 0, type: 'absolute', unit: 'px' },
  timestamp: { min: 0, max: 100, default: 0, type: 'absolute', unit: 's' },
  scale: { min: 0.5, max: 2.0, default: 1.0, type: 'absolute', unit: 'x' },
  opacity: { min: 0, max: 1.0, default: 1.0, type: 'absolute', unit: '' },
  grayscale: { min: 0, max: 100, default: 0, type: 'absolute', unit: '%' },
  sepia: { min: 0, max: 100, default: 0, type: 'absolute', unit: '%' }
};

function executeCode() {
  const code = codeEditor.value;
  videoContainer.innerHTML = '';
  rightHandVideo = null;
  leftHandVideo = null;
  footModes = [];
  
  // Parse right_hand() calls
  const rightHandRegex = /right_hand\(\{[\s\S]*?\}\);/g;
  const rightHandMatches = code.matchAll(rightHandRegex);
  
  for (const match of rightHandMatches) {
    const videoStr = match[0];
    const urlMatch = videoStr.match(/url:\s*["']([^"']+)["']/);
    const startMatch = videoStr.match(/start:\s*(\d+(?:\.\d+)?)/);
    const endMatch = videoStr.match(/end:\s*(\d+(?:\.\d+)?)/);
    
    if (urlMatch) {
      rightHandVideo = {
        hand: 'right',
        url: urlMatch[1],
        start: startMatch ? parseFloat(startMatch[1]) : 0,
        end: endMatch ? parseFloat(endMatch[1]) : null,
        vertices: []
      };
      
      // Update timestamp range based on video
      parameterConfig.timestamp.min = rightHandVideo.start;
      parameterConfig.timestamp.max = rightHandVideo.end || 100;
      
      createVideoElement(rightHandVideo);
      loadVideoToThreeJs(rightHandVideo);
    }
  }
  
  // Parse left_hand() calls
  const leftHandRegex = /left_hand\(\{[\s\S]*?\}\);/g;
  const leftHandMatches = code.matchAll(leftHandRegex);
  
  for (const match of leftHandMatches) {
    const videoStr = match[0];
    const urlMatch = videoStr.match(/url:\s*["']([^"']+)["']/);
    const startMatch = videoStr.match(/start:\s*(\d+(?:\.\d+)?)/);
    const endMatch = videoStr.match(/end:\s*(\d+(?:\.\d+)?)/);
    
    if (urlMatch) {
      leftHandVideo = {
        hand: 'left',
        url: urlMatch[1],
        start: startMatch ? parseFloat(startMatch[1]) : 0,
        end: endMatch ? parseFloat(endMatch[1]) : null,
        vertices: []
      };
      
      createVideoElement(leftHandVideo);
      loadVideoToThreeJs(leftHandVideo);
    }
  }
  
  // Parse foot_mode() calls
  const footModeRegex = /foot_mode\((\d+),\s*["']([^"']+)["'],\s*\{([\s\S]*?)\}\);/g;
  const footModeMatches = code.matchAll(footModeRegex);
  
  for (const match of footModeMatches) {
    const index = parseInt(match[1]);
    const name = match[2];
    const configStr = match[3];
    
    const mode = {
      index: index,
      name: name,
      config: {}
    };
    
    // Parse target (if present)
    const targetMatch = configStr.match(/target:\s*["']([^"']+)["']/);
    if (targetMatch) {
      mode.config.target = targetMatch[1];
    }
    
    // Parse x and y mappings (simple target)
    const xMatch = configStr.match(/x:\s*["']([^"']+)["']/);
    const yMatch = configStr.match(/y:\s*["']([^"']+)["']/);
    if (xMatch && yMatch && !configStr.includes('right:')) {
      mode.config.x = xMatch[1];
      mode.config.y = yMatch[1];
    }
    
    // Parse right hand config
    const rightConfigMatch = configStr.match(/right:\s*\{([^}]+)\}/);
    if (rightConfigMatch) {
      const rightConfig = rightConfigMatch[1];
      const rightX = rightConfig.match(/x:\s*["']([^"']+)["']/);
      const rightY = rightConfig.match(/y:\s*["']([^"']+)["']/);
      mode.config.right = {
        x: rightX ? rightX[1] : null,
        y: rightY ? rightY[1] : null
      };
    }
    
    // Parse left hand config
    const leftConfigMatch = configStr.match(/left:\s*\{([^}]+)\}/);
    if (leftConfigMatch) {
      const leftConfig = leftConfigMatch[1];
      const leftX = leftConfig.match(/x:\s*["']([^"']+)["']/);
      const leftY = leftConfig.match(/y:\s*["']([^"']+)["']/);
      mode.config.left = {
        x: leftX ? leftX[1] : null,
        y: leftY ? leftY[1] : null
      };
    }
    
    footModes[index] = mode;
  }
  
  // Clean up any undefined slots in footModes array
  footModes = footModes.filter(m => m !== undefined);
  
  // Initialize mode display
  if (footModes.length > 0) {
    currentModeIndex = 0;
    updateModeDisplay();
    statusText.textContent = `Loaded ${footModes.length} foot control mode(s)`;
  }
  
  const videoCount = (rightHandVideo ? 1 : 0) + (leftHandVideo ? 1 : 0);
  if (videoCount > 0) {
    statusText.textContent = `${videoCount} video(s) loaded, ${footModes.length} mode(s) configured`;
  }
}

function updateModeDisplay() {
  if (footModes.length === 0) {
    modeDisplay.textContent = 'No modes defined';
    modeParams.textContent = '';
    return;
  }
  
  const mode = footModes[currentModeIndex];
  modeDisplay.textContent = `MODE ${mode.index}: ${mode.name}`;
  
  let paramsText = '';
  
  if (mode.config.target) {
    // Single target mode
    const target = mode.config.target === 'both' ? 'Both' : 
                   mode.config.target === 'right' ? 'Right' : 'Left';
    paramsText = `${target}: X=${mode.config.x} Y=${mode.config.y}`;
  } else {
    // Per-hand mode
    const parts = [];
    if (mode.config.right) {
      parts.push(`Right: X=${mode.config.right.x} Y=${mode.config.right.y}`);
    }
    if (mode.config.left) {
      parts.push(`Left: X=${mode.config.left.x} Y=${mode.config.left.y}`);
    }
    paramsText = parts.join(' | ');
  }
  
  modeParams.textContent = paramsText;
}

function cycleMode(direction) {
  if (footModes.length === 0) return;
  
  if (direction === 'next') {
    currentModeIndex = (currentModeIndex + 1) % footModes.length;
  } else {
    currentModeIndex = (currentModeIndex - 1 + footModes.length) % footModes.length;
  }
  
  updateModeDisplay();
  statusText.textContent = `Switched to mode: ${footModes[currentModeIndex].name}`;
}

function applyFootMouseMovement(deltaX, deltaY) {
  if (footModes.length === 0) return;
  
  const mode = footModes[currentModeIndex];
  const sensitivity = 0.5; // Adjust this for more/less sensitivity
  
  // Determine which hands to affect
  let hands = [];
  if (mode.config.target === 'both') {
    hands = ['right', 'left'];
  } else if (mode.config.target === 'right') {
    hands = ['right'];
  } else if (mode.config.target === 'left') {
    hands = ['left'];
  } else {
    // Per-hand configuration
    hands = [];
    if (mode.config.right) hands.push('right');
    if (mode.config.left) hands.push('left');
  }
  
  // Apply parameter changes
  hands.forEach(hand => {
    let xParam, yParam;
    
    if (mode.config.target) {
      // Simple target mode
      xParam = mode.config.x;
      yParam = mode.config.y;
    } else {
      // Per-hand mode
      xParam = mode.config[hand]?.x;
      yParam = mode.config[hand]?.y;
    }
    
    if (xParam && Math.abs(deltaX) > 0.1) {
      updateParameter(hand, xParam, deltaX * sensitivity);
    }
    
    if (yParam && Math.abs(deltaY) > 0.1) {
      updateParameter(hand, yParam, -deltaY * sensitivity); // Invert Y
    }
  });
  
  // Apply changes to videos
  applyVideoParameters('right');
  applyVideoParameters('left');
  
  // Update parameter display
  updateParameterDisplay('right');
  updateParameterDisplay('left');
}

function updateParameter(hand, paramName, delta) {
  const config = parameterConfig[paramName];
  if (!config) return;
  
  const currentValue = videoParams[hand][paramName];
  let newValue;
  
  if (config.type === 'accumulated') {
    // Accumulated parameters (like hue rotation)
    newValue = currentValue + delta * 5; // Scale for reasonable speed
    
    if (config.wrap) {
      // Wrap around (for hue)
      while (newValue < config.min) newValue += (config.max - config.min);
      while (newValue >= config.max) newValue -= (config.max - config.min);
    } else {
      newValue = Math.max(config.min, Math.min(config.max, newValue));
    }
  } else {
    // Absolute parameters
    const range = config.max - config.min;
    newValue = currentValue + (delta / 100) * range; // Delta is normalized
    newValue = Math.max(config.min, Math.min(config.max, newValue));
  }
  
  videoParams[hand][paramName] = newValue;
}

async function applyVideoParameters(hand) {
  const params = videoParams[hand];
  const videoObj = hand === 'right' ? rightHandVideo : leftHandVideo;
  
  if (!videoObj) return;
  
  // Send parameters to juggler window via Electron IPC
  try {
    console.log(`Sending ${hand} hand parameters:`, params);
    if (hand === 'right') {
      await window.electronAPI.sendRightHandParameters(params);
    } else {
      await window.electronAPI.sendLeftHandParameters(params);
    }
    console.log(`${hand} hand parameters sent successfully`);
  } catch (error) {
    console.error(`Error sending ${hand} hand parameters:`, error);
  }
}

function updateParameterDisplay(hand) {
  const paramsDiv = document.getElementById(`params-${hand}`);
  if (!paramsDiv) return;
  
  const params = videoParams[hand];
  const mode = footModes[currentModeIndex];
  
  // Get active parameters for this mode
  let activeParams = [];
  if (mode.config.target === 'both' || mode.config.target === hand) {
    activeParams = [mode.config.x, mode.config.y];
  } else if (mode.config[hand]) {
    activeParams = [mode.config[hand].x, mode.config[hand].y];
  }
  
  // Build HTML for active parameters
  let html = '';
  activeParams.forEach(paramName => {
    if (paramName && params[paramName] !== undefined) {
      const config = parameterConfig[paramName];
      const value = params[paramName];
      const displayValue = config.unit === '' ? value.toFixed(2) : 
                          config.unit === 's' ? value.toFixed(1) :
                          Math.round(value);
      
      html += `<div class="param-line">
        <span class="param-name">${paramName}:</span>
        <span class="param-value">${displayValue}${config.unit}</span>
      </div>`;
    }
  });
  
  // Add all non-default parameters (dimmed)
  Object.keys(params).forEach(paramName => {
    if (!activeParams.includes(paramName)) {
      const config = parameterConfig[paramName];
      if (config && Math.abs(params[paramName] - config.default) > 0.01) {
        const value = params[paramName];
        const displayValue = config.unit === '' ? value.toFixed(2) : 
                            config.unit === 's' ? value.toFixed(1) :
                            Math.round(value);
        
        html += `<div class="param-line" style="opacity: 0.4;">
          <span class="param-name">${paramName}:</span>
          <span class="param-value">${displayValue}${config.unit}</span>
        </div>`;
      }
    }
  });
  
  paramsDiv.innerHTML = html || '<div style="opacity: 0.5;">No active parameters</div>';
}

function createVideoElement(videoObj) {
  const container = document.createElement('div');
  container.className = 'video-object';
  container.id = `video-${videoObj.hand}`;
  
  const label = document.createElement('div');
  label.className = 'video-label';
  label.textContent = `${videoObj.hand.toUpperCase()} HAND`;
  container.appendChild(label);
  
  const info = document.createElement('div');
  info.className = 'video-info';
  info.textContent = videoObj.url.substring(0, 60) + '...';
  container.appendChild(info);
  
  const paramsDiv = document.createElement('div');
  paramsDiv.className = 'video-params';
  paramsDiv.id = `params-${videoObj.hand}`;
  container.appendChild(paramsDiv);
  
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.id = `hint-${videoObj.hand}`;
  hint.textContent = 'Click canvas to add vertices for clip-path';
  container.appendChild(hint);
  
  const canvasDiv = document.createElement('div');
  canvasDiv.id = `canvas-container-${videoObj.hand}`;
  container.appendChild(canvasDiv);
  
  videoContainer.appendChild(container);
  
  initCanvas(videoObj);
}

function initCanvas(videoObj) {
  const sketch = (p) => {
    let dragging = -1;
    
    p.setup = () => {
      const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
      canvas.parent(`canvas-container-${videoObj.hand}`);
    };
    
    p.draw = () => {
      p.background(0);
      
      // Grid
      p.stroke(20);
      p.strokeWeight(1);
      for (let x = 0; x < CANVAS_WIDTH; x += 40) p.line(x, 0, x, CANVAS_HEIGHT);
      for (let y = 0; y < CANVAS_HEIGHT; y += 40) p.line(0, y, CANVAS_WIDTH, y);
      
      const vertices = videoObj.vertices;
      const color = videoObj.hand === 'right' ? p.color(255, 165, 0) : p.color(0, 200, 255);
      
      // Lines between vertices
      p.stroke(color);
      p.strokeWeight(3);
      for (let i = 1; i < vertices.length; i++) {
        p.line(vertices[i - 1][0], vertices[i - 1][1], vertices[i][0], vertices[i][1]);
      }
      
      // Close shape if 3+ vertices
      if (vertices.length >= 3) {
        p.line(vertices[vertices.length - 1][0], vertices[vertices.length - 1][1], 
               vertices[0][0], vertices[0][1]);
        
        const fillColor = videoObj.hand === 'right' 
          ? p.color(255, 165, 0, 30) 
          : p.color(0, 200, 255, 30);
        p.fill(fillColor);
        p.noStroke();
        p.beginShape();
        for (let v of vertices) p.vertex(v[0], v[1]);
        p.endShape(p.CLOSE);
      }
      
      // Vertices
      for (let i = 0; i < vertices.length; i++) {
        const dist = p.dist(p.mouseX, p.mouseY, vertices[i][0], vertices[i][1]);
        const hover = dist < 10;
        
        if (hover) {
          p.fill(255, 255, 0);
          p.stroke(255, 255, 0);
          p.strokeWeight(3);
          p.circle(vertices[i][0], vertices[i][1], 18);
        } else {
          p.fill(color);
          p.stroke(color);
          p.strokeWeight(2);
          p.circle(vertices[i][0], vertices[i][1], 14);
        }
        
        p.fill(0);
        p.noStroke();
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(10);
        p.text(i, vertices[i][0], vertices[i][1]);
      }
    };
    
    p.mousePressed = () => {
      if (p.mouseX < 0 || p.mouseX > CANVAS_WIDTH || p.mouseY < 0 || p.mouseY > CANVAS_HEIGHT) return;
      
      // Check if clicking on vertex
      for (let i = 0; i < videoObj.vertices.length; i++) {
        const dist = p.dist(p.mouseX, p.mouseY, videoObj.vertices[i][0], videoObj.vertices[i][1]);
        if (dist < 10) {
          if (p.mouseButton === p.RIGHT) {
            // Delete vertex
            videoObj.vertices.splice(i, 1);
            updateHint(videoObj);
            if (videoObj.vertices.length >= 3) updateClipPath(videoObj);
            return false;
          } else {
            // Start dragging
            dragging = i;
            return;
          }
        }
      }
      
      // Add new vertex
      if (p.mouseButton === p.LEFT) {
        videoObj.vertices.push([p.mouseX, p.mouseY]);
        updateHint(videoObj);
        if (videoObj.vertices.length >= 3) updateClipPath(videoObj);
      }
    };
    
    p.mouseDragged = () => {
      if (dragging >= 0) {
        videoObj.vertices[dragging][0] = p.constrain(p.mouseX, 0, CANVAS_WIDTH);
        videoObj.vertices[dragging][1] = p.constrain(p.mouseY, 0, CANVAS_HEIGHT);
        if (videoObj.vertices.length >= 3) updateClipPath(videoObj);
      }
    };
    
    p.mouseReleased = () => {
      dragging = -1;
    };
  };
  
  new p5(sketch);
}

function updateHint(videoObj) {
  const hint = document.getElementById(`hint-${videoObj.hand}`);
  hint.textContent = `${videoObj.vertices.length} vertices`;
}

function updateClipPath(videoObj) {
  const points = videoObj.vertices.map(v => {
    const xPercent = ((v[0] / CANVAS_WIDTH) * 100).toFixed(2);
    const yPercent = ((v[1] / CANVAS_HEIGHT) * 100).toFixed(2);
    return `${xPercent}% ${yPercent}%`;
  }).join(', ');
  
  const clipPath = `polygon(${points})`;
  
  if (videoObj.hand === 'right') {
    window.electronAPI.sendRightHandClipPath(clipPath);
  } else {
    window.electronAPI.sendLeftHandClipPath(clipPath);
  }
}

async function loadVideoToThreeJs(videoObj) {
  statusText.textContent = `Loading ${videoObj.hand} hand video...`;
  
  try {
    const result = await window.electronAPI.getVideoUrl(videoObj.url);
    
    if (result.success) {
      if (videoObj.hand === 'right') {
        await window.electronAPI.sendRightHandVideo({
          url: result.url,
          startTime: videoObj.start,
          endTime: videoObj.end
        });
        
        // Send initial parameters after a short delay to ensure video is loaded
        setTimeout(() => {
          console.log('Sending initial right hand parameters');
          applyVideoParameters('right');
        }, 1000);
      } else {
        await window.electronAPI.sendLeftHandVideo({
          url: result.url,
          startTime: videoObj.start,
          endTime: videoObj.end
        });
        
        // Send initial parameters after a short delay to ensure video is loaded
        setTimeout(() => {
          console.log('Sending initial left hand parameters');
          applyVideoParameters('left');
        }, 1000);
      }
      
      statusText.textContent = `${videoObj.hand} hand video loaded`;
      
      if (videoObj.vertices.length >= 3) {
        updateClipPath(videoObj);
      }
      
      // Initialize parameter display
      updateParameterDisplay(videoObj.hand);
    } else {
      statusText.textContent = 'Error: ' + result.error;
    }
  } catch (error) {
    statusText.textContent = 'Error: ' + error.message;
  }
}

// Mouse event tracking for foot mouse
let lastMouseX = null;
let lastMouseY = null;

document.addEventListener('mousemove', (e) => {
  // Only track if mouse is not over canvas (to avoid interfering with clip-path drawing)
  if (e.target.tagName !== 'CANVAS' && lastMouseX !== null) {
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    
    // Only process if there's actual movement
    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      applyFootMouseMovement(deltaX, deltaY);
    }
  }
  
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

// Handle mouse clicks for mode cycling
document.addEventListener('mousedown', (e) => {
  // Ignore clicks on canvas or code editor
  if (e.target.tagName === 'CANVAS' || e.target.id === 'codeEditor') {
    return;
  }
  
  if (e.button === 0) {
    // Left click - cycle to next mode
    cycleMode('next');
    e.preventDefault();
  } else if (e.button === 2) {
    // Right click - cycle to previous mode
    cycleMode('prev');
    e.preventDefault();
  }
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName !== 'CANVAS') {
    e.preventDefault();
    return false;
  }
});

// Keyboard shortcuts
codeEditor.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    executeCode();
  }
});

// Auto-execute on load
setTimeout(executeCode, 100);