import React, { useState, useRef, useEffect, useCallback } from "react";
import { playlist } from "./playlist";
import { FaPlay } from "react-icons/fa";
import { FaPause } from "react-icons/fa6";
import {
  TbRewindBackward10,
  TbRewindForward30,
  TbArrowsShuffle,
} from "react-icons/tb";
import { IoIosArrowForward, IoIosArrowBack } from "react-icons/io";
import "./MusicVisualizer.css";

const emojis = [
  "😄",
  "🌻",
  "😍",
  "🥰",
  "😘",
  "✨",
  "💞",
  "🌻",
  "❤️",
  "😻",
  "💙",
  "🤩",
  "🦚",
  "🌻",
  "🧋",
];

const formatTime = (time) => {
  const minutes = Math.floor(time / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const MusicVisualizer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [emojiElements, setEmojiElements] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState([]); // kept for compatibility, but not required

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const stars = useRef([]);
  const animationRef = useRef(null);

  // History stack + pointer
  const playHistory = useRef([]);
  const historyPointer = useRef(-1);
  const navigatingHistory = useRef(false);

  // prevPlaylistPointer removed — we'll use shuffleOrder when shuffle is on
  // Persistent shuffle order and pointer (works in circular manner)
  const shuffleOrder = useRef(null); // array of indices representing the shuffle cycle
  const shufflePtr = useRef(0); // index inside shuffleOrder pointing to the currentSongIndex

  const currentSong = playlist[currentSongIndex];

  const pushToHistory = (idx) => {
    if (navigatingHistory.current) return;
    const h = playHistory.current;
    const p = historyPointer.current;

    if (p < h.length - 1) {
      h.splice(p + 1);
    }

    if (h.length === 0 || h[h.length - 1] !== idx) {
      h.push(idx);
      historyPointer.current = h.length - 1;
    } else {
      historyPointer.current = h.length - 1;
    }
  };

  const flashButton = (e) => {
    const btn = e.currentTarget;
    if (btn.classList.contains("shuffle-icon") && isShuffle) return;
    btn.classList.add("btn-flash");
    setTimeout(() => btn.classList.remove("btn-flash"), 700);
  };

  const handleRewind = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration)) return;
    audio.currentTime = Math.min(audio.currentTime + 30, audio.duration);
  };

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
      setEmojiElements((prev) => [
        ...prev,
        <span key={count} className="floating-emoji" style={style}>
          {emoji}
        </span>,
      ]);
      count++;
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const initStars = useCallback(() => {
    const w = window.innerWidth,
      h = window.innerHeight;
    stars.current = Array.from({ length: 800 }, () => ({
      x: (Math.random() - 0.5) * w,
      y: (Math.random() - 0.5) * h,
      z: Math.random() * w,
    }));
  }, []);

  const drawStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);
    const cx = w / 2,
      cy = h / 2;

    ctx.fillStyle = "#000";
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
      grad.addColorStop(0, "white");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(drawStars);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      initStars();
      drawStars();
    } else {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying, drawStars, initStars]);

  const getSeekTime = (e) => {
    if (!progressRef.current || !duration) return currentTime;

    const rect = progressRef.current.getBoundingClientRect();
    let clientX;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].pageX; // ✅ use pageX for mobile accuracy
    } else {
      clientX = e.pageX;
    }

    // calculate progress
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.min(Math.max(pct, 0), 1); // clamp between 0 and 1

    // sometimes iOS sends weird jumps on quick drags — dampen them
    if (pct >= 0.995) pct = 0.995;

    return pct * duration;
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    setCurrentTime(getSeekTime(e));
  };
  const handleDragging = (e) => {
    if (!isDragging) return;
    setCurrentTime(getSeekTime(e));
  };
  const handleDragEnd = (e) => {
    if (!isDragging) return;
    const t = getSeekTime(e);
    audioRef.current.currentTime = t;
    setCurrentTime(t);
    setIsDragging(false);
  };
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      setCurrentTime(getSeekTime(e));
    };

    const handleUp = (e) => {
      if (!isDragging) return;
      const t = getSeekTime(e);
      audioRef.current.currentTime = t;
      setCurrentTime(t);
      setIsDragging(false);
      document.body.style.cursor = ""; // reset cursor
    };

    if (isDragging) {
      document.body.style.cursor = "grabbing";
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchend", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
      document.body.style.cursor = "";
    };
  }, [isDragging]);

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause();
    else {
      audio.play();
    } 
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration || 0);
      }
    };

    const onEnded = () => {
      handleNext();
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("ended", onEnded);
    };
  }, [isDragging, duration, shuffledQueue, isShuffle, currentSongIndex]);

  // build a deterministic shuffle order that starts with currentSongIndex
  const buildShuffleOrder = (currentIdx) => {
    const order = playlist.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // move currentIdx to the front (preserve relative order for the rest)
    const curPos = order.indexOf(currentIdx);
    if (curPos !== -1) {
      order.splice(curPos, 1);
    }
    return [currentIdx, ...order];
  };

  const handleShuffleToggle = () => {
    setIsShuffle((prev) => {
      const newState = !prev;
      if (newState) {
        // generate persistent shuffle order
        const order = buildShuffleOrder(currentSongIndex);
        shuffleOrder.current = order;
        shufflePtr.current = 0; // pointing to currentSongIndex at position 0
        // keep shuffledQueue for compatibility (not used for traversal now)
        setShuffledQueue(order.slice(1));
        pushToHistory(currentSongIndex);
      } else {
        shuffleOrder.current = null;
        shufflePtr.current = 0;
        setShuffledQueue([]);
      }
      return newState;
    });
  };

  const handleNext = () => {
    let nextIndex;

    if (isShuffle) {
      if (!shuffleOrder.current || shuffleOrder.current.length === 0) {
        // first time or reset case
        shuffleOrder.current = buildShuffleOrder(currentSongIndex);
        shufflePtr.current = 0;
      }

      // move forward
      shufflePtr.current += 1;

      // ✅ if reached end, rebuild new shuffle order for next cycle
      if (shufflePtr.current >= shuffleOrder.current.length) {
        shuffleOrder.current = buildShuffleOrder(currentSongIndex);
        shufflePtr.current = 1; // start right after current song
      }

      nextIndex = shuffleOrder.current[shufflePtr.current];
    } else {
      // normal (non-shuffle) mode
      nextIndex = (currentSongIndex + 1) % playlist.length;
    }

    navigatingHistory.current = false;
    setCurrentSongIndex(nextIndex);
    pushToHistory(nextIndex);
    setIsPlaying(true);
  };

  // handlePrev: respects history; if history exhausted -> traverse circularly
  const handlePrev = () => {
    const audio = audioRef.current;
    if (!audio) return;

    // ✅ 3-second rule: If current time > 3s, restart same song
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const h = playHistory.current;
    let p = historyPointer.current;

    if (p > 0) {
      // step back in history
      navigatingHistory.current = true;
      historyPointer.current = p - 1;
      const prevIndex = h[historyPointer.current];
      setCurrentSongIndex(prevIndex);
      setIsPlaying(true);
      setTimeout(() => (navigatingHistory.current = false), 0);

      // keep shuffle pointer synced if active
      if (isShuffle && shuffleOrder.current) {
        const pos = shuffleOrder.current.indexOf(prevIndex);
        if (pos !== -1) shufflePtr.current = pos;
      }
    } else {
      // history exhausted -> circular traversal
      navigatingHistory.current = false;

      if (
        isShuffle &&
        shuffleOrder.current &&
        Array.isArray(shuffleOrder.current)
      ) {
        shufflePtr.current =
          (shufflePtr.current - 1 + shuffleOrder.current.length) %
          shuffleOrder.current.length;
        const prevIdx = shuffleOrder.current[shufflePtr.current];
        setCurrentSongIndex(prevIdx);
        setIsPlaying(true);
      } else {
        const prevIdx =
          (currentSongIndex - 1 + playlist.length) % playlist.length;
        setCurrentSongIndex(prevIdx);
        setIsPlaying(true);
      }
    }
  };

  const handleSongChange = (idx) => {
    navigatingHistory.current = false;
    setCurrentSongIndex(idx);
    pushToHistory(idx);
    setIsPlaying(true);

    // If shuffle is on, rebuild shuffleOrder to start from the chosen song
    if (isShuffle) {
      const order = buildShuffleOrder(idx);
      shuffleOrder.current = order;
      shufflePtr.current = 0;
      setShuffledQueue(order.slice(1));
    } else {
      shuffleOrder.current = null;
      shufflePtr.current = 0;
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) audio.play();
        else audio.pause();
        setIsPlaying(!audio.paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // push initial song in history on mount
    pushToHistory(currentSongIndex);
  }, []);

  // keep shufflePtr synced if currentSongIndex changes by other means (safety)
  useEffect(() => {
    if (isShuffle && shuffleOrder.current) {
      const pos = shuffleOrder.current.indexOf(currentSongIndex);
      if (pos !== -1) shufflePtr.current = pos;
    }
  }, [currentSongIndex, isShuffle]);

  return (
    <div className={`container ${isPlaying ? "stars" : "emoji-wall"}`}>
      <audio ref={audioRef} src={currentSong.src} autoPlay={isPlaying} />
      {!isPlaying && <div className="emoji-layer">{emojiElements}</div>}
      {isPlaying && <canvas ref={canvasRef} className="star-canvas" />}

      <button
        className="music-button"
        onClick={(e) => {
          handleToggle();
          flashButton(e);
        }}
      >
        {isPlaying ? <FaPause /> : <FaPlay />}
      </button>

      {isPlaying && (
        <>
          <button
            className="skip-button prev"
            onClick={(e) => {
              handlePrev();
              flashButton(e);
            }}
          >
            <IoIosArrowBack />
          </button>
          <button
            className="skip-button next"
            onClick={(e) => {
              handleNext();
              flashButton(e);
            }}
          >
            <IoIosArrowForward />
          </button>

          <div
            className={`progress-container ${
              isDragging ? "dragging" : isPlaying ? "active" : ""
            }`}
            ref={progressRef}
            onMouseDown={handleDragStart}
            onTouchStart={(e) => {
              e.preventDefault(); // stop scroll interference
              handleDragStart(e);
            }}
          >
            <div
              className="progress-bar"
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>

          <div className="time-info">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="seek-controls">
            <button
              className="seek-button"
              onClick={(e) => {
                handleRewind();
                flashButton(e);
              }}
            >
              <TbRewindBackward10 />
            </button>
            <button
              className="seek-button"
              onClick={(e) => {
                handleForward();
                flashButton(e);
              }}
            >
              <TbRewindForward30 />
            </button>
          </div>

          <div className="song-dropdown">
            <select
              value={currentSongIndex}
              onChange={(e) => handleSongChange(Number(e.target.value))}
            >
              {playlist.map((song, i) => (
                <option key={i} value={i}>
                  {song.name}
                </option>
              ))}
            </select>
          </div>

          <div className="shuffle-button">
            <button
              onClick={handleShuffleToggle}
              className={`shuffle-icon ${isShuffle ? "active" : ""}`}
            >
              <TbArrowsShuffle />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicVisualizer;
