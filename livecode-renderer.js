const urlInput = document.getElementById('youtubeUrl');
const playBtn = document.getElementById('playBtn');
const statusDiv = document.getElementById('status');
const videoPlayer = document.getElementById('videoPlayer');

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