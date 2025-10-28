const urlInput = document.getElementById('youtubeUrl');
const playBtn = document.getElementById('playBtn');
const statusDiv = document.getElementById('status');
const videoPlayer = document.getElementById('videoPlayer');

async function playVideo() {
  const youtubeUrl = urlInput.value.trim();
  
  statusDiv.textContent = 'Loading...';
  statusDiv.className = 'loading';
  
  const result = await window.electronAPI.getVideoUrl(youtubeUrl);
  
  videoPlayer.src = result.url;
  videoPlayer.classList.add('visible');
  videoPlayer.play();
  
  statusDiv.style.display = 'none';
}

playBtn.addEventListener('click', playVideo);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') playVideo();
});