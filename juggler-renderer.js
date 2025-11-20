// WebGL Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('webgl-container').appendChild(renderer.domElement);

// CSS3D Scene
const cssScene = new THREE.Scene();
const cssRenderer = new THREE.CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('css3d-container').appendChild(cssRenderer.domElement);

// Camera feed dimensions from OpenCV (matches server.py: cv2.resize(frame, (640, 480)))
const CAMERA_WIDTH = 640;
const CAMERA_HEIGHT = 480;
const CAMERA_ASPECT = CAMERA_WIDTH / CAMERA_HEIGHT; // 1.333...

// Calculate plane dimensions to match camera aspect ratio
// We'll use a reference width and calculate height from aspect ratio
const PLANE_WIDTH = 16;
const PLANE_HEIGHT = PLANE_WIDTH / CAMERA_ASPECT; // 12

// Camera feed texture
const img = document.createElement('img');
img.src = 'http://127.0.0.1:5000/video_feed';
const texture = new THREE.Texture(img);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
img.onload = () => texture.needsUpdate = true;

// Background plane with correct aspect ratio matching camera feed
const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT),
  new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.5 })
);
plane.position.z = 0;
scene.add(plane);

// Video elements for both hands
let rightVideoElement = null;
let rightCssObject = null;
let leftVideoElement = null;
let leftCssObject = null;

// Hand tracking
let rightHandDetected = false;
let rightHandPosition = { x: 0, y: 0, z: 0 };
let leftHandDetected = false;
let leftHandPosition = { x: 0, y: 0, z: 0 };

// Coordinate mapping function: MediaPipe normalized (0-1) -> Three.js world space
function mapCameraToWorld(normalizedX, normalizedY) {
  // MediaPipe coordinates: (0,0) is top-left, (1,1) is bottom-right
  // Three.js coordinates: (0,0) is center, with x+ right, y+ up
  
  // Map x: 0->1 becomes -PLANE_WIDTH/2 -> +PLANE_WIDTH/2
  const worldX = (normalizedX - 0.5) * PLANE_WIDTH;
  
  // Map y: 0->1 becomes +PLANE_HEIGHT/2 -> -PLANE_HEIGHT/2 (flip vertical)
  const worldY = -(normalizedY - 0.5) * PLANE_HEIGHT;
  
  return { x: worldX, y: worldY };
}

// Hand tracking SSE
const handTrackingSource = new EventSource('http://127.0.0.1:5000/hand_tracking');
handTrackingSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Right hand
  rightHandDetected = data.right_hand_detected;
  if (rightHandDetected) {
    const handPos = data.right_hand_position;
    const worldPos = mapCameraToWorld(handPos.x, handPos.y);
    rightHandPosition = {
      x: worldPos.x,
      y: worldPos.y,
      z: 0.1
    };
  }
  
  // Left hand
  leftHandDetected = data.left_hand_detected;
  if (leftHandDetected) {
    const handPos = data.left_hand_position;
    const worldPos = mapCameraToWorld(handPos.x, handPos.y);
    leftHandPosition = {
      x: worldPos.x,
      y: worldPos.y,
      z: 0.1
    };
  }
  
  updateVideoPositions();
};

function updateVideoPositions() {
  // Update right hand video
  if (rightCssObject) {
    // Always keep video visible once it's been created
    rightCssObject.visible = true;
    
    // Only update position when hand is detected
    if (rightHandDetected) {
      rightCssObject.position.set(rightHandPosition.x, rightHandPosition.y, rightHandPosition.z);
    }
    // If hand is not detected, video stays at last known position
  }
  
  // Update left hand video
  if (leftCssObject) {
    // Always keep video visible once it's been created
    leftCssObject.visible = true;
    
    // Only update position when hand is detected
    if (leftHandDetected) {
      leftCssObject.position.set(leftHandPosition.x, leftHandPosition.y, leftHandPosition.z);
    }
    // If hand is not detected, video stays at last known position
  }
}

function displayRightHandVideo(videoUrl, startTime = 0, endTime = null) {
  if (rightCssObject) cssScene.remove(rightCssObject);
  
  rightVideoElement = document.createElement('video');
  rightVideoElement.className = 'video-element';
  rightVideoElement.src = videoUrl;
  rightVideoElement.controls = false;
  rightVideoElement.autoplay = true;
  rightVideoElement.loop = !endTime;
  rightVideoElement.muted = false;
  rightVideoElement.currentTime = startTime;
  
  if (endTime) {
    rightVideoElement.ontimeupdate = () => {
      if (rightVideoElement.currentTime >= endTime) {
        rightVideoElement.currentTime = startTime;
      }
    };
  }
  
  rightCssObject = new THREE.CSS3DObject(rightVideoElement);
  rightCssObject.scale.set(0.003, 0.003, 0.003);
  rightCssObject.position.set(0, 0, 0.1);
  rightCssObject.visible = true;
  cssScene.add(rightCssObject);
  
  updateVideoPositions();
}

function displayLeftHandVideo(videoUrl, startTime = 0, endTime = null) {
  if (leftCssObject) cssScene.remove(leftCssObject);
  
  leftVideoElement = document.createElement('video');
  leftVideoElement.className = 'video-element';
  leftVideoElement.src = videoUrl;
  leftVideoElement.controls = false;
  leftVideoElement.autoplay = true;
  leftVideoElement.loop = !endTime;
  leftVideoElement.muted = false;
  leftVideoElement.currentTime = startTime;
  
  if (endTime) {
    leftVideoElement.ontimeupdate = () => {
      if (leftVideoElement.currentTime >= endTime) {
        leftVideoElement.currentTime = startTime;
      }
    };
  }
  
  leftCssObject = new THREE.CSS3DObject(leftVideoElement);
  leftCssObject.scale.set(0.003, 0.003, 0.003);
  leftCssObject.position.set(0, 0, 0.1);
  leftCssObject.visible = true;
  cssScene.add(leftCssObject);
  
  updateVideoPositions();
}

function applyRightHandClipPath(clipPath) {
  if (rightVideoElement) {
    rightVideoElement.style.clipPath = clipPath;
    rightVideoElement.style.webkitClipPath = clipPath;
    if (rightCssObject) {
      rightCssObject.element.style.clipPath = clipPath;
      rightCssObject.element.style.webkitClipPath = clipPath;
    }
  }
}

function applyLeftHandClipPath(clipPath) {
  if (leftVideoElement) {
    leftVideoElement.style.clipPath = clipPath;
    leftVideoElement.style.webkitClipPath = clipPath;
    if (leftCssObject) {
      leftCssObject.element.style.clipPath = clipPath;
      leftCssObject.element.style.webkitClipPath = clipPath;
    }
  }
}

camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  texture.needsUpdate = true;
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'play-right-hand-video') {
    const { url, startTime, endTime } = event.data;
    displayRightHandVideo(url, startTime, endTime);
  }
  
  if (event.data && event.data.type === 'play-left-hand-video') {
    const { url, startTime, endTime } = event.data;
    displayLeftHandVideo(url, startTime, endTime);
  }
  
  if (event.data && event.data.type === 'apply-right-hand-clippath') {
    applyRightHandClipPath(event.data.clipPath);
  }
  
  if (event.data && event.data.type === 'apply-left-hand-clippath') {
    applyLeftHandClipPath(event.data.clipPath);
  }
  
  // Handle parameter updates from livecode window
  if (event.data && event.data.type === 'apply-parameters') {
    console.log('Juggler received apply-parameters:', event.data);
    const { hand, params } = event.data;
    const element = hand === 'right' ? rightVideoElement : leftVideoElement;
    const cssObject = hand === 'right' ? rightCssObject : leftCssObject;
    
    if (!element || !cssObject) {
      console.warn(`Cannot apply parameters: element=${!!element}, cssObject=${!!cssObject}`);
      return;
    }
    
    console.log(`Applying parameters to ${hand} hand:`, params);
    
    // Apply CSS filters
    const filters = [
      `hue-rotate(${params.hue}deg)`,
      `saturate(${params.saturation}%)`,
      `brightness(${params.brightness}%)`,
      `contrast(${params.contrast}%)`,
      `blur(${params.blur}px)`,
      `grayscale(${params.grayscale}%)`,
      `sepia(${params.sepia}%)`
    ];
    element.style.filter = filters.join(' ');
    console.log(`Applied filters: ${element.style.filter}`);
    
    // Apply volume and playback rate
    if (element.tagName === 'VIDEO') {
      element.volume = params.volume / 100;
      element.playbackRate = params.speed;
      console.log(`Applied volume: ${element.volume}, playbackRate: ${element.playbackRate}`);
    }
    
    // Apply opacity
    element.style.opacity = params.opacity;
    
    // Apply scale
    const baseScale = 0.003;
    cssObject.scale.set(
      baseScale * params.scale,
      baseScale * params.scale,
      baseScale * params.scale
    );
    console.log(`Applied opacity: ${element.style.opacity}, scale: ${params.scale}`);
  }
});