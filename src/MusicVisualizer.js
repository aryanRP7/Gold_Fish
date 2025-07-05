import React, { useState, useRef, useEffect } from 'react'; 
import song from './assets/song.mp3';
import './MusicVisualizer.css';

const emojis = ['😄', '🌻', '😍', '🥰', '😘', '💌', '💞', '❤️', '💛', '💚', '💙', '💜', '🦚', '🍿', '🧋'];

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const MusicVisualizer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [emojiElements, setEmojiElements] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const stars = useRef([]);
  const animationRef = useRef(null);

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

  useEffect(() => {
    if (isPlaying) {
      initStars();
      drawStars();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    };

    if (audio) {
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', updateProgress);
    }

    return () => {
      if (audio) {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('loadedmetadata', updateProgress);
      }
    };
  }, [isDragging]);

  const getSeekTime = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const percent = Math.min(Math.max((x - rect.left) / rect.width, 0), 1);
    return percent * duration;
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    const time = getSeekTime(e);
    setCurrentTime(time);
  };

  const handleDragging = (e) => {
    if (!isDragging) return;
    const time = getSeekTime(e);
    setCurrentTime(time);
  };

  const handleDragEnd = (e) => {
    if (!isDragging) return;
    const time = getSeekTime(e);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    setIsDragging(false);
  };

  useEffect(() => {
    const stopDragging = () => setIsDragging(false);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchend', stopDragging);
    return () => {
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
    };
  }, []);

  const initStars = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stars.current = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }));
  };

  const drawStars = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const cx = w / 2;
    const cy = h / 2;

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

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(drawStars);
  };

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`container ${isPlaying ? 'stars' : 'emoji-wall'}`}>
      <audio ref={audioRef} src={song} />
      {!isPlaying && <div className="emoji-layer">{emojiElements}</div>}
      {isPlaying && <canvas ref={canvasRef} className="star-canvas" />}
      <button className="music-button" onClick={handleToggle}>
        {isPlaying ? '⏸️' : '▶️'}
      </button>

      {isPlaying && (
        <>
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
