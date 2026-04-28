// =========================================
// Photobooth App — script.js
// React (CDN), no TypeScript, no backend
// =========================================

const { useState, useEffect, useRef, useCallback } = React;

const FILTER_MODES = {
  COLOR_FILM: {
    label: 'color film',
    /** Slightly muted color with green cast; heavy grain layered in preview + capture. */
    filter: 'contrast(1.18) saturate(1.42) brightness(1.01) hue-rotate(30deg)',
  },
  SEPIA: {
    label: 'sepia',
    filter:
      'sepia(0.82) contrast(1.36) saturate(0.68) brightness(1.1) hue-rotate(-14deg)',
  },
  BW: {
    label: 'b&w',
    filter: 'grayscale(1) contrast(1.2) brightness(1.05)',
  },
};
const LAST_STRIP_CACHE_KEY = 'photobooth:last-strip';
const FRAME_OPTIONS = [
  { key: 'white', label: 'white' },
  { key: 'cream', label: 'cream' },
  { key: 'pink', label: 'pink' },
  { key: 'mint', label: 'mint' },
  { key: 'black', label: 'black' },
  { key: 'lavender', label: 'lavender' },
  { key: 'peach', label: 'peach' },
  { key: 'sky', label: 'sky' },
  { key: 'sage', label: 'sage' },
  { key: 'butter', label: 'butter' },
  { key: 'bw-polka', label: 'b/w polka' },
  { key: 'sky-stripes', label: 'sky stripes' },
  { key: 'pink-stripes', label: 'pink stripes' },
  { key: 'mint-checker', label: 'mint checker' },
  { key: 'charcoal-grid', label: 'charcoal grid' },
];

function addFilmGrainToCanvas(canvas, amount = 0.11) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 255 * amount;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain));
  }
  ctx.putImageData(img, 0, 0);
}

function grainAmountForMode(mode) {
  if (mode === 'COLOR_FILM') return 0.18;
  if (mode === 'SEPIA') return 0.17;
  return 0.19; // BW
}

function getFramePreviewStyle(frameStyleKey) {
  const solids = {
    white: '#ffffff',
    cream: '#f5f0e8',
    pink: '#f4dfe6',
    mint: '#dfeee2',
    black: '#1f1f1f',
    lavender: '#e7e2ff',
    peach: '#f8dfcf',
    sky: '#d8ecff',
    sage: '#d8e6d3',
    butter: '#fff3bf',
  };
  if (solids[frameStyleKey]) return { background: solids[frameStyleKey] };
  if (frameStyleKey === 'bw-polka') {
    return {
      backgroundColor: '#fff',
      backgroundImage: 'radial-gradient(#1f1f1f 16%, transparent 17%)',
      backgroundSize: '12px 12px',
    };
  }
  if (frameStyleKey === 'sky-stripes') {
    return {
      backgroundImage: 'repeating-linear-gradient(180deg, #dbefff 0 8px, #ffffff 8px 16px)',
    };
  }
  if (frameStyleKey === 'pink-stripes') {
    return {
      backgroundImage: 'repeating-linear-gradient(180deg, #f9dce8 0 8px, #ffffff 8px 16px)',
    };
  }
  if (frameStyleKey === 'mint-checker') {
    return {
      backgroundImage:
        'linear-gradient(45deg, #dff1e3 25%, transparent 25%), linear-gradient(-45deg, #dff1e3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #dff1e3 75%), linear-gradient(-45deg, transparent 75%, #dff1e3 75%)',
      backgroundSize: '16px 16px',
      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
      backgroundColor: '#ffffff',
    };
  }
  if (frameStyleKey === 'charcoal-grid') {
    return {
      backgroundImage:
        'linear-gradient(#2b2b2b 2px, transparent 2px), linear-gradient(90deg, #2b2b2b 2px, transparent 2px)',
      backgroundSize: '12px 12px',
      backgroundColor: '#ececec',
    };
  }
  return { background: '#ffffff' };
}

function paintFrameBackground(ctx, width, height, frameStyleKey) {
  const solids = {
    white: '#ffffff',
    cream: '#f5f0e8',
    pink: '#f4dfe6',
    mint: '#dfeee2',
    black: '#1f1f1f',
    lavender: '#e7e2ff',
    peach: '#f8dfcf',
    sky: '#d8ecff',
    sage: '#d8e6d3',
    butter: '#fff3bf',
  };
  if (solids[frameStyleKey]) {
    ctx.fillStyle = solids[frameStyleKey];
    ctx.fillRect(0, 0, width, height);
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  if (frameStyleKey === 'bw-polka') {
    ctx.fillStyle = '#1f1f1f';
    for (let y = 12; y < height; y += 23) {
      for (let x = 12; x < width; x += 23) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (frameStyleKey === 'sky-stripes' || frameStyleKey === 'pink-stripes') {
    const stripe = frameStyleKey === 'sky-stripes' ? '#dbefff' : '#f9dce8';
    for (let y = 0; y < height; y += 30) {
      ctx.fillStyle = stripe;
      ctx.fillRect(0, y, width, 15);
    }
  } else if (frameStyleKey === 'mint-checker') {
    ctx.fillStyle = '#dff1e3';
    const s = 25;
    for (let y = 0; y < height; y += s) {
      for (let x = 0; x < width; x += s) {
        if (((x + y) / s) % 2 === 0) {
          ctx.fillRect(x, y, s, s);
        }
      }
    }
  } else if (frameStyleKey === 'charcoal-grid') {
    ctx.fillStyle = '#ececec';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 2.5;
    for (let x = 0; x < width; x += 23) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 23) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

// ── State machine steps ──────────────────
const STEPS = {
  HOME: 'home',
  LIVE1: 'live1',
  LOADING1: 'loading1',
  LIVE2: 'live2',
  LOADING2: 'loading2',
  LIVE3: 'live3',
  LOADING3: 'loading3',
  LIVE4: 'live4',
  LOADING4: 'loading4',
  FINAL: 'final',
  CUSTOMIZE: 'customize',
};

// ── Helpers ──────────────────────────────
function photoIndexFromStep(step) {
  if (step === STEPS.LIVE1 || step === STEPS.LOADING1) return 1;
  if (step === STEPS.LIVE2 || step === STEPS.LOADING2) return 2;
  if (step === STEPS.LIVE3 || step === STEPS.LOADING3) return 3;
  if (step === STEPS.LIVE4 || step === STEPS.LOADING4 || step === STEPS.FINAL) return 4;
  return 0;
}

function liveStepForIndex(i) {
  return [STEPS.LIVE1, STEPS.LIVE2, STEPS.LIVE3, STEPS.LIVE4][i - 1];
}

// ── Spinner SVG (minimal sunburst) ───────
function Spinner() {
  return (
    <div className="spinner">
      <svg className="spinner-lines" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x1 = 12 + Math.cos(angle) * 4;
          const y1 = 12 + Math.sin(angle) * 4;
          const x2 = 12 + Math.cos(angle) * 9;
          const y2 = 12 + Math.sin(angle) * 9;
          const opacity = 0.3 + (i / 8) * 0.7;
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#2a2520"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity={opacity}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ── Strip Preview (left thumbnails) ──────
function StripPreview({ photos }) {
  if (!photos || photos.length === 0) return null;
  return (
    <div className="strip-preview">
      {photos.map((src, i) => (
        <img
          key={i}
          className="strip-thumb"
          src={src}
          alt={`photo ${i + 1}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}

// ── Main App ─────────────────────────────
function App() {
  const [step, setStep] = useState(STEPS.HOME);
  const [filmMode, setFilmMode] = useState(null); // 'COLOR_FILM' | 'SEPIA' | 'BW' — set on home, used for live + capture
  const [photos, setPhotos] = useState([]); // array of data URLs
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState(null); // null or 3,2,1
  const [isCounting, setIsCounting] = useState(false);
  const [stripUrl, setStripUrl] = useState(null);
  const [lastStripUrl, setLastStripUrl] = useState(null);
  const [frameStyle, setFrameStyle] = useState('white');
  const [sessionStrips, setSessionStrips] = useState([]);
  const [pendingCapture, setPendingCapture] = useState(null); // { photoIndex, dataUrl } shown for 2.5s before commit

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const pendingCommitTimerRef = useRef(null);
  const finalStripSourcesRef = useRef([]);

  // ── Webcam ────────────────────────────
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LAST_STRIP_CACHE_KEY);
      if (cached) setLastStripUrl(cached);
    } catch (err) {
      console.warn('Could not read cached photostrip:', err);
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Webcam error:', err);
      alert('Could not access camera. Please allow camera permissions and reload.');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Start webcam whenever we enter a live step
  useEffect(() => {
    const isLive = [STEPS.LIVE1, STEPS.LIVE2, STEPS.LIVE3, STEPS.LIVE4].includes(step);
    if (isLive) {
      startWebcam();
    }
    return () => {
      // We don't stop on every transition — only on final or home
    };
  }, [step, startWebcam]);

  // Assign stream to video element once both exist
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // ── Capture a frame ───────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;

    const mode = filmMode && FILTER_MODES[filmMode] ? filmMode : 'SEPIA';
    const filterStr = FILTER_MODES[mode].filter;

    const canvas = captureCanvasRef.current;
    const W = 480;
    const H = 360;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.filter = filterStr;
    // Mirror the image (since video is mirrored with CSS)
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, W, H);
    addFilmGrainToCanvas(canvas, grainAmountForMode(mode));
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [filmMode]);

  const commitCapturedPhoto = useCallback((photoIndex, dataUrl) => {
    setPendingCapture(null);
    setPhotos(prev => {
      const updated = [...prev];
      updated[photoIndex - 1] = dataUrl;
      return updated;
    });

    if (photoIndex === 1) setStep(STEPS.LOADING1);
    else if (photoIndex === 2) setStep(STEPS.LOADING2);
    else if (photoIndex === 3) setStep(STEPS.LOADING3);
    else if (photoIndex === 4) {
      finalStripSourcesRef.current = [...photos.slice(0, 3), dataUrl];
      setStep(STEPS.LOADING4);
    }
  }, [photos]);

  // ── Countdown + capture flow ──────────
  const runCountdownAndCapture = useCallback((photoIndex) => {
    if (isCounting) return;
    clearTimeout(pendingCommitTimerRef.current);
    setPendingCapture(null);
    setIsCounting(true);

    let count = 3;
    setCountdown(count);

    const tick = () => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        countdownTimerRef.current = setTimeout(tick, 1200);
      } else {
        setCountdown(null);
        // Take photo
        const dataUrl = capturePhoto();
        if (!dataUrl) {
          setIsCounting(false);
          return;
        }

        // Flash
        setFlash(true);
        setTimeout(() => setFlash(false), 180);

        setIsCounting(false);

        // Hold this capture on screen for 2.5s so user can retry.
        setPendingCapture({ photoIndex, dataUrl });
        pendingCommitTimerRef.current = setTimeout(() => {
          commitCapturedPhoto(photoIndex, dataUrl);
        }, 2500);
      }
    };

    countdownTimerRef.current = setTimeout(tick, 1200);
  }, [isCounting, capturePhoto, commitCapturedPhoto]);

  // Loading screens — auto-advance after 2s
  useEffect(() => {
    if (step === STEPS.LOADING1) {
      const t = setTimeout(() => setStep(STEPS.LIVE2), 2400);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LOADING2) {
      const t = setTimeout(() => setStep(STEPS.LIVE3), 2400);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LOADING3) {
      const t = setTimeout(() => setStep(STEPS.LIVE4), 2400);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LOADING4) {
      const t = setTimeout(() => {
        buildStrip(finalStripSourcesRef.current).then(url => {
          setStripUrl(url);
          setLastStripUrl(url);
          setSessionStrips(prev => [...prev, url]);
          try {
            localStorage.setItem(LAST_STRIP_CACHE_KEY, url);
          } catch (err) {
            console.warn('Could not cache photostrip:', err);
          }
          setStep(STEPS.FINAL);
          stopWebcam();
        });
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Auto-start countdown when entering live steps
  useEffect(() => {
    if (step === STEPS.LIVE1) {
      const t = setTimeout(() => runCountdownAndCapture(1), 1000);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LIVE2) {
      const t = setTimeout(() => runCountdownAndCapture(2), 1000);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LIVE3) {
      const t = setTimeout(() => runCountdownAndCapture(3), 1000);
      return () => clearTimeout(t);
    }
    if (step === STEPS.LIVE4) {
      const t = setTimeout(() => runCountdownAndCapture(4), 1000);
      return () => clearTimeout(t);
    }
  }, [step]); // intentionally not including runCountdownAndCapture to avoid re-triggers

  // ── Retake ────────────────────────────
  const handleRetake = useCallback(() => {
    if (isCounting) return;
    const photoIndex = photoIndexFromStep(step);
    if (photoIndex < 1) return;
    if (!pendingCapture || pendingCapture.photoIndex !== photoIndex) return;
    clearTimeout(pendingCommitTimerRef.current);
    setPendingCapture(null);
    setTimeout(() => runCountdownAndCapture(photoIndex), 250);
  }, [isCounting, step, pendingCapture, runCountdownAndCapture]);

  // ── Build final strip canvas ──────────
  async function buildStrip(imgUrls, customFrameStyle = frameStyle) {
    return new Promise(resolve => {
      const W = 480;
      const H = 360;
      const PAD_X = 22;
      const PAD_TOP = 22;
      const PAD_BETWEEN = 14;
      const PAD_BOTTOM = 90;
      const stripCanvas = document.createElement('canvas');
      stripCanvas.width = W + PAD_X * 2;
      stripCanvas.height = PAD_TOP + (H * imgUrls.length) + (PAD_BETWEEN * (imgUrls.length - 1)) + PAD_BOTTOM;
      const ctx = stripCanvas.getContext('2d');
      paintFrameBackground(ctx, stripCanvas.width, stripCanvas.height, customFrameStyle);

      let loaded = 0;
      const imgs = imgUrls.map((url, i) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, PAD_X, PAD_TOP + i * (H + PAD_BETWEEN), W, H);
          loaded++;
          if (loaded === imgUrls.length) {
            resolve(stripCanvas.toDataURL('image/png'));
          }
        };
        img.src = url;
        return img;
      });
    });
  }

  // ── Download ──────────────────────────
  const handleDownload = () => {
    const urlToDownload = stripUrl || lastStripUrl;
    if (!urlToDownload) return;
    const a = document.createElement('a');
    a.href = urlToDownload;
    a.download = 'photobooth-strip.png';
    a.click();
  };

  // ── Try Again ─────────────────────────
  const handleTryAgain = () => {
    stopWebcam();
    clearTimeout(countdownTimerRef.current);
    clearTimeout(pendingCommitTimerRef.current);
    setStep(STEPS.HOME);
    setFilmMode(null);
    setFrameStyle('white');
    setPhotos([]);
    setStripUrl(null);
    setFlash(false);
    setCountdown(null);
    setIsCounting(false);
    setPendingCapture(null);
  };

  const handleOpenCustomize = () => {
    setStep(STEPS.CUSTOMIZE);
  };

  const handleBackToFinal = () => {
    setStep(STEPS.FINAL);
  };

  const handleChangeFrameStyle = async (styleKey) => {
    setFrameStyle(styleKey);

    const imgs = photos.filter(Boolean);
    if (imgs.length > 0) {
      const url = await buildStrip(imgs, styleKey);
      setStripUrl(url);
      setLastStripUrl(url);
      try {
        localStorage.setItem(LAST_STRIP_CACHE_KEY, url);
      } catch (err) {
        console.warn('Could not cache customized photostrip:', err);
      }
    }
  };

  const handleSelectFilm = (mode) => {
    setFilmMode(mode);
    setFrameStyle('white');
    setStep(STEPS.LIVE1);
  };

  // ── Render ────────────────────────────
  const currentPhotoIndex = photoIndexFromStep(step);
  const isLive = [STEPS.LIVE1, STEPS.LIVE2, STEPS.LIVE3, STEPS.LIVE4].includes(step);
  const isLoading = [STEPS.LOADING1, STEPS.LOADING2, STEPS.LOADING3, STEPS.LOADING4].includes(step);
  const showStripPreview = photos.filter(Boolean).length > 0 &&
    step !== STEPS.HOME && step !== STEPS.FINAL && step !== STEPS.CUSTOMIZE;

  // Photos taken before the current live step (for strip preview)
  const stripPhotos = photos.filter(Boolean);
  const previewPhotos = stripPhotos.slice(0, currentPhotoIndex - 1);

  return (
    <div className="app">
      {/* White flash overlay */}
      <div className={`flash-overlay${flash ? ' active' : ''}`} />

      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />

      <div className="stage">
        {/* Left strip preview slot (fixed width so booth never shifts) */}
        <div className="strip-preview-slot" aria-hidden={!showStripPreview || previewPhotos.length === 0}>
          {showStripPreview && previewPhotos.length > 0 ? (
            <StripPreview photos={previewPhotos} />
          ) : (
            <div className="strip-preview-empty" />
          )}
        </div>

        {/* Main booth frame */}
        <div className="booth-outer">
          <div className="booth-inner">

            {/* ── HOME ── */}
            {step === STEPS.HOME && (
              <div className="screen visible fade-enter home-screen">
                <div className="home-text">photobooth</div>
                <p className="home-sub">choose a film</p>
                <div className="home-film-options">
                  <button
                    type="button"
                    className="home-film-btn"
                    onClick={() => handleSelectFilm('COLOR_FILM')}
                  >
                    color film
                  </button>
                  <button
                    type="button"
                    className="home-film-btn"
                    onClick={() => handleSelectFilm('SEPIA')}
                  >
                    sepia
                  </button>
                  <button
                    type="button"
                    className="home-film-btn"
                    onClick={() => handleSelectFilm('BW')}
                  >
                    b&amp;w
                  </button>
                </div>
              </div>
            )}

            {/* ── LIVE CAPTURE ── */}
            {isLive && filmMode && (
              <div className="screen visible fade-enter" style={{ position: 'absolute', inset: 0 }}>
                {/* Top label */}
                <div className="top-label">smile :)</div>

                <div className="webcam-stack">
                  {pendingCapture && pendingCapture.photoIndex === currentPhotoIndex ? (
                    <img
                      src={pendingCapture.dataUrl}
                      alt={`captured preview ${currentPhotoIndex}`}
                      className="captured-frame"
                    />
                  ) : (
                    <>
                      {/* Webcam video */}
                      <video
                        ref={videoRef}
                        className="webcam-video"
                        style={{ filter: FILTER_MODES[filmMode].filter }}
                        autoPlay
                        playsInline
                        muted
                      />
                      <div
                        className={`webcam-grain webcam-grain-${filmMode.toLowerCase()}`}
                        aria-hidden
                      />
                    </>
                  )}
                </div>

                {/* Countdown overlay */}
                {countdown !== null && (
                  <div className="countdown-overlay">
                    <span className="countdown-number">{countdown}</span>
                  </div>
                )}

                {/* Photo label */}
                <div className="photo-label">photo {currentPhotoIndex}</div>

                {/* Retake button (disabled on photo 1 since it hasn't been taken yet) */}
                <button
                  className="retake-btn"
                  onClick={handleRetake}
                  disabled={isCounting || !pendingCapture || pendingCapture.photoIndex !== currentPhotoIndex}
                  title="retake"
                >
                  ↺
                </button>
              </div>
            )}

            {/* ── LOADING ── */}
            {isLoading && (
              <div className="screen visible fade-enter" style={{ position: 'absolute', inset: 0 }}>
                <div className="loading-screen">
                  <Spinner />
                  {step === STEPS.LOADING4 && (
                    <div className="loading-message">creating photostrip...</div>
                  )}
                </div>
                <div className="photo-label">
                  {step === STEPS.LOADING4
                    ? 'processing'
                    : `photo ${step === STEPS.LOADING1 ? 1 : step === STEPS.LOADING2 ? 2 : 3}`}
                </div>
              </div>
            )}

            {/* ── FINAL ── */}
            {step === STEPS.FINAL && (
              <div className="screen visible fade-enter" style={{ position: 'absolute', inset: 0 }}>
                <div className="final-content">
                  {/* Photo strip */}
                  <div className="final-strip" style={getFramePreviewStyle(frameStyle)}>
                    {photos.filter(Boolean).map((src, i) => (
                      <img key={i} src={src} alt={`photo ${i + 1}`} />
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="final-actions">
                    <div className="final-actions-title">all done!</div>
                    <button className="final-action-btn" onClick={handleDownload}>
                      <span className="btn-icon">↓</span>
                      <span>download</span>
                    </button>
                    <button className="final-action-btn" onClick={handleOpenCustomize}>
                      <span className="btn-icon">✦</span>
                      <span>customize</span>
                    </button>
                    <button className="final-action-btn" onClick={handleTryAgain}>
                      <span className="btn-icon">↺</span>
                      <span>try again</span>
                    </button>
                  </div>
                </div>
                {sessionStrips.length >= 2 && (
                  <div className="last-strip-corner">
                    <img src={sessionStrips[sessionStrips.length - 2]} alt="last photostrip in this session" />
                  </div>
                )}
              </div>
            )}

            {/* ── CUSTOMIZE ── */}
            {step === STEPS.CUSTOMIZE && (
              <div className="screen visible fade-enter" style={{ position: 'absolute', inset: 0 }}>
                <div className="final-content">
                  <div className="final-strip" style={getFramePreviewStyle(frameStyle)}>
                    {photos.filter(Boolean).length > 0 ? (
                      photos.filter(Boolean).map((src, i) => (
                        <img key={i} src={src} alt={`photo ${i + 1}`} className="customize-strip-preview" />
                      ))
                    ) : (
                      <div className="customize-empty">no strip yet</div>
                    )}
                  </div>

                  <div className="final-actions">
                    <div className="final-actions-title">customize</div>
                    <div className="color-options">
                      {FRAME_OPTIONS.map(option => (
                        <button
                          key={option.key}
                          className={`color-chip ${option.key}${frameStyle === option.key ? ' active' : ''}`}
                          onClick={() => handleChangeFrameStyle(option.key)}
                          title={option.label}
                        />
                      ))}
                    </div>
                    <button className="final-action-btn" onClick={handleBackToFinal}>
                      <span className="btn-icon">←</span>
                      <span>back</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>{/* /booth-inner */}
        </div>{/* /booth-outer */}
      </div>{/* /stage */}
    </div>
  );
}

// ── Mount ──────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
