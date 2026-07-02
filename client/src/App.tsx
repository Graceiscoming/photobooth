import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// @ts-ignore
import gifshot from 'gifshot';
import { 
  Camera, 
  Wifi, 
  WifiOff, 
  Terminal, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Settings, 
  X,
  RefreshCw,
  Download,
  RotateCcw,
  Music,
  Sliders,
  Sparkles,
  Layers
} from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [groupName, setGroupName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<'4cut' | '2x2' | 'polaroid'>('4cut');
  
  // System diagnostic states
  const [backendStatus, setBackendStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [showSystemPanel, setShowSystemPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'System initialized in Minimal Warm mode.',
    'Docker connection ready.'
  ]);

  // Webcam & Shooting States
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isMirror, setIsMirror] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [zoom, setZoom] = useState<0.5 | 1 | 2>(1);
  const [countdownDelay, setCountdownDelay] = useState<3 | 5 | 10>(5); // default to 5 seconds
  const [gifDataUrl, setGifDataUrl] = useState<string>('');
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [momentGifUrl, setMomentGifUrl] = useState<string>('');
  const [isGeneratingMomentGif, setIsGeneratingMomentGif] = useState(false);

  // Refs for tracking values inside closures (prevents stale closure bug)
  const activeShotIndexRef = useRef(activeShotIndex);
  const zoomRef = useRef(zoom);
  const isMirrorRef = useRef(isMirror);

  useEffect(() => {
    activeShotIndexRef.current = activeShotIndex;
  }, [activeShotIndex]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    isMirrorRef.current = isMirror;
  }, [isMirror]);

  const shotFramesRef = useRef<string[][]>([[], [], [], []]);
  const recordingIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Customization Wizard States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedFilter, setSelectedFilter] = useState<'original' | 'ixy' | 'gold' | 'fuji' | 'instax' | 'trix'>('original');
  const [grainDensity, setGrainDensity] = useState(25);
  const [lightLeakActive, setLightLeakActive] = useState(false);
  const [frameColor, setFrameColor] = useState('#fefcf8'); // Cream
  const [signatureText, setSignatureText] = useState('');
  const [showSignature, setShowSignature] = useState(true);
  const [soundtrackUrl, setSoundtrackUrl] = useState('');
  const [finalPhotoDataUrl, setFinalPhotoDataUrl] = useState<string>('');
  
  // Printing & Developing States
  const [shakeProgress, setShakeProgress] = useState(0);
  const [isDeveloping, setIsDeveloping] = useState(true);
  const isDraggingRef = useRef(false);
  const lastDragPosRef = useRef({ x: 0, y: 0 });

  // Web Audio API Synthesizer
  const playBeep = (freq = 800, duration = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio synthesizer failed:', e);
    }
  };

  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = audioCtx.sampleRate * 0.2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise for shutter sound
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      noiseSource.start();
    } catch (e) {
      console.error('Shutter audio failed:', e);
    }
  };

  // DevTools & Right-click protection script
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        return;
      }
      if (isCmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Admin Token checking
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('adminToken', urlToken);
      setIsAdmin(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      addLog('Admin authorization token registered.');
    } else {
      const savedToken = localStorage.getItem('adminToken');
      if (savedToken) {
        setIsAdmin(true);
      }
    }
  }, []);

  const checkHealth = async () => {
    try {
      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch(`/api/health?token=${token}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBackendStatus('online');
        setSystemInfo(data);
      } else {
        throw new Error();
      }
    } catch {
      setBackendStatus('offline');
      setSystemInfo(null);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 9)]);
  };

  // Start Session (dynamic folder creation)
  const startSession = async () => {
    if (!groupName.trim()) {
      alert('กรุณากรอกชื่อกลุ่มหรือชื่องานเพื่อระบุการสร้างโฟลเดอร์ภาพถ่าย');
      return;
    }

    const cleanGroupName = groupName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    addLog(`Requesting server directory creation for "${cleanGroupName}"...`);

    try {
      const token = localStorage.getItem('adminToken') || '';
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groupName: cleanGroupName, layout: selectedLayout })
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`Session directory created: ${data.folderName}`);
        setStep(2);
      } else {
        throw new Error();
      }
    } catch (error: any) {
      addLog(`Fallback: Using Standalone mode. (Server Offline)`);
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    addLog(`Layout selected: ${selectedLayout}`);
    setStep(3);
  };

  // Access/stop camera feed
  const startCamera = async () => {
    if (streamRef.current) {
      stopCamera();
    }
    addLog('Requesting webcam access...');
    try {
      const constraints = {
        video: { 
          facingMode: facingMode, 
          width: { ideal: 3840 }, // Request maximum possible camera resolution (up to 4K)
          height: { ideal: 2160 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraPermission('granted');
      addLog('Webcam feed linked successfully.');
    } catch (err) {
      console.error(err);
      setCameraPermission('denied');
      addLog('Error: Webcam access denied.');
    }
  };

  const startMomentRecording = () => {
    if (!streamRef.current || !videoRef.current) return;
    shotFramesRef.current = [[], [], [], []];
    addLog('Live moment capture started.');

    const intervalTime = 250; // Capture 4 frames a second during posing
    const recordTimer = setInterval(() => {
      const videoEl = videoRef.current;
      if (!videoEl || videoEl.paused || videoEl.ended) return;

      const canvas = document.createElement('canvas');
      // Compact size for quick stop-motion GIF generation
      const targetW = 400;
      const targetH = 300;
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        if (isMirrorRef.current) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Draw with same digital zoom as preview
        const zScale = zoomRef.current === 0.5 ? 1.0 : zoomRef.current === 1 ? 1.5 : 2.5;
        if (zScale > 1.0) {
          const sW = videoEl.videoWidth / zScale;
          const sH = videoEl.videoHeight / zScale;
          const sX = (videoEl.videoWidth - sW) / 2;
          const sY = (videoEl.videoHeight - sH) / 2;
          ctx.drawImage(videoEl, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        }

        // Push frame to the current active shot index array
        const currentIdx = activeShotIndexRef.current;
        if (currentIdx >= 0 && currentIdx < 4) {
          shotFramesRef.current[currentIdx].push(canvas.toDataURL('image/jpeg', 0.6));
        }
      }
    }, intervalTime);

    recordingIntervalRef.current = recordTimer;
  };

  const stopMomentRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
      addLog('Moment recording completed. Queueing GIF compilation...');
      generateMomentGif();
    }
  };

  const generateMomentGif = async () => {
    setIsGeneratingMomentGif(true);
    addLog('Generating animated 4-cut Moment GIF...');

    const total = selectedLayout === 'polaroid' ? 1 : 4;
    const maxFrames = 10; // Number of loops in stop-motion animation

    // Normalize each shot's frame list to exactly maxFrames (10)
    const normalizedShots: string[][] = [];
    for (let s = 0; s < total; s++) {
      const frames = shotFramesRef.current[s] || [];
      if (frames.length === 0) {
        // Fallback if no frames were recorded
        const fallback = capturedPhotos[s] || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="%23444"/></svg>';
        normalizedShots.push(Array(maxFrames).fill(fallback));
      } else {
        const list: string[] = [];
        for (let f = 0; f < maxFrames; f++) {
          const rawIdx = Math.floor((f / maxFrames) * frames.length);
          list.push(frames[rawIdx]);
        }
        normalizedShots.push(list);
      }
    }

    // Canvas rendering configurations for the GIF compilation (2x scale is sharp and fast)
    const scale = 2; 
    let width = 0;
    let height = 0;
    let photoWidth = 0;
    let photoHeight = 0;
    const margin = 20 * scale;
    const spacing = 15 * scale;
    const bottomSpace = 80 * scale;

    if (selectedLayout === '4cut') {
      photoWidth = 360 * scale;
      photoHeight = 270 * scale;
      width = photoWidth + (margin * 2);
      height = (photoHeight * 4) + (spacing * 3) + margin + bottomSpace;
    } else if (selectedLayout === '2x2') {
      photoWidth = 300 * scale;
      photoHeight = 225 * scale;
      width = (photoWidth * 2) + (margin * 2) + spacing;
      height = (photoHeight * 2) + margin + spacing + bottomSpace;
    } else { // polaroid
      photoWidth = 360 * scale;
      photoHeight = 360 * scale;
      width = photoWidth + (margin * 2);
      height = photoHeight + margin + bottomSpace + (20 * scale);
    }

    // Apply color filters (enhanced for retro CCD & Film vibes)
    let filterString = 'none';
    if (selectedFilter === 'ixy') {
      filterString = 'contrast(1.15) brightness(1.08) saturate(1.22) sepia(0.08) hue-rotate(-6deg)';
    } else if (selectedFilter === 'gold') {
      filterString = 'contrast(0.98) brightness(1.04) saturate(1.38) sepia(0.3) hue-rotate(2deg)';
    } else if (selectedFilter === 'fuji') {
      filterString = 'contrast(1.02) brightness(1.02) saturate(0.95) sepia(0.08) hue-rotate(18deg)';
    } else if (selectedFilter === 'instax') {
      filterString = 'contrast(0.85) brightness(1.08) saturate(0.88) sepia(0.18)';
    } else if (selectedFilter === 'trix') {
      filterString = 'grayscale(1) contrast(1.4) brightness(0.92)';
    }

    // Generate Soundtrack QR Image once if needed
    let qrImg: HTMLImageElement | null = null;
    if (soundtrackUrl.trim()) {
      qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(soundtrackUrl)}`;
      await new Promise((resolve) => {
        if (qrImg) {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
        } else resolve(null);
      });
    }

    // Compile maxFrames (10) full strip images sequentially
    const compiledStrips: string[] = [];

    for (let f = 0; f < maxFrames; f++) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) continue;

      // Fill background frame color
      tempCtx.fillStyle = frameColor;
      tempCtx.fillRect(0, 0, width, height);

      // Draw signature text
      if (showSignature) {
        const displaySig = signatureText.trim();
        if (displaySig) {
          tempCtx.filter = 'none';
          tempCtx.fillStyle = selectedFrameIsDark() ? '#ffffff' : '#1c1917';
          tempCtx.font = `bold ${30 * scale}px 'Caveat', cursive`;
          tempCtx.textAlign = 'center';
          const sigY = height - (38 * scale);
          tempCtx.fillText(displaySig, width / 2, sigY);
        }
      }

      // Draw QR Code
      if (qrImg) {
        const qrSize = 55 * scale;
        const qrX = width - qrSize - (16 * scale);
        const qrY = height - qrSize - (16 * scale);
        tempCtx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }

      // Load frames of all shots for frame index 'f'
      const loadedImages: HTMLImageElement[] = [];
      for (let s = 0; s < total; s++) {
        const img = new Image();
        img.src = normalizedShots[s][f];
        loadedImages.push(img);
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }

      // Draw each photo frame onto the canvas
      loadedImages.forEach((img, idx) => {
        tempCtx.filter = filterString;
        
        let dx = 0, dy = 0;
        if (selectedLayout === '4cut') {
          dx = margin;
          dy = margin + (idx * (photoHeight + spacing));
        } else if (selectedLayout === '2x2') {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          dx = margin + (col * (photoWidth + spacing));
          dy = margin + (row * (photoHeight + spacing));
        } else { // polaroid
          dx = margin;
          dy = margin;
        }

        // Draw cropped stop-motion frame
        drawImageCover(tempCtx, img, dx, dy, photoWidth, photoHeight);

        // Apply dark vignette gradient over photo
        tempCtx.filter = 'none';
        tempCtx.globalCompositeOperation = 'multiply';
        tempCtx.globalAlpha = 0.45;
        const vignette = tempCtx.createRadialGradient(
          dx + (photoWidth / 2), dy + (photoHeight / 2), photoWidth * 0.4,
          dx + (photoWidth / 2), dy + (photoHeight / 2), photoWidth * 0.85
        );
        vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
        vignette.addColorStop(0.6, 'rgba(200, 200, 200, 0.8)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
        tempCtx.fillStyle = vignette;
        tempCtx.fillRect(dx, dy, photoWidth, photoHeight);
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.globalAlpha = 1.0;

        // Apply static noise grain overlay
        if (grainDensity > 0) {
          tempCtx.filter = 'none';
          tempCtx.globalCompositeOperation = 'overlay';
          tempCtx.globalAlpha = grainDensity / 150;
          
          const tileSize = 150;
          const noiseCanvas = document.createElement('canvas');
          noiseCanvas.width = tileSize;
          noiseCanvas.height = tileSize;
          const noiseCtx = noiseCanvas.getContext('2d');
          if (noiseCtx) {
            const noiseImg = noiseCtx.createImageData(tileSize, tileSize);
            for (let i = 0; i < noiseImg.data.length; i += 4) {
              const val = Math.floor(Math.random() * 255);
              noiseImg.data[i] = val;
              noiseImg.data[i+1] = val;
              noiseImg.data[i+2] = val;
              noiseImg.data[i+3] = 255;
            }
            noiseCtx.putImageData(noiseImg, 0, 0);
            tempCtx.fillStyle = tempCtx.createPattern(noiseCanvas, 'repeat') || '#fff';
            tempCtx.save();
            tempCtx.translate(dx, dy);
            tempCtx.fillRect(0, 0, photoWidth, photoHeight);
            tempCtx.restore();
          }
          tempCtx.globalCompositeOperation = 'source-over';
          tempCtx.globalAlpha = 1.0;
        }

        // Apply orange light leak
        if (lightLeakActive) {
          tempCtx.filter = 'none';
          tempCtx.globalCompositeOperation = 'screen';
          const grad = tempCtx.createRadialGradient(
            dx + (photoWidth * 0.15), dy + (photoHeight * 0.15), 5,
            dx + (photoWidth * 0.2), dy + (photoHeight * 0.2), photoWidth * 0.65
          );
          grad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
          grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.18)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          tempCtx.fillStyle = grad;
          tempCtx.fillRect(dx, dy, photoWidth, photoHeight);
          tempCtx.globalCompositeOperation = 'source-over';
        }
      });

      compiledStrips.push(tempCanvas.toDataURL('image/jpeg', 0.7));
    }

    // Encode the 10 compiled full-size strips into a single animated Moment GIF
    gifshot.createGIF({
      images: compiledStrips,
      interval: 0.14, // speed of the moment timelapse (approx 7 frames per second)
      gifWidth: width,
      gifHeight: height,
      numWorkers: 2,
    }, (obj: any) => {
      setIsGeneratingMomentGif(false);
      if (!obj.error) {
        setMomentGifUrl(obj.image);
        addLog('Timelapse 4-cut Moment GIF created successfully.');
      } else {
        console.error('Timelapse Moment GIF failed:', obj.error);
        addLog(`Error: Timelapse Moment GIF failed: ${obj.error}`);
      }
    });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      addLog('Webcam stream terminated.');
    }
  };

  useEffect(() => {
    if (step === 3) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, facingMode]);

  // Reset zoom when switching cameras if zoom is 2 (front camera doesn't support 2x)
  useEffect(() => {
    if (facingMode === 'user' && zoom === 2) {
      setZoom(1);
    }
  }, [facingMode, zoom]);

  // Capture sequence
  const startCaptureSequence = () => {
    if (isCapturing || cameraPermission !== 'granted') return;
    setIsCapturing(true);
    setCapturedPhotos([]);
    setActiveShotIndex(0);
    setGifDataUrl('');
    setMomentGifUrl('');
    startMomentRecording();
    addLog('Starting countdown sequence.');
    triggerShot(0);
  };

  const triggerShot = (index: number) => {
    let timeLeft = countdownDelay;
    setCountdown(timeLeft);
    playBeep(800, 0.1);

    const timer = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        setCountdown(timeLeft);
        playBeep(800, 0.1);
      } else if (timeLeft === 0) {
        clearInterval(timer);
        setCountdown(null);
        takePicture(index);
      }
    }, 1000);
  };

  const takePicture = (index: number) => {
    if (!videoRef.current) return;
    
    // Play shutter click and flash screen
    playShutterSound();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 150);

    const videoEl = videoRef.current;
    const canvas = document.createElement('canvas');
    // Use natural video stream resolution to prevent stretching at capture time
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (isMirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      const zScale = zoom === 0.5 ? 1.0 : zoom === 1 ? 1.5 : 2.5;
      if (zScale > 1.0) {
        const sW = canvas.width / zScale;
        const sH = canvas.height / zScale;
        const sX = (canvas.width - sW) / 2;
        const sY = (canvas.height - sH) / 2;
        ctx.drawImage(videoEl, sX, sY, sW, sH, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      setCapturedPhotos(prev => {
        const next = [...prev, dataUrl];
        addLog(`Photo ${index + 1} captured.`);
        
        const total = selectedLayout === 'polaroid' ? 1 : 4;
        if (next.length < total) {
          // Trigger next shot after a brief delay
          setActiveShotIndex(next.length);
          setTimeout(() => triggerShot(next.length), 1800);
        } else {
          // Finished capturing all shots
          setIsCapturing(false);
          stopMomentRecording();
          addLog('Capture sequence completed.');
          // Automatically go to customize step
          setTimeout(() => {
            setStep(4);
            setWizardStep(1);
          }, 1000);
        }
        return next;
      });
    }
  };

  // Center-crops images to fit layout slots without stretching
  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const imgW = img.width;
    const imgH = img.height;
    const r = imgW / imgH;
    const targetR = w / h;

    let sx = 0, sy = 0, sw = imgW, sh = imgH;

    if (r > targetR) {
      // Image is wider than target -> crop left/right
      sw = imgH * targetR;
      sx = (imgW - sw) / 2;
    } else {
      // Image is taller than target -> crop top/bottom
      sh = imgW / targetR;
      sy = (imgH - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };

  // Generate animated GIF loops from the captured photos (high resolution matching image aspect ratio)
  const generateAnimatedGif = () => {
    if (capturedPhotos.length === 0) return;
    setIsGeneratingGif(true);
    addLog('Generating animated GIF loop...');

    const firstImg = new Image();
    firstImg.src = capturedPhotos[0];
    firstImg.onload = () => {
      // Determine GIF dimension (capping max side to 640px for compression speed vs excellent clarity)
      const maxDim = 640;
      let w = firstImg.width || 640;
      let h = firstImg.height || 480;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      gifshot.createGIF({
        images: capturedPhotos,
        interval: 0.65, // delay between frames
        gifWidth: w,
        gifHeight: h,
        numWorkers: 2,
      }, (obj: any) => {
        setIsGeneratingGif(false);
        if (!obj.error) {
          setGifDataUrl(obj.image);
          addLog('Animated GIF generated successfully.');
        } else {
          console.error('GIF generation failed:', obj.error);
          addLog(`Error: GIF generation failed: ${obj.error}`);
        }
      });
    };
    firstImg.onerror = () => {
      // Fallback if load fails
      gifshot.createGIF({
        images: capturedPhotos,
        interval: 0.65,
        gifWidth: 480,
        gifHeight: 640,
        numWorkers: 2,
      }, (obj: any) => {
        setIsGeneratingGif(false);
        if (!obj.error) {
          setGifDataUrl(obj.image);
        }
      });
    };
  };

  // Automatically start generating GIF when in Print Room (Step 5)
  useEffect(() => {
    if (step === 5 && capturedPhotos.length > 0 && !gifDataUrl && !isGeneratingGif) {
      generateAnimatedGif();
    }
  }, [step, capturedPhotos, gifDataUrl]);

  // Compile photos onto a single template canvas
  useEffect(() => {
    if (step !== 4 && step !== 5) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const total = selectedLayout === 'polaroid' ? 1 : 4;
    // Fallback if no images were captured (e.g. testing)
    const imagesToDraw = capturedPhotos.length >= total 
      ? capturedPhotos 
      : Array(total).fill('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="%23444"/></svg>');

    // Canvas setup based on layout style
    const scale = 3; // 3x upscale for high-resolution retina prints
    let width = 0;
    let height = 0;
    let photoWidth = 0;
    let photoHeight = 0;
    let margin = 20 * scale;
    let spacing = 15 * scale;
    let bottomSpace = 80 * scale;

    if (selectedLayout === '4cut') {
      photoWidth = 360 * scale;
      photoHeight = 270 * scale;
      width = photoWidth + (margin * 2);
      height = (photoHeight * 4) + (spacing * 3) + margin + bottomSpace;
    } else if (selectedLayout === '2x2') {
      photoWidth = 300 * scale;
      photoHeight = 225 * scale;
      width = (photoWidth * 2) + (margin * 2) + spacing;
      height = (photoHeight * 2) + margin + spacing + bottomSpace;
    } else { // polaroid
      photoWidth = 360 * scale;
      photoHeight = 360 * scale; // square format
      width = photoWidth + (margin * 2);
      height = photoHeight + margin + bottomSpace + (20 * scale);
    }

    canvas.width = width;
    canvas.height = height;

    // Fill background frame color
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, width, height);

    // Apply color filters (enhanced for retro CCD & Film vibes)
    let filterString = 'none';
    if (selectedFilter === 'ixy') {
      // Canon IXY CCD digicam: slightly overexposed warm glow, high saturation, sharp highlights
      filterString = 'contrast(1.15) brightness(1.08) saturate(1.22) sepia(0.08) hue-rotate(-6deg)';
    } else if (selectedFilter === 'gold') {
      // Kodak Gold 200: Warm golden-yellow tones, high warm contrast
      filterString = 'contrast(0.98) brightness(1.04) saturate(1.38) sepia(0.3) hue-rotate(2deg)';
    } else if (selectedFilter === 'fuji') {
      // Fujifilm Superia: Cool greens/blues, soft highlight roll-off
      filterString = 'contrast(1.02) brightness(1.02) saturate(0.95) sepia(0.08) hue-rotate(18deg)';
    } else if (selectedFilter === 'instax') {
      // Instax Polaroid: Faded washed-out shadows, high brights, warm tint
      filterString = 'contrast(0.85) brightness(1.08) saturate(0.88) sepia(0.18)';
    } else if (selectedFilter === 'trix') {
      // B&W film: High contrast black and white
      filterString = 'grayscale(1) contrast(1.4) brightness(0.92)';
    }

    // Load and draw photos
    let loadedCount = 0;
    const drawAll = () => {
      // Draw Signature Text in handwritten Caveat font
      if (showSignature) {
        const displaySig = signatureText.trim();
        if (displaySig) {
          ctx.filter = 'none';
          ctx.fillStyle = selectedFrameIsDark() ? '#ffffff' : '#1c1917';
          ctx.font = `bold ${30 * scale}px 'Caveat', cursive`;
          ctx.textAlign = 'center';
          
          const sigY = height - (38 * scale);
          ctx.fillText(displaySig, width / 2, sigY);
        }
      }

      // Load Soundtrack QR if URL is provided
      if (soundtrackUrl.trim()) {
        const qrSize = 55 * scale;
        const qrX = width - qrSize - (16 * scale);
        const qrY = height - qrSize - (16 * scale);
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(soundtrackUrl)}`;
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          setFinalPhotoDataUrl(canvas.toDataURL('image/png'));
        };
        qrImg.onerror = () => {
          // Draw generic placeholder QR on error
          ctx.fillStyle = '#888';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);
          setFinalPhotoDataUrl(canvas.toDataURL('image/png'));
        };
      } else {
        setFinalPhotoDataUrl(canvas.toDataURL('image/png'));
      }
    };

    imagesToDraw.forEach((src, idx) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        ctx.filter = filterString;
        
        let dx = 0, dy = 0;
        if (selectedLayout === '4cut') {
          dx = margin;
          dy = margin + (idx * (photoHeight + spacing));
        } else if (selectedLayout === '2x2') {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          dx = margin + (col * (photoWidth + spacing));
          dy = margin + (row * (photoHeight + spacing));
        } else { // polaroid
          dx = margin;
          dy = margin;
        }

        // Draw image frame using aspect-ratio cover to prevent stretching
        drawImageCover(ctx, img, dx, dy, photoWidth, photoHeight);

        // Apply dark vignette gradient over the photo for raw vintage lens feeling
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.45;
        const vignette = ctx.createRadialGradient(
          dx + (photoWidth / 2), dy + (photoHeight / 2), photoWidth * 0.4,
          dx + (photoWidth / 2), dy + (photoHeight / 2), photoWidth * 0.85
        );
        vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
        vignette.addColorStop(0.6, 'rgba(200, 200, 200, 0.8)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = vignette;
        ctx.fillRect(dx, dy, photoWidth, photoHeight);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        // Draw animated noise/grain overlay on photo itself (using fast tiled method)
        if (grainDensity > 0) {
          ctx.filter = 'none';
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = grainDensity / 150;
          
          // Render raw pixel noise on 150x150 tile
          const tileSize = 150;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = tileSize;
          tempCanvas.height = tileSize;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            const noiseImg = tempCtx.createImageData(tileSize, tileSize);
            for (let i = 0; i < noiseImg.data.length; i += 4) {
              const val = Math.floor(Math.random() * 255);
              noiseImg.data[i] = val;
              noiseImg.data[i+1] = val;
              noiseImg.data[i+2] = val;
              noiseImg.data[i+3] = 255;
            }
            tempCtx.putImageData(noiseImg, 0, 0);
            
            // Tile the noise over the photo
            ctx.fillStyle = ctx.createPattern(tempCanvas, 'repeat') || '#fff';
            ctx.save();
            ctx.translate(dx, dy);
            ctx.fillRect(0, 0, photoWidth, photoHeight);
            ctx.restore();
          }
          
          // Reset composite/alpha
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
        }

        // Draw light leak gradient
        if (lightLeakActive) {
          ctx.filter = 'none';
          ctx.globalCompositeOperation = 'screen';
          
          const grad = ctx.createRadialGradient(
            dx + (photoWidth * 0.15), dy + (photoHeight * 0.15), 5,
            dx + (photoWidth * 0.2), dy + (photoHeight * 0.2), photoWidth * 0.65
          );
          grad.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
          grad.addColorStop(0.4, 'rgba(239, 68, 68, 0.18)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          
          ctx.fillStyle = grad;
          ctx.fillRect(dx, dy, photoWidth, photoHeight);
          ctx.globalCompositeOperation = 'source-over';
        }

        loadedCount++;
        if (loadedCount === total) {
          drawAll();
        }
      };
    });

  }, [step, wizardStep, selectedLayout, selectedFilter, grainDensity, lightLeakActive, frameColor, signatureText, showSignature, soundtrackUrl, capturedPhotos]);

  const selectedFrameIsDark = () => {
    return frameColor === '#121212';
  };

  // Drag interaction for shake-to-develop
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDeveloping) return;
    isDraggingRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastDragPosRef.current = { x: clientX, y: clientY };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current || !isDeveloping) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate displacement distance
    const dx = Math.abs(clientX - lastDragPosRef.current.x);
    const dy = Math.abs(clientY - lastDragPosRef.current.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      setShakeProgress(prev => {
        const next = Math.min(prev + Math.round(distance / 5), 100);
        if (next === 100) {
          setIsDeveloping(false);
          isDraggingRef.current = false;
          playBeep(900, 0.35); // success ding sound
          addLog('Photo development completed.');
        }
        return next;
      });
      lastDragPosRef.current = { x: clientX, y: clientY };
    }
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="min-h-screen warm-grid-bg text-stone-900 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative overflow-hidden font-sans">
      
      {/* Top Navbar */}
      <header className="w-full max-w-5xl mx-auto flex justify-between items-center z-10 py-3 border-b border-stone-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-stone-900 flex items-center justify-center text-white shadow-sm">
            <Camera className="w-5.5 h-5.5 stroke-[2]" />
          </div>
          <span className="font-heading font-extrabold tracking-wider text-base sm:text-xl text-stone-900">
            PHOTOBOOTH / MINIMAL
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-stone-200 bg-white/90 text-xs font-mono font-bold">
            <span className={`w-2.5 h-2.5 rounded-full ${
              backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : backendStatus === 'offline' ? 'bg-stone-400' : 'bg-amber-400 animate-pulse'
            }`} />
            <span>{backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {isAdmin && (
            <button 
              onClick={() => setShowSystemPanel(true)}
              className="p-3 rounded border border-stone-200 bg-white/90 hover:bg-stone-50 active:scale-95 transition-all text-stone-600 hover:text-stone-900 cursor-pointer"
              title="System Diagnostics"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Wizard Screens */}
      <main className="flex-1 max-w-2xl w-full mx-auto flex flex-col justify-center items-center py-6 sm:py-12 z-10 px-1 sm:px-4">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Event registration */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 01 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                สร้างห้องถ่ายรูปของคุณ
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-8 max-w-md leading-relaxed">
                ป้อนชื่อเล่นของคุณหรือชื่อกลุ่มเพื่อสร้างคลังภาพแยกอย่างปลอดภัย
              </p>

              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-6 sm:p-10 card-shadow flex flex-col gap-6">
                <div className="flex flex-col gap-2.5">
                  <label className="text-xs sm:text-sm font-mono font-bold tracking-wider text-stone-400 uppercase">ชื่อกลุ่ม / ชื่องาน</label>
                  <input 
                    type="text" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="เช่น Grace_is_coming"
                    className="w-full border-2 border-stone-200 focus:border-stone-950 rounded-2xl px-5 py-4 sm:py-5 text-lg sm:text-xl focus:outline-none transition-all font-mono placeholder:text-stone-300 bg-stone-50/50 text-stone-900"
                    onKeyDown={(e) => e.key === 'Enter' && startSession()}
                  />
                </div>

                <button
                  onClick={startSession}
                  className="w-full py-4.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer button-shadow"
                >
                  ถัดไป
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Choose layout format */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 02 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                เลือกรูปแบบภาพถ่าย
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-8 max-w-md leading-relaxed">
                เลือกโครงสร้างแผ่นภาพสติกเกอร์ที่ต้องการพิมพ์ออกมา
              </p>

              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-6 sm:p-10 card-shadow flex flex-col gap-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      id: '4cut', title: '4-Cut Strip', desc: '4 ช่องแนวตั้ง', render: () => (
                        <div className="w-8 h-18 border-2 border-stone-850 rounded flex flex-col gap-0.5 p-0.5 justify-between bg-white shadow-sm">
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                        </div>
                      )
                    },
                    {
                      id: '2x2', title: '2x2 Grid', desc: 'ตาราง 4 ช่อง', render: () => (
                        <div className="w-14 h-14 border-2 border-stone-850 rounded grid grid-cols-2 gap-0.5 p-0.5 bg-white shadow-sm">
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                          <div className="bg-stone-100 rounded-sm border border-stone-200" />
                        </div>
                      )
                    },
                    {
                      id: 'polaroid', title: 'Polaroid', desc: 'ภาพเดี่ยวขอบหนา', render: () => (
                        <div className="w-14 h-16 border-2 border-stone-850 rounded flex flex-col gap-0.5 p-0.5 bg-white shadow-sm">
                          <div className="bg-stone-100 flex-1 rounded-sm border border-stone-200" />
                          <div className="h-3 w-full bg-stone-50 border-t border-stone-200" />
                        </div>
                      )
                    }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedLayout(option.id as any)}
                      className={`p-5 rounded-2xl border-2 flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:gap-4 transition-all cursor-pointer ${
                        selectedLayout === option.id
                          ? 'border-stone-950 bg-stone-950 text-white shadow-md'
                          : 'border-stone-250 bg-stone-50/50 hover:bg-stone-50 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {option.render()}
                      <div className="text-left sm:text-center flex-1 sm:flex-initial">
                        <p className="text-base font-extrabold leading-tight font-heading">{option.title}</p>
                        <p className={`text-xs ${selectedLayout === option.id ? 'text-stone-300' : 'text-stone-400'} font-medium`}>{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="py-4 border-2 border-stone-200 hover:border-stone-950 text-stone-600 hover:text-stone-950 rounded-2xl font-extrabold text-base tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer order-2 sm:order-1 sm:w-1/3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    ย้อนกลับ
                  </button>
                  <button
                    onClick={handleNextStep2}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-extrabold text-base sm:text-lg tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer button-shadow order-1 sm:order-2"
                  >
                    ยืนยันเลือกเลย์เอาต์
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Live Camera Room */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold">STEP 03 / 03</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-stone-900 text-center mb-3 leading-tight font-heading">
                กล้องถ่ายรูปพร้อมแล้ว
              </h2>
              <p className="text-sm sm:text-base text-stone-500 font-medium text-center mb-6 max-w-sm">
                ถ่ายภาพตามจำนวนช่องที่เลือก สแกนสายตากับเลนส์กล้องได้เลย
              </p>

              <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-4 sm:p-6 card-shadow flex flex-col gap-5 relative">
                
                {/* Visual Viewport Screen */}
                <div className="aspect-video w-full border-2 border-stone-900 rounded-2xl relative overflow-hidden bg-stone-950 flex flex-col justify-between p-4 scanlines">
                  
                  {/* Camera Stream Element */}
                  {cameraPermission === 'granted' ? (
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        transform: `scale(${zoom === 0.5 ? 1.0 : zoom === 1 ? 1.5 : 2.5}) ${isMirror ? 'scaleX(-1)' : ''}`,
                        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-stone-400 z-10">
                      <Camera className="w-10 h-10 stroke-[1.5] animate-pulse" />
                      {cameraPermission === 'prompt' ? (
                        <p className="text-xs">กำลังขอสิทธิ์เข้าถึงอุปกรณ์กล้องของคุณ...</p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-sm font-bold text-red-400">เข้าถึงกล้องถ่ายรูปไม่ได้</p>
                          <p className="text-[11px] text-stone-500 max-w-xs">กรุณาอนุญาตสิทธิ์เข้าใช้กล้องในบราวเซอร์ หรือใช้งานใน Standalone mode</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Corner indicator lines */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/60 z-10 pointer-events-none" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/60 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/60 z-10 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/60 z-10 pointer-events-none" />

                  {/* Flash Screen Overlay */}
                  <AnimatePresence>
                    {flashActive && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                        className="absolute inset-0 bg-white z-30 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  {/* Countdown overlay banner */}
                  <AnimatePresence>
                    {countdown !== null && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                      >
                        <span className="font-heading font-black text-white text-8xl sm:text-9xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                          {countdown}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Viewfinder Top bar HUD */}
                  <div className="z-10 flex justify-between text-xs font-mono text-white/70 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                      <span>{isCapturing ? `SHOOTING [${capturedPhotos.length + 1}/${selectedLayout === 'polaroid' ? 1 : 4}]` : 'STANDBY'}</span>
                    </div>
                    <div>
                      <span>ISO {facingMode === 'user' ? '400' : '200'}</span>
                    </div>
                  </div>

                  {/* Viewfinder Bottom bar HUD */}
                  <div className="z-10 flex justify-between text-xs font-mono text-white/70 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    <span>F/2.0</span>
                    <div className="flex gap-2.5">
                      <span>MIRROR: {isMirror ? 'ON' : 'OFF'}</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Live slots capture indicators */}
                <div className="flex gap-2 justify-center items-center py-2 bg-stone-50 border border-stone-200/50 rounded-xl p-3">
                  {Array.from({ length: selectedLayout === 'polaroid' ? 1 : 4 }).map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-14 h-12 rounded-lg border-2 overflow-hidden flex items-center justify-center ${
                        idx === activeShotIndex && isCapturing 
                          ? 'border-stone-950 bg-stone-200' 
                          : capturedPhotos[idx] 
                            ? 'border-emerald-500' 
                            : 'border-stone-200 bg-white'
                      }`}
                    >
                      {capturedPhotos[idx] ? (
                        <img src={capturedPhotos[idx]} alt="capture preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-stone-400">{idx + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
 
                {/* Camera Zoom Control */}
                <div className="flex justify-center items-center gap-2.5 bg-stone-50 border border-stone-200/50 rounded-2xl p-2.5">
                  <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">ซูมกล้อง (ZOOM)</span>
                  <div className="flex gap-1.5">
                    {[0.5, 1, 2].map((zVal) => {
                      // Front camera (user) only allows 0.5 and 1
                      if (facingMode === 'user' && zVal === 2) return null;
                      return (
                        <button
                          key={zVal}
                          onClick={() => {
                            setZoom(zVal as any);
                            playBeep(600, 0.08); // toggle click sound
                            addLog(`Camera zoom set to ${zVal}x`);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold cursor-pointer border-2 transition-all active:scale-95 ${
                            zoom === zVal
                              ? 'bg-stone-900 border-stone-900 text-white'
                              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                          }`}
                        >
                          {zVal}x
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Countdown Timer Selector */}
                <div className="flex justify-center items-center gap-2.5 bg-stone-50 border border-stone-200/50 rounded-2xl p-2.5">
                  <span className="text-[10px] font-mono font-bold text-stone-400 uppercase">นับถอยหลัง (TIMER)</span>
                  <div className="flex gap-1.5">
                    {[3, 5, 10].map((tVal) => (
                      <button
                        key={tVal}
                        disabled={isCapturing}
                        onClick={() => {
                          setCountdownDelay(tVal as any);
                          playBeep(500, 0.08); // click sound
                          addLog(`Countdown delay set to ${tVal} seconds`);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold cursor-pointer border-2 transition-all ${
                          isCapturing ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                        } ${
                          countdownDelay === tVal
                            ? 'bg-stone-900 border-stone-900 text-white'
                            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'
                        }`}
                      >
                        {tVal}s
                      </button>
                    ))}
                  </div>
                </div>
 
                {/* Video action triggers */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex gap-2 w-full sm:w-1/2">
                    <button
                      onClick={() => setIsMirror(!isMirror)}
                      className="flex-1 py-3 border-2 border-stone-200 hover:border-stone-950 text-stone-700 font-bold text-xs tracking-wide rounded-xl bg-white cursor-pointer active:scale-95 transition-all"
                    >
                      กลับรูป (MIRROR)
                    </button>
                    <button
                      onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                      className="flex-1 py-3 border-2 border-stone-200 hover:border-stone-950 text-stone-700 font-bold text-xs tracking-wide rounded-xl bg-white cursor-pointer active:scale-95 transition-all"
                    >
                      สลับกล้อง (FLIP)
                    </button>
                  </div>

                  <button
                    disabled={isCapturing || cameraPermission !== 'granted'}
                    onClick={startCaptureSequence}
                    className={`flex-1 py-3.5 rounded-xl font-extrabold text-base tracking-wide flex items-center justify-center gap-2 transition-all button-shadow ${
                      isCapturing || cameraPermission !== 'granted'
                        ? 'bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed shadow-none translate-x-[3px] translate-y-[3px]'
                        : 'bg-stone-900 hover:bg-stone-800 text-white cursor-pointer'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    {isCapturing ? 'กำลังถ่ายรูป...' : 'เริ่มกดชัตเตอร์ถ่ายภาพ (CAPTURE)'}
                  </button>
                </div>
              </div>

              {/* Force skip button for testing/mocking when no camera is connected */}
              <button 
                onClick={() => {
                  stopCamera();
                  setStep(4);
                  setWizardStep(1);
                  addLog('Camera bypassed for testing.');
                }}
                className="mt-4 text-xs font-mono text-stone-400 hover:text-stone-600 underline cursor-pointer"
              >
                * ข้ามไปหน้าแต่งรูป (ข้ามโหมดกล้องจำลอง)
              </button>
            </motion.div>
          )}

          {/* STEP 4: Customization Wizard */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col md:grid md:grid-cols-12 gap-8 items-start justify-center"
            >
              {/* Left Column: Real-time compiled image preview */}
              <div className="md:col-span-6 w-full flex flex-col items-center">
                <span className="text-xs font-mono font-bold text-stone-400 mb-2 uppercase tracking-wider">PREVIEW STRIP</span>
                <div className="p-3 bg-stone-100 border border-stone-200 rounded-3xl w-full flex justify-center items-center min-h-[380px] max-h-[500px] overflow-y-auto">
                  {finalPhotoDataUrl ? (
                    <img 
                      src={finalPhotoDataUrl} 
                      alt="compiled final print" 
                      className="max-h-[460px] object-contain shadow-xl rounded-lg border border-stone-350 select-none pointer-events-none"
                    />
                  ) : (
                    <div className="text-xs text-stone-400 font-mono animate-pulse flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังสร้างพรีวิวรูปภาพ...
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Customization Wizard inputs */}
              <div className="md:col-span-6 w-full flex flex-col gap-6">
                <div>
                  <span className="text-xs font-mono tracking-widest text-stone-400 uppercase font-bold">WIZARD STEP {wizardStep} / 4</span>
                  <h3 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-stone-900 mt-1">
                    {wizardStep === 1 && '1. เลือกโทนสีฟิล์ม'}
                    {wizardStep === 2 && '2. ปรับแต่งเม็ดเกรน/แสงรั่ว'}
                    {wizardStep === 3 && '3. เลือกสีกรอบและลายเซ็น'}
                    {wizardStep === 4 && '4. แปะคิวอาร์โค้ดเพลง'}
                  </h3>
                </div>

                <div className="w-full bg-white border-2 border-stone-900 rounded-3xl p-5 sm:p-6 card-shadow flex flex-col gap-6">
                  
                  {/* WIZARD SUB-STEP 1: Filter LUT selection */}
                  {wizardStep === 1 && (
                    <div className="flex flex-col gap-4">
                      <span className="text-xs font-mono font-bold text-stone-400 uppercase">ฟิลเตอร์สีกระจกเงา (FILM PRESETS)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'original', label: 'Original', desc: 'สีธรรมชาติเดิมๆ' },
                          { id: 'ixy', label: 'Canon IXY', desc: 'สีอมชมพู สไตล์กล้อง Y2K CCD' },
                          { id: 'gold', label: 'Kodak Gold', desc: 'ฟิล์มสีส้มทองอบอุ่น' },
                          { id: 'fuji', label: 'Fuji Superia', desc: 'ฟิล์มสีโทนเย็น อมฟ้า-เขียว' },
                          { id: 'instax', label: 'Instax Polaroid', desc: 'สีซีดจาง คลาสสิกโพลารอยด์' },
                          { id: 'trix', label: 'Tri-X 400', desc: 'ขาวดำ คอนทราสต์ดุเดือด' }
                        ].map((filter) => (
                          <button
                            key={filter.id}
                            onClick={() => setSelectedFilter(filter.id as any)}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              selectedFilter === filter.id 
                                ? 'border-stone-950 bg-stone-950 text-white' 
                                : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
                            }`}
                          >
                            <p className="text-sm font-extrabold font-heading">{filter.label}</p>
                            <p className={`text-[10px] ${selectedFilter === filter.id ? 'text-stone-400' : 'text-stone-400'} font-medium`}>{filter.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* WIZARD SUB-STEP 2: Grain slider and Light leak toggle */}
                  {wizardStep === 2 && (
                    <div className="flex flex-col gap-6">
                      {/* Grain Density slider */}
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
                          <span>ระดับเกรนฟิล์ม (Film Grain)</span>
                          <span className="text-stone-900 font-extrabold">{grainDensity}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="90" 
                          value={grainDensity}
                          onChange={(e) => setGrainDensity(parseInt(e.target.value))}
                          className="w-full h-2 bg-stone-100 border border-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                        />
                        <span className="text-[10px] text-stone-400 font-medium">ความหนาแน่นและเม็ดสไลด์ทรายฟิล์มบนภาพ</span>
                      </div>

                      {/* Light Leak Toggle */}
                      <div className="flex justify-between items-center p-4 rounded-2xl border-2 border-stone-200 bg-stone-50/50">
                        <div>
                          <p className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5 font-heading">
                            <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500" />
                            แสงรั่วจำลอง (Light Leaks Overlay)
                          </p>
                          <p className="text-[10px] text-stone-400 font-medium">สาดแสงสีส้มแดงพาดเฉียงจำลองแดดพาดเลนส์</p>
                        </div>
                        <button
                          onClick={() => setLightLeakActive(!lightLeakActive)}
                          className={`w-12 h-6 rounded-full p-1 transition-all cursor-pointer ${
                            lightLeakActive ? 'bg-stone-950' : 'bg-stone-200'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                            lightLeakActive ? 'translate-x-6' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* WIZARD SUB-STEP 3: Frame colors and handwritten signature */}
                  {wizardStep === 3 && (
                    <div className="flex flex-col gap-5">
                      {/* Frame color picker */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-xs font-mono font-bold text-stone-400 uppercase">สีกรอบสติกเกอร์ (FRAME COLOR)</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { color: '#fefcf8', name: 'ขาวครีม' },
                            { color: '#ffffff', name: 'ขาวจั๊วะ' },
                            { color: '#121212', name: 'ดำเท่' },
                            { color: '#ffd3b6', name: 'ส้มพีช' }
                          ].map((frame) => (
                            <button
                              key={frame.color}
                              onClick={() => setFrameColor(frame.color)}
                              className={`p-3.5 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                frameColor === frame.color 
                                  ? 'border-stone-950 bg-stone-950 text-white' 
                                  : 'border-stone-200 bg-stone-50/50'
                              }`}
                            >
                              <div className="w-6 h-6 rounded border border-stone-300" style={{ backgroundColor: frame.color }} />
                              <span className="text-[10px] font-bold">{frame.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Signature input text */}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono font-bold text-stone-400 uppercase">เขียนโน้ตลายเซ็น (Handwritten signature)</span>
                          <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer font-bold select-none">
                            <input 
                              type="checkbox" 
                              checked={showSignature}
                              onChange={(e) => setShowSignature(e.target.checked)}
                              className="accent-stone-900 w-3.5 h-3.5"
                            />
                            แสดงข้อความ
                          </label>
                        </div>
                        {showSignature && (
                          <input 
                            type="text"
                            maxLength={32}
                            value={signatureText}
                            onChange={(e) => setSignatureText(e.target.value)}
                            placeholder="เช่น MEMORIES OF THE DAY..."
                            className="w-full border-2 border-stone-200 focus:border-stone-950 rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all font-mono placeholder:text-stone-300 bg-stone-50/50"
                          />
                        )}
                        <span className="text-[10.5px] text-stone-400 font-medium">โน้ตเขียนข้อความด้านล่าง จะแสดงผลเป็นฟอนต์ปากกาเขียนมือ</span>
                      </div>
                    </div>
                  )}

                  {/* WIZARD SUB-STEP 4: Soundtrack QR Link */}
                  {wizardStep === 4 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-xs font-mono font-bold text-stone-400 uppercase">แปะคิวอาร์เพลงประกอบ (SOUNDTRACK LINK)</span>
                      <div className="flex items-center gap-2 border-2 border-stone-200 bg-stone-50/50 p-3 rounded-2xl">
                        <Music className="w-5 h-5 text-stone-500" />
                        <input 
                          type="text"
                          value={soundtrackUrl}
                          onChange={(e) => setSoundtrackUrl(e.target.value)}
                          placeholder="วางลิงก์ Spotify / YouTube..."
                          className="w-full text-sm focus:outline-none transition-all font-mono placeholder:text-stone-300 bg-transparent"
                        />
                      </div>
                      <span className="text-[11px] text-stone-450 leading-relaxed font-medium">
                        (ทางเลือก): วางลิงก์เพลงประกอบภาพถ่าย ระบบจะแปลงเป็น **QR Code น่ารักๆ แปะลงมุมล่างขวา** เพื่อให้เพื่อนๆ สแกนฟังเพลงประกอบภาพได้
                      </span>
                    </div>
                  )}

                  {/* Back and Next controls inside wizard */}
                  <div className="flex gap-3 pt-2 border-t border-stone-100">
                    {wizardStep > 1 ? (
                      <button
                        onClick={() => setWizardStep((wizardStep - 1) as any)}
                        className="py-3 border-2 border-stone-200 hover:border-stone-950 text-stone-600 hover:text-stone-950 rounded-xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer w-1/3"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        ถอย
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm('คุณต้องการถ่ายรูปใหม่อีกครั้งใช่ไหม? รูปที่ถ่ายไปแล้วทั้งหมดจะหายไป')) {
                            setStep(3);
                            setCapturedPhotos([]);
                          }
                        }}
                        className="py-3 border-2 border-stone-200 hover:border-red-500 hover:text-red-500 text-stone-600 rounded-xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer w-1/3"
                      >
                        <RotateCcw className="w-4 h-4" />
                        ถ่ายใหม่
                      </button>
                    )}

                    {wizardStep < 4 ? (
                      <button
                        onClick={() => setWizardStep((wizardStep + 1) as any)}
                        className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        ถัดไป
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setStep(5);
                          setShakeProgress(0);
                          setIsDeveloping(true);
                          addLog('Initiating printer development.');
                        }}
                        className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer button-shadow"
                      >
                        ส่งบิลด์ภาพปริ้นท์
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Print Room (Shake to develop) */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center"
            >
              <span className="text-xs sm:text-sm font-mono tracking-widest text-stone-400 uppercase mb-2.5 font-bold font-sans">PRINTER ROOM</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 text-center mb-1 leading-tight font-heading">
                {isDeveloping ? 'คลิกลากปัดถูหน้าจอเพื่อล้างรูปฟิล์ม!' : 'ล้างฟิล์มรูปภาพเสร็จสิ้น! ✨'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium text-center mb-6 max-w-sm">
                {isDeveloping 
                  ? `โพลารอยด์กำลังฟอร์มตัว (เขย่าล้างฟิล์มไปแล้ว: ${shakeProgress}%)` 
                  : 'ดาวน์โหลดภาพคุณภาพสูงหรือถ่ายใหม่อีกใบได้เลยครับ'
                }
              </p>

              {/* Virtual Printer Container */}
              <div className="w-full max-w-sm bg-white border-2 border-stone-900 rounded-3xl p-5 sm:p-7 card-shadow flex flex-col gap-6 items-center">
                
                {/* Simulated Physical Printer Mouth slot */}
                <div className="w-full h-4 bg-stone-950 rounded-full border border-stone-850 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0.5 inset-x-2 h-0.5 bg-zinc-800" />
                </div>

                {/* Sliding printing sheet */}
                <div 
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={handleDragStart}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                  className="w-full max-w-xs flex justify-center items-center cursor-grab active:cursor-grabbing select-none relative animate-print-out overflow-hidden py-4"
                >
                  {finalPhotoDataUrl ? (
                    <div className="relative">
                      {/* Photo base compiled image */}
                      <img 
                        src={finalPhotoDataUrl} 
                        alt="final output strip" 
                        className="max-h-[360px] object-contain shadow-2xl rounded border border-stone-300 pointer-events-none select-none"
                        style={{
                          filter: isDeveloping
                            ? `brightness(${0.4 + (shakeProgress / 180)}) opacity(${0.08 + (shakeProgress * 0.92 / 100)}) contrast(${0.15 + (shakeProgress * 0.85 / 100)}) sepia(0.3)`
                            : 'none'
                        }}
                      />
                      
                      {/* Development Progress Indicator mask layer */}
                      {isDeveloping && (
                        <div className="absolute inset-0 bg-white/90 border border-stone-250 flex items-center justify-center p-4 text-center rounded pointer-events-none select-none"
                             style={{ opacity: 1 - (shakeProgress / 100) }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Sparkles className="w-6 h-6 text-stone-400 stroke-[1.5] animate-spin" />
                            <p className="text-[10px] font-mono tracking-wider font-bold text-stone-400 uppercase">SHAKE / SWIPE TO DEVELOP</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400 font-mono animate-pulse">กำลังแปลงภาพถ่าย...</div>
                  )}
                </div>

                {/* Print Room actions */}
                <div className="w-full flex flex-col gap-3">
                  {!isDeveloping && finalPhotoDataUrl && (
                    <a 
                      href={finalPhotoDataUrl}
                      download={`${groupName.trim() || 'photobooth'}_${Date.now()}.png`}
                      className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all button-shadow"
                    >
                      <Download className="w-5 h-5 stroke-[2.5]" />
                      ดาวน์โหลดภาพถ่าย (DOWNLOAD PNG)
                    </a>
                  )}

                  {!isDeveloping && gifDataUrl && (
                    <a 
                      href={gifDataUrl}
                      download={`${groupName.trim() || 'photobooth'}_strip_${Date.now()}.gif`}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all button-shadow cursor-pointer"
                    >
                      <Layers className="w-5 h-5" />
                      ดาวน์โหลดภาพสติกเกอร์ GIF (DOWNLOAD STRIP GIF)
                    </a>
                  )}

                  {!isDeveloping && momentGifUrl && (
                    <a 
                      href={momentGifUrl}
                      download={`${groupName.trim() || 'photobooth'}_moment_${Date.now()}.gif`}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-455 text-white rounded-xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 transition-all button-shadow cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      ดาวน์โหลดโมเมนต์ GIF (DOWNLOAD MOMENT GIF)
                    </a>
                  )}

                  {(isGeneratingGif || isGeneratingMomentGif) && (
                    <div className="w-full py-3 bg-stone-50 text-stone-555 border-2 border-stone-100 border-dashed rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังสร้างไฟล์อนิเมชัน GIF...
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setStep(1);
                      setGroupName('');
                      setCapturedPhotos([]);
                      setGifDataUrl('');
                      setMomentGifUrl('');
                    }}
                    className={`w-full py-3.5 border-2 border-stone-200 hover:border-stone-950 text-stone-700 hover:text-stone-900 rounded-xl font-extrabold text-sm transition-all cursor-pointer ${
                      isDeveloping ? 'opacity-50 cursor-not-allowed hover:border-stone-200 text-stone-400' : ''
                    }`}
                    disabled={isDeveloping}
                  >
                    ถ่ายใบถัดไป (NEW SHOT)
                  </button>
                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="w-full text-center py-4 text-xs font-mono text-stone-450 z-10 border-t border-stone-100 max-w-5xl mx-auto">
        &copy; {new Date().getFullYear()} NARATIP PHOTOBOOTH. ALL RIGHTS RESERVED.
      </footer>

      {/* Slide-over System Diagnostic Panel */}
      <AnimatePresence>
        {showSystemPanel && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSystemPanel(false)}
              className="absolute inset-0 bg-stone-900/40 z-40 cursor-pointer backdrop-blur-[2px]"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-white border-l-2 border-stone-900 z-50 p-6 sm:p-8 flex flex-col justify-between shadow-2xl"
            >
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center border-b-2 border-stone-100 pb-4">
                  <span className="font-heading font-extrabold text-base tracking-wide text-stone-900 flex items-center gap-2">
                    <Terminal className="w-5.5 h-5.5" />
                    SYSTEM DIAGNOSTICS
                  </span>
                  <button 
                    onClick={() => setShowSystemPanel(false)}
                    className="p-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* API Info */}
                <div className="flex flex-col gap-4">
                  <div className="bg-stone-50 border-2 border-stone-100 rounded-2xl p-4 flex flex-col gap-3 font-mono text-xs text-stone-700">
                    <div className="flex justify-between">
                      <span className="text-stone-455 font-bold">STATUS:</span>
                      <span className={`font-bold ${backendStatus === 'online' ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {backendStatus === 'online' ? 'ONLINE (DOCKER)' : 'STANDALONE (OFFLINE)'}
                      </span>
                    </div>
                    
                    {isAdmin ? (
                      systemInfo ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-stone-455 font-bold">SERVER CPU:</span>
                            <span className="text-stone-900 font-bold">{systemInfo.stats?.cpu}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-455 font-bold">SERVER RAM:</span>
                            <span className="text-stone-900 font-bold">{systemInfo.stats?.ram}</span>
                          </div>
                          <div className="flex flex-col gap-1 mt-1 pt-3 border-t border-stone-200/50">
                            <span className="text-stone-455 font-bold text-[10px]">GALLERY DIR:</span>
                            <span className="text-stone-850 text-[10px] break-all">{systemInfo.galleryPath}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-stone-400 italic text-center py-2">
                          Loading diagnostics stats...
                        </div>
                      )
                    ) : (
                      <div className="text-[11.5px] text-stone-400 italic text-center py-2 border-t border-stone-100">
                        🔒 Diagnostics metrics are locked for guests. Visit with admin token to unlock.
                      </div>
                    )}
                  </div>

                  {/* Access Log View */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-stone-400 uppercase">System Events</span>
                    <div className="bg-stone-950 text-stone-300 rounded-xl p-3.5 h-44 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5 border-2 border-stone-900">
                      {logs.map((log, i) => (
                        <div key={i} className="truncate">
                          <span className="text-stone-600">&gt; </span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* LocalTunnel Info in sidebar */}
              <div className="bg-stone-50 border-2 border-stone-100 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                <span className="font-heading font-extrabold text-stone-900 flex items-center gap-1.5 text-xs uppercase">
                  <WifiOff className="w-4 h-4 text-stone-600" />
                  LOCALTUNNEL REMOTE
                </span>
                <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                  รันคำสั่งด้านล่างบนคอมเพื่ออนุญาตให้เปิดกล้องมือถือสแกนพาสเวิร์ดถ่ายรูปภายนอกบ้าน:
                </p>
                <div className="bg-stone-900 text-stone-100 font-mono text-[11px] p-2.5 rounded select-all text-center border border-stone-800">
                  npx localtunnel --port 3001
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
