import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import styles from './AuditionVideoPlayer.module.css';

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * @param {object} props
 * @param {string} props.src
 * @param {string|number} props.auditionId
 * @param {string} [props.title]
 * @param {() => void} props.onPlayStart
 * @param {(id: string|number, el: HTMLVideoElement | null) => void} [props.registerVideo]
 */
export function AuditionVideoPlayer({ src, auditionId, title, onPlayStart, registerVideo }) {
  const shellRef = useRef(null);
  const videoRef = useRef(null);
  const onPlayStartRef = useRef(onPlayStart);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const progressRef = useRef(null);

  useEffect(() => {
    onPlayStartRef.current = onPlayStart;
  }, [onPlayStart]);

  const setVideoRef = useCallback(
    (el) => {
      videoRef.current = el;
      registerVideo?.(auditionId, el);
    },
    [auditionId, registerVideo]
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onPlay = () => {
      setPlaying(true);
      onPlayStartRef.current?.();
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onEnded = () => setPlaying(false);

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onDur);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onDur);
      v.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  const seekFromClientX = (clientX) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = x * duration;
  };

  return (
    <div ref={shellRef} className={styles.shell}>
      <span className={styles.badge}>Video</span>
      <video
        ref={setVideoRef}
        className={styles.video}
        src={src}
        playsInline
        muted={muted}
        preload="metadata"
        onClick={togglePlay}
      />

      <div className={`${styles.overlayPlay} ${!playing ? styles.visible : ''}`}>
        <button type="button" className={styles.bigPlay} aria-label="Ijro" onClick={togglePlay}>
          <Play size={26} style={{ marginLeft: 4 }} fill="currentColor" />
        </button>
      </div>

      <div className={styles.bottomBar}>
        {title ? <div className={styles.titleRow}>{title}</div> : null}
        <div className={styles.controlsRow}>
          <button
            type="button"
            className={styles.smallBtn}
            aria-label={playing ? 'Pauza' : 'Ijro'}
            onClick={togglePlay}
          >
            {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
          <div
            ref={progressRef}
            className={styles.progressWrap}
            role="slider"
            tabIndex={0}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={current}
            onClick={(e) => seekFromClientX(e.clientX)}
            onKeyDown={(e) => {
              const v = videoRef.current;
              if (!v || !duration) return;
              if (e.key === 'ArrowRight') v.currentTime = Math.min(duration, v.currentTime + 5);
              if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 5);
            }}
          >
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.time}>
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <button
            type="button"
            className={styles.smallBtn}
            aria-label={muted ? 'Ovozni yoqish' : 'Ovozni o‘chirish'}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            className={styles.smallBtn}
            aria-label="To‘liq ekran"
            onClick={() => {
              const node = shellRef.current;
              if (!node) return;
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                node.requestFullscreen?.().catch(() => {});
              }
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
