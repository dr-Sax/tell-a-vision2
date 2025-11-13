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
  opacity: 0.5 // Make it semi-transparent so we can see through it
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.z = -10; // Moved further back
scene.add(plane);

// Add a simple cube in the foreground for demonstration
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
cube.position.z = 2; // Moved forward
scene.add(cube);

// Video element for CSS3D
let videoElement = null;
let cssObject = null;

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
  videoElement.controls = true;
  videoElement.autoplay = true;
  videoElement.loop = endTime ? false : true;
  
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
  
  // Position the video in 3D space (closer to camera, in front of webcam)
  cssObject.position.set(0, 0, 1); // Slightly in front of camera
  cssObject.scale.set(0.001, 0.001, 0.001); // Increased scale from 0.005
  
  console.log('CSS3D object created and added to scene');
  console.log('Position:', cssObject.position);
  console.log('Scale:', cssObject.scale);
  
  cssScene.add(cssObject);
}

camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  texture.needsUpdate = true; // Update texture every frame
  
  // Render both scenes
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