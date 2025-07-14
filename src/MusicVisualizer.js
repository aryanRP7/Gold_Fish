import React, { useState, useRef, useEffect } from 'react';
import { playlist } from './playlist';
import './MusicVisualizer.css';

const emojis = ['😄', '🌻', '😍', '🥰', '😘', '✨', '💞', '🌻', '❤️', '😻', '💙', '🤩', '🦚','🌻', '🧋'];

const formatTime = (time) => {
  const minutes = Math.floor(time / 60).toString().padStart(2, '0');
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const MusicVisualizer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [emojiElements, setEmojiElements] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  const currentSong = playlist[currentSongIndex];

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const stars = useRef([]);
  const animationRef = useRef(null);

  // Floating emojis
  useEffect(() => {
    const maxEmojis = 50;
    let count = 0;
    const interval = setInterval(() => {
      if (count >= maxEmojis) return clearInterval(interval);
      const style = {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        fontSize: `${Math.random() * 2 + 1.2}rem`,
        animationDuration: `${Math.random() * 15 + 10}s`,
        animationDelay: `${Math.random() * 2}s`,
      };
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      setEmojiElements(prev => [
        ...prev,
        <span key={count} className="floating-emoji" style={style}>
          {emoji}
        </span>,
      ]);
      count++;
    }, 250);
    return () => clearInterval(interval);
  }, []);

  // Starfield when playing
  useEffect(() => {
    if (isPlaying) {
      initStars();
      drawStars();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  // Audio progress & auto-advance
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    };
    const handleSongEnd = () => {
      const nextIndex = (currentSongIndex + 1) % playlist.length;
      setCurrentSongIndex(nextIndex);
      setIsPlaying(true);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('ended', handleSongEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('ended', handleSongEnd);
    };
  }, [isDragging, currentSongIndex]);

  // Drag-to-seek handlers
  const getSeekTime = e => {
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.min(Math.max((x - rect.left) / rect.width, 0), 1);
    return pct * duration;
  };
  const handleDragStart = e => {
    setIsDragging(true);
    setCurrentTime(getSeekTime(e));
  };
  const handleDragging = e => {
    if (!isDragging) return;
    setCurrentTime(getSeekTime(e));
  };
  const handleDragEnd = e => {
    if (!isDragging) return;
    const t = getSeekTime(e);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
    setIsDragging(false);
  };
  useEffect(() => {
    const stop = () => setIsDragging(false);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, []);

  // Initialize star positions
  const initStars = () => {
    const w = window.innerWidth, h = window.innerHeight;
    stars.current = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }));
  };

  // Draw starfield
  const drawStars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const cx = w / 2, cy = h / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    for (const star of stars.current) {
      star.z -= 2;
      if (star.z <= 0) {
        star.z = w;
        star.x = (Math.random() - 0.5) * w;
        star.y = (Math.random() - 0.5) * h;
      }
      const k = 128.0 / star.z;
      const x = star.x * k + cx;
      const y = star.y * k + cy;
      const size = (1 - star.z / w) * 3;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, 'white');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(drawStars);
  };

  // Play/pause toggle
  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else audio.play();
    setIsPlaying(!isPlaying);
  };

  // Prev / Next / Song change
  const handlePrev = () => {
    const idx = (currentSongIndex - 1 + playlist.length) % playlist.length;
    setCurrentSongIndex(idx);
    setIsPlaying(true);
  };
  const handleNext = () => {
    const idx = (currentSongIndex + 1) % playlist.length;
    setCurrentSongIndex(idx);
    setIsPlaying(true);
  };
  const handleSongChange = idx => {
    setCurrentSongIndex(idx);
    setIsPlaying(true);
  };

  // ⌨️ Spacebar handler for play/pause only
  useEffect(() => {
    const onKey = e => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) audio.play();
        else audio.pause();
        setIsPlaying(!audio.paused);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying]);

  return (
    <div className={`container ${isPlaying ? 'stars' : 'emoji-wall'}`}>
      <audio ref={audioRef} src={currentSong.src} autoPlay={isPlaying} />
      {!isPlaying && <div className="emoji-layer">{emojiElements}</div>}
      {isPlaying && <canvas ref={canvasRef} className="star-canvas" />}

      {/* Central Play/Pause */}
      <button className="music-button" onClick={handleToggle}>
        {isPlaying ? '⏸️' : '▶️'}
      </button>

      {isPlaying && (
        <>
          {/* Skip & Dropdown Controls */}
          <button className="skip-button prev" onClick={handlePrev}>⏮️</button>
          <div className="song-dropdown">
            <select
              value={currentSongIndex}
              onChange={e => handleSongChange(Number(e.target.value))}
            >
              {playlist.map((song, i) => (
                <option key={i} value={i}>
                  {song.name}
                </option>
              ))}
            </select>
          </div>
          <button className="skip-button next" onClick={handleNext}>⏭️</button>

          {/* Progress Bar */}
          <div
            className="progress-container"
            ref={progressRef}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragging}
            onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragging}
            onTouchEnd={handleDragEnd}
          >
            <div
              className="progress-bar"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Time & Duration */}
          <div className="time-info">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicVisualizer;
