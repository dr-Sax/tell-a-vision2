#!/usr/bin/env python3
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp
import sys
import cv2

app = Flask(__name__)
CORS(app)

camera = cv2.VideoCapture(1)

def generate_frames():
    while True:
        success, frame = camera.read()
        if not success:
            break
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/get-video-url', methods=['POST'])
def get_video_url():
    youtube_url = request.get_json()['url']
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            # Try to find a progressive MP4 format (has both video and audio)
            video_url = None
            formats = info.get('formats', [])
            
            # First, try to find a format that has both video and audio
            for fmt in formats:
                if (fmt.get('ext') == 'mp4' and 
                    fmt.get('vcodec') != 'none' and 
                    fmt.get('acodec') != 'none' and
                    fmt.get('protocol') in ['https', 'http']):
                    video_url = fmt['url']
                    print(f"Found progressive format: {fmt.get('format_id')} - {fmt.get('format_note')}")
                    break
            
            # If no progressive format, try to get the best video-only format
            if not video_url:
                for fmt in formats:
                    if (fmt.get('ext') == 'mp4' and 
                        fmt.get('vcodec') != 'none' and
                        fmt.get('protocol') in ['https', 'http']):
                        video_url = fmt['url']
                        print(f"Found video-only format: {fmt.get('format_id')} - {fmt.get('format_note')}")
                        break
            
            # Last resort - use the requested format
            if not video_url:
                video_url = info.get('url')
            
            if video_url:
                return jsonify({
                    'url': video_url,
                    'title': info.get('title'),
                    'success': True
                })
            else:
                return jsonify({
                    'error': 'Could not find a streamable video format',
                    'success': False
                }), 500
                
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    app.run(host='127.0.0.1', port=port, debug=False)