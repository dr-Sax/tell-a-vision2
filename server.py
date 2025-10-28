#!/usr/bin/env python3
from flask import Flask, request, jsonify
from flask_cors import CORS
import yt_dlp
import sys

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/get-video-url', methods=['POST'])
def get_video_url():
    youtube_url = request.get_json()['url']
    
    ydl_opts = {
        'format': 'best[ext=mp4]/best',
        'quiet': True
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        
        # Find progressive MP4 format
        video_url = None
        for fmt in info['formats']:
            if (fmt.get('ext') == 'mp4' and 
                fmt.get('vcodec') != 'none' and 
                fmt.get('acodec') != 'none'):
                video_url = fmt['url']
                break
        
        return jsonify({
            'url': video_url,
            'title': info.get('title')
        })

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    app.run(host='127.0.0.1', port=port, debug=False)