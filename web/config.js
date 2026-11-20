// This file is overwritten by deploy.sh with your real AWS WebSocket URL.
window.WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
