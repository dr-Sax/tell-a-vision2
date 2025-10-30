const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container').appendChild(renderer.domElement);

// Create img element for MJPEG camera feed
const img = document.createElement('img');
img.src = 'http://127.0.0.1:5000/video_feed';


// Create texture from image
const texture = new THREE.Texture(img);
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.rotation = Math.PI / 2; // Rotate by 90 degrees (π/2 radians)
texture.center.set(0.5, 0.5);

// Update texture on each frame
img.onload = function() {
  texture.needsUpdate = true;
};

// Create background plane with camera feed
const planeGeometry = new THREE.PlaneGeometry(9, 16);
const planeMaterial = new THREE.MeshBasicMaterial({ map: texture });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.z = -5;
scene.add(plane);

// Add a simple cube in the foreground for demonstration
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  texture.needsUpdate = true; // Update texture every frame
  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});