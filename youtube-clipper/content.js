let startTime = 0;
let endTime = 0;
let videoElement = null;
let controlPanel = null;
let loopEnabled = false;

function init() {
  const checkVideoInterval = setInterval(() => {
    videoElement = document.querySelector('video');
    if (videoElement) {
      clearInterval(checkVideoInterval);
      createControlPanel();
      setupVideoListeners();
    }
  }, 500);
}

function createControlPanel() {
  controlPanel = document.createElement('div');
  controlPanel.id = 'yt-clipper-panel';
  controlPanel.innerHTML = `
    <div class="clipper-header">YouTube Clipper</div>
    <div class="clipper-timeline-container">
      <div class="clipper-timeline-track">
        <div id="clipper-selected-range" class="clipper-selected-range"></div>
        <div id="clipper-start-handle" class="clipper-handle clipper-start-handle">
          <div class="clipper-handle-label">Start</div>
        </div>
        <div id="clipper-end-handle" class="clipper-handle clipper-end-handle">
          <div class="clipper-handle-label">End</div>
        </div>
      </div>
    </div>
    <div class="clipper-info">
      <div>Start: <span id="start-time-display">0:00</span></div>
      <div>End: <span id="end-time-display">0:00</span></div>
      <div>Duration: <span id="duration-display">0:00</span></div>
    </div>
    <div class="clipper-controls">
      <button id="loop-btn" class="clipper-btn">Loop Off</button>
      <button id="copy-json-btn" class="clipper-btn clipper-btn-primary">Copy JSON</button>
    </div>
  `;
  
  document.body.appendChild(controlPanel);
  
  document.getElementById('loop-btn').addEventListener('click', toggleLoop);
  document.getElementById('copy-json-btn').addEventListener('click', copyJSON);
  
  setupDraggableHandles();
  videoElement.addEventListener('loadedmetadata', updateTimeline);
  if (videoElement.duration) updateTimeline();
}

function setupDraggableHandles() {
  const startHandle = document.getElementById('clipper-start-handle');
  const endHandle = document.getElementById('clipper-end-handle');
  const track = document.querySelector('.clipper-timeline-track');
  let isDragging = false;
  let currentHandle = null;
  
  function startDrag(e, handle) {
    isDragging = true;
    currentHandle = handle;
    e.preventDefault();
  }
  
  function drag(e) {
    if (!isDragging || !videoElement.duration) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * videoElement.duration;
    
    if (currentHandle === startHandle) {
      startTime = Math.floor(time);
      if (startTime > endTime) endTime = startTime;
    } else if (currentHandle === endHandle) {
      endTime = Math.floor(time);
      if (endTime < startTime) startTime = endTime;
    }
    
    updateTimeline();
    videoElement.currentTime = time;
  }
  
  function stopDrag() {
    isDragging = false;
    currentHandle = null;
  }
  
  startHandle.addEventListener('mousedown', (e) => startDrag(e, startHandle));
  endHandle.addEventListener('mousedown', (e) => startDrag(e, endHandle));
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
}

function updateTimeline() {
  if (!videoElement.duration) return;
  const duration = videoElement.duration;
  endTime = Math.min(endTime || duration, duration);
  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  
  document.getElementById('clipper-start-handle').style.left = startPercent + '%';
  document.getElementById('clipper-end-handle').style.left = endPercent + '%';
  document.getElementById('clipper-selected-range').style.left = startPercent + '%';
  document.getElementById('clipper-selected-range').style.width = (endPercent - startPercent) + '%';
  document.getElementById('start-time-display').textContent = formatTime(startTime);
  document.getElementById('end-time-display').textContent = formatTime(endTime);
  document.getElementById('duration-display').textContent = formatTime(Math.floor(duration));
}

function toggleLoop() {
  loopEnabled = !loopEnabled;
  const loopBtn = document.getElementById('loop-btn');
  loopBtn.textContent = loopEnabled ? 'Loop On' : 'Loop Off';
  loopBtn.classList.toggle('active', loopEnabled);
}

function setupVideoListeners() {
  videoElement.addEventListener('timeupdate', () => {
    if (loopEnabled && endTime > 0) {
      if (videoElement.currentTime >= endTime) videoElement.currentTime = startTime;
      if (videoElement.currentTime < startTime) videoElement.currentTime = startTime;
    }
  });
}

function copyJSON() {
  const videoId = new URLSearchParams(window.location.search).get('v');
  const data = {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    start_time: startTime,
    end_time: endTime > 0 ? endTime : Math.floor(videoElement.duration)
  };
  
  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
    const btn = document.getElementById('copy-json-btn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
  });
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (controlPanel) controlPanel.remove();
    startTime = 0;
    endTime = 0;
    loopEnabled = false;
    init();
  }
}).observe(document, { subtree: true, childList: true });
