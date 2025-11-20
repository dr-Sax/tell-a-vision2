#!/usr/bin/env python3
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import yt_dlp
import sys
import cv2
import mediapipe as mp
import json

app = Flask(__name__)
CORS(app)

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

camera = cv2.VideoCapture(0)

# Global variable to store latest hand tracking data
latest_hand_data = {
    'right_hand_detected': False,
    'right_hand_position': {'x': 0, 'y': 0, 'z': 0},
    'left_hand_detected': False,
    'left_hand_position': {'x': 0, 'y': 0, 'z': 0}
}


def generate_frames():
    """Generate video frames with hand tracking"""
    global latest_hand_data
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Resize and flip frame
        frame = cv2.resize(frame, (640, 480))
        frame = cv2.flip(frame, 1)
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame with MediaPipe
        results = hands.process(rgb_frame)
        
        # Update hand tracking data - reset both hands
        latest_hand_data['right_hand_detected'] = False
        latest_hand_data['left_hand_detected'] = False
        
        if results.multi_hand_landmarks and results.multi_handedness:
            for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # Get hand label (Left or Right)
                handedness = results.multi_handedness[idx].classification[0].label
                
                # Get wrist position (landmark 0)
                wrist = hand_landmarks.landmark[0]
                
                if handedness == 'Right':
                    latest_hand_data['right_hand_detected'] = True
                    latest_hand_data['right_hand_position'] = {
                        'x': wrist.x,
                        'y': wrist.y,
                        'z': wrist.z
                    }
                elif handedness == 'Left':
                    latest_hand_data['left_hand_detected'] = True
                    latest_hand_data['left_hand_position'] = {
                        'x': wrist.x,
                        'y': wrist.y,
                        'z': wrist.z
                    }
                
                # Optional: Draw hand landmarks on frame for debugging
                mp_drawing = mp.solutions.drawing_utils
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS
                )
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


def generate_hand_data():
    """Generate SSE stream of hand tracking data"""
    global latest_hand_data
    
    while True:
        # Send hand tracking data as Server-Sent Events
        data = json.dumps(latest_hand_data)
        yield f"data: {data}\n\n"
        
        # Small delay to avoid overwhelming the client
        import time
        time.sleep(0.033)  # ~30 FPS


@app.route('/video_feed')
def video_feed():
    """Stream video feed with hand tracking visualization"""
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/hand_tracking')
def hand_tracking():
    """Stream hand tracking data via Server-Sent Events"""
    return Response(generate_hand_data(),
                    mimetype='text/event-stream',
                    headers={
                        'Cache-Control': 'no-cache',
                        'X-Accel-Buffering': 'no'
                    })


@app.route('/hand_data')
def hand_data():
    """Get current hand tracking data as JSON (polling endpoint)"""
    global latest_hand_data
    return jsonify(latest_hand_data)


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