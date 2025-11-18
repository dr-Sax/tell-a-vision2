const urlInput = document.getElementById('youtubeUrl');
const playBtn = document.getElementById('playBtn');
const statusDiv = document.getElementById('status');
const clipPathDisplay = document.getElementById('clipPathDisplay');
const vertexList = document.getElementById('vertexList');
const resetBtn = document.getElementById('resetBtn');
const applyBtn = document.getElementById('applyBtn');

// Canvas dimensions (matching video size)
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

// Polygon vertices
let vertices = [];
let draggingVertex = null;
let hoveredVertex = null;

// p5.js sketch
const sketch = (p) => {
  p.setup = () => {
    const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('polygonCanvas');
    
    // Initialize with a default diamond shape
    resetToDefault();
  };

  p.draw = () => {
    p.background(0);
    
    // Draw grid for reference
    p.stroke(40);
    p.strokeWeight(1);
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      p.line(x, 0, x, CANVAS_HEIGHT);
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      p.line(0, y, CANVAS_WIDTH, y);
    }
    
    // Draw polygon if we have vertices
    if (vertices.length > 0) {
      // Draw filled polygon
      p.fill(0, 255, 0, 50);
      p.stroke(0, 255, 0);
      p.strokeWeight(2);
      p.beginShape();
      for (let v of vertices) {
        p.vertex(v.x, v.y);
      }
      p.endShape(p.CLOSE);
      
      // Draw lines connecting vertices
      p.stroke(0, 255, 0);
      p.strokeWeight(2);
      for (let i = 0; i < vertices.length; i++) {
        let v1 = vertices[i];
        let v2 = vertices[(i + 1) % vertices.length];
        p.line(v1.x, v1.y, v2.x, v2.y);
      }
    }
    
    // Check for hovered vertex
    hoveredVertex = null;
    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];
      let d = p.dist(p.mouseX, p.mouseY, v.x, v.y);
      if (d < 10) {
        hoveredVertex = i;
        break;
      }
    }
    
    // Draw vertices
    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];
      
      // Highlight hovered or dragged vertex
      if (i === hoveredVertex || i === draggingVertex) {
        p.fill(255, 255, 0);
        p.stroke(255, 255, 0);
        p.strokeWeight(3);
        p.circle(v.x, v.y, 16);
      } else {
        p.fill(0, 255, 0);
        p.stroke(255);
        p.strokeWeight(2);
        p.circle(v.x, v.y, 12);
      }
      
      // Draw vertex number
      p.fill(0);
      p.noStroke();
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(10);
      p.text(i, v.x, v.y);
    }
    
    // Update UI
    updateClipPath();
    updateVertexList();
  };

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseX > CANVAS_WIDTH || p.mouseY < 0 || p.mouseY > CANVAS_HEIGHT) {
      return;
    }

    // Check if clicking on existing vertex to drag
    for (let i = 0; i < vertices.length; i++) {
      let v = vertices[i];
      let d = p.dist(p.mouseX, p.mouseY, v.x, v.y);
      if (d < 10) {
        if (p.mouseButton === p.RIGHT) {
          // Right-click to delete vertex
          vertices.splice(i, 1);
          return false; // Prevent context menu
        } else {
          // Left-click to drag
          draggingVertex = i;
          return;
        }
      }
    }
    
    // If not clicking on vertex, add new vertex
    if (p.mouseButton === p.LEFT) {
      vertices.push({ x: p.mouseX, y: p.mouseY });
    }
  };

  p.mouseDragged = () => {
    if (draggingVertex !== null) {
      vertices[draggingVertex].x = p.constrain(p.mouseX, 0, CANVAS_WIDTH);
      vertices[draggingVertex].y = p.constrain(p.mouseY, 0, CANVAS_HEIGHT);
    }
  };

  p.mouseReleased = () => {
    draggingVertex = null;
  };

  p.doubleClicked = () => {
    // Double-click closes the polygon (or could add other functionality)
    console.log('Polygon closed with', vertices.length, 'vertices');
    return false;
  };
};

// Initialize p5
new p5(sketch);

// Update clip-path CSS display
function updateClipPath() {
  if (vertices.length < 3) {
    clipPathDisplay.textContent = 'Need at least 3 vertices';
    return;
  }
  
  // Convert vertices to percentages
  const points = vertices.map(v => {
    const xPercent = ((v.x / CANVAS_WIDTH) * 100).toFixed(1);
    const yPercent = ((v.y / CANVAS_HEIGHT) * 100).toFixed(1);
    return `${xPercent}% ${yPercent}%`;
  }).join(', ');
  
  const clipPath = `polygon(${points})`;
  clipPathDisplay.textContent = clipPath;
  
  return clipPath;
}

// Update vertex list display
function updateVertexList() {
  if (vertices.length === 0) {
    vertexList.textContent = 'No vertices yet';
    return;
  }
  
  const listHTML = vertices.map((v, i) => {
    return `Vertex ${i}: (${v.x.toFixed(0)}, ${v.y.toFixed(0)})`;
  }).join('<br>');
  
  vertexList.innerHTML = listHTML;
}

// Reset to default diamond shape
function resetToDefault() {
  vertices = [
    { x: CANVAS_WIDTH * 0.5, y: CANVAS_HEIGHT * 0.1 },  // Top
    { x: CANVAS_WIDTH * 0.9, y: CANVAS_HEIGHT * 0.5 },  // Right
    { x: CANVAS_WIDTH * 0.5, y: CANVAS_HEIGHT * 0.9 },  // Bottom
    { x: CANVAS_WIDTH * 0.1, y: CANVAS_HEIGHT * 0.5 }   // Left
  ];
  updateClipPath();
  updateVertexList();
}

// Event listeners
resetBtn.addEventListener('click', resetToDefault);

applyBtn.addEventListener('click', async () => {
  const clipPath = updateClipPath();
  if (clipPath && clipPath !== 'Need at least 3 vertices') {
    // Send clip-path to Three.js window
    await window.electronAPI.sendClipPathToThreejs(clipPath);
    
    statusDiv.textContent = 'Clip-path applied to video!';
    statusDiv.className = '';
    statusDiv.style.background = '#2a6a4a';
    statusDiv.style.color = '#6df2a0';
  } else {
    statusDiv.textContent = 'Need at least 3 vertices to create a clip-path';
    statusDiv.className = '';
    statusDiv.style.background = '#6a2a2a';
    statusDiv.style.color = '#f26d6d';
  }
});

// Original YouTube video player functionality
async function playVideo() {
  const input = urlInput.value.trim();
  const json = JSON.parse(input);
  console.log(json);
  const youtubeUrl = json.url;
  const startTime = json.start_time;
  const endTime = json.end_time;
  
  statusDiv.textContent = 'Loading...';
  statusDiv.className = 'loading';
  
  console.log('electronAPI available?', window.electronAPI);
  const result = await window.electronAPI.getVideoUrl(youtubeUrl);
  
  if (result.success) {
    // Send video data to Three.js window
    await window.electronAPI.sendVideoToThreejs({
      url: result.url,
      startTime: startTime,
      endTime: endTime
    });
    
    statusDiv.textContent = 'Video sent to Three.js window!';
    statusDiv.className = '';
    statusDiv.style.background = '#2a6a4a';
    statusDiv.style.color = '#6df2a0';
  } else {
    statusDiv.textContent = 'Error: ' + result.error;
    statusDiv.className = '';
    statusDiv.style.background = '#6a2a2a';
    statusDiv.style.color = '#f26d6d';
  }
}

playBtn.addEventListener('click', playVideo);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') playVideo();
});

// Prevent context menu on canvas
document.getElementById('polygonCanvas').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});