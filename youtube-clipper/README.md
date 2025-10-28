# YouTube Clipper Chrome Extension

A simple Chrome extension to set start/end points on YouTube videos, loop sections, and export video data as JSON for use with yt-dlp.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `youtube-clipper` folder
5. The extension is now installed!

## How It Works

**Important**: This extension does NOT have a popup when you click the icon. Instead, it automatically adds a control panel directly on YouTube video pages.

1. Go to any YouTube video (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`)
2. Wait a moment for the page to fully load
3. You should see a **red-bordered control panel** appear in the top-right corner of the page
4. The panel will show:
   - Set Start button
   - Set End button  
   - Loop toggle
   - Copy JSON button
   - Current start/end times

## Usage

1. Play the YouTube video to your desired start point
2. Click **Set Start** 
3. Continue playing to your desired end point
4. Click **Set End**
5. (Optional) Click **Loop On** to continuously loop the selected section
6. Click **Copy JSON** to copy the video data to your clipboard

## Troubleshooting

**Control panel doesn't appear:**
1. Make sure you're on a YouTube video page (URL should be `youtube.com/watch?v=...`)
2. Refresh the page
3. Open Chrome DevTools (F12) and check the Console tab for "YouTube Clipper" messages
4. Make sure the extension is enabled in `chrome://extensions/`
5. Try reloading the extension (click the refresh icon on the extension card)

**Still not working:**
1. Remove the extension
2. Re-download the files
3. Follow installation steps again

## JSON Output Format

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "start_time": 60,
  "end_time": 120
}
```

## Using with yt-dlp

```python
import yt_dlp
import json

# Paste your copied JSON
data = {
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "start_time": 60,
  "end_time": 120
}

ydl_opts = {
    'download_ranges': yt_dlp.utils.download_range_func(None, [(data['start_time'], data['end_time'])]),
    'force_keyframes_at_cuts': True,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([data['url']])
```

## Features

- Automatically appears on YouTube video pages (no popup needed)
- Set start and end points by clicking buttons at the current video time
- Loop the selected section automatically
- Copy video data as JSON with one click
- Simple, clean interface
- Works on all YouTube videos
- Persists across video navigation

## Notes

- Times are in seconds
- The extension persists across video navigation on YouTube
- If no end time is set, it defaults to the video duration
- The extension icon in the toolbar is just for identification - the actual controls appear on the YouTube page
