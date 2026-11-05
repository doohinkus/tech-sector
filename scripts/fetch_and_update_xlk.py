#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    print("yfinance not installed. Install with: pip install yfinance", file=sys.stderr)
    sys.exit(1)

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets')
SCRIPTS_DIR = os.path.dirname(__file__)
STATE_FILE = os.path.join(ASSETS_DIR, 'xlk-state.json')

def fetch_xlk_status():
    try:
        ticker = yf.Ticker('XLK')
        hist = ticker.history(period='2d')
        if len(hist) < 2:
            # Fallback to info
            info = ticker.info
            change_pct = info.get('regularMarketChangePercent', 0)
        else:
            prev_close = hist['Close'].iloc[-2]
            curr_close = hist['Close'].iloc[-1]
            change_pct = ((curr_close - prev_close) / prev_close) * 100
        
        # Determine state
        if change_pct >= 0.5:
            state = 'good'
        elif change_pct <= -0.5:
            state = 'bad'
        else:
            state = 'neutral'
        
        result = {
            'state': state,
            'change_pct': round(float(change_pct), 3),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'symbol': 'XLK'
        }
        return result
    except Exception as e:
        print(f"Error fetching XLK status: {e}", file=sys.stderr)
        # Return last known state or neutral as fallback
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE) as f:
                return json.load(f)
        return {'state': 'neutral', 'change_pct': 0, 'timestamp': datetime.utcnow().isoformat() + 'Z', 'symbol': 'XLK', 'error': str(e)}

def update_status():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    status = fetch_xlk_status()
    
    # Save state
    with open(STATE_FILE, 'w') as f:
        json.dump(status, f, indent=2)
    
    state = status['state']
    source_gif = os.path.join(ASSETS_DIR, f'xlk-{state}.gif')
    target_gif = os.path.join(ASSETS_DIR, 'xlk-status.gif')
    
    # Render the current state GIF with the live percentage text
    percent_text = state.upper()
    print(f"Generating GIF for {state} ({percent_text})...")
    try:
        subprocess.run(['node', os.path.join(SCRIPTS_DIR, 'capture_xlk_gifs.js'), state, percent_text], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to generate GIF: {e}", file=sys.stderr)
    
    # Copy/swap to current status
    if os.path.exists(source_gif):
        import shutil
        shutil.copy2(source_gif, target_gif)
        print(f"Updated xlk-status.gif to {state} ({status['change_pct']:+.3f}%)")
    else:
        print(f"Warning: No GIF available for {state}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    update_status()
