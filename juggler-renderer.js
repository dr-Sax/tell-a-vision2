// WebGL Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('webgl-container').appendChild(renderer.domElement);

// CSS3D Scene Setup for video
const cssScene = new THREE.Scene();
const cssRenderer = new THREE.CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('css3d-container').appendChild(cssRenderer.domElement);

// Create img element for MJPEG camera feed
const img = document.createElement('img');
img.src = 'http://127.0.0.1:5000/video_feed';

// Create texture from image
const texture = new THREE.Texture(img);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;

// Update texture on each frame
img.onload = function() {
  texture.needsUpdate = true;
};

// Create background plane with camera feed (far back)
const planeGeometry = new THREE.PlaneGeometry(16, 9);
const planeMaterial = new THREE.MeshBasicMaterial({ 
  map: texture,
  transparent: true,
  opacity: 0.5
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.z = -10;
scene.add(plane);

// Add a simple cube in the foreground for demonstration
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
cube.position.z = 2;
scene.add(cube);

// Video element for CSS3D
let videoElement = null;
let cssObject = null;

// Hand tracking state
let rightHandDetected = false;
let rightHandPosition = { x: 0, y: 0, z: 0 };

// Connect to hand tracking SSE stream
const handTrackingSource = new EventSource('http://127.0.0.1:5000/hand_tracking');

handTrackingSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  rightHandDetected = data.right_hand_detected;
  
  if (rightHandDetected) {
    // Convert normalized coordinates from MediaPipe to Three.js space
    // MediaPipe gives x (0=left, 1=right), y (0=top, 1=bottom), z (depth)
    const handPos = data.right_hand_position;
    
    // Map from normalized [0,1] to centered Three.js space
    const x = (handPos.x - 0.5) * 10; // Map to -5 to 5 range
    const y = -(handPos.y - 0.5) * 10; // Invert Y and map to -5 to 5 range
    const z = -handPos.z * 5 + 2; // Use depth for z positioning
    
    rightHandPosition = { x, y, z };
    
    console.log('Hand detected at:', rightHandPosition);
  }
  
  // Update video visibility and position
  updateVideoPosition();
};

handTrackingSource.onerror = function(error) {
  console.error('Hand tracking SSE error:', error);
  // Try to reconnect after a delay
  setTimeout(() => {
    console.log('Attempting to reconnect to hand tracking...');
  }, 3000);
};

// Function to update video position based on hand tracking
function updateVideoPosition() {
  if (cssObject) {
    if (rightHandDetected) {
      // Show video and position it at the hand
      cssObject.visible = true;
      cssObject.position.set(
        rightHandPosition.x,
        rightHandPosition.y,
        rightHandPosition.z
      );
      console.log('Video positioned at:', cssObject.position);
    } else {
      // Hide video when hand is not detected
      cssObject.visible = false;
      console.log('Hand not detected, hiding video');
    }
  }
}

// Function to create and display video
function displayVideo(videoUrl, startTime = 0, endTime = null) {
  console.log('displayVideo called with:', { videoUrl, startTime, endTime });
  
  // Remove existing video if present
  if (cssObject) {
    console.log('Removing existing video');
    cssScene.remove(cssObject);
  }
  
  // Create video element
  videoElement = document.createElement('video');
  videoElement.className = 'video-element';
  videoElement.src = videoUrl;
  videoElement.controls = false; // Disable controls to avoid clicking issues
  videoElement.autoplay = true;
  videoElement.loop = endTime ? false : true;
  videoElement.muted = false; // Make sure audio plays
  
  console.log('Video element created:', videoElement);
  
  // Set start time
  videoElement.currentTime = startTime;
  
  // Handle looping between start and end times
  if (endTime) {
    videoElement.ontimeupdate = () => {
      if (videoElement.currentTime >= endTime) {
        videoElement.currentTime = startTime;
      }
    };
  }
  
  // Create CSS3D object
  cssObject = new THREE.CSS3DObject(videoElement);
  
  // IMPORTANT: Much larger scale so video is actually visible
  // CSS3D units are in pixels, so we need a scale that makes sense
  cssObject.scale.set(0.003, 0.003, 0.003); // Increased from 0.001
  
  // Initial position at center, will be updated by hand tracking
  cssObject.position.set(0, 0, 3); // Start in front of camera
  
  // Start visible for testing, will be controlled by hand tracking
  cssObject.visible = true;
  
  console.log('CSS3D object created and added to scene');
  console.log('Position:', cssObject.position);
  console.log('Scale:', cssObject.scale);
  console.log('Visible:', cssObject.visible);
  
  cssScene.add(cssObject);
  
  // Force immediate update
  updateVideoPosition();
}

camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  texture.needsUpdate = true;
  
  // CRITICAL: Render CSS3D AFTER WebGL so it appears on top
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Listen for video data from main process
window.addEventListener('message', (event) => {
  console.log('Message received:', event.data);
  if (event.data && event.data.type === 'play-video') {
    const { url, startTime, endTime } = event.data;
    console.log('Playing video with:', { url, startTime, endTime });
    displayVideo(url, startTime, endTime);
  }
});

// Debug: Log when video element plays
window.addEventListener('load', () => {
  console.log('Page loaded, waiting for video...');
});