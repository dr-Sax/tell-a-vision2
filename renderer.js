const urlInput = document.getElementById('youtubeUrl');
const playBtn = document.getElementById('playBtn');
const statusDiv = document.getElementById('status');
const videoPlayer = document.getElementById('videoPlayer');

async function playVideo() {
  const input = urlInput.value.trim();
  const json = JSON.parse(input);
  youtubeUrl = json.url;
  startTime = json.start_time;
  endTime = json.end_time;
  
  statusDiv.textContent = 'Loading...';
  statusDiv.className = 'loading';
  
  const result = await window.electronAPI.getVideoUrl(youtubeUrl);
  
  videoPlayer.src = result.url;
  videoPlayer.classList.add('visible');
  videoPlayer.currentTime = startTime;
  videoPlayer.play();
  
  statusDiv.style.display = 'none';

  // function to allow looping
  videoPlayer.ontimeupdate = () => {
    if (videoPlayer.currentTime >= endTime){
      videoPlayer.currentTime = startTime;
    }
  }

}

playBtn.addEventListener('click', playVideo);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') playVideo();
});