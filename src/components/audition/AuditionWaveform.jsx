import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useThemeStore } from '../../store';
import styles from './AuditionWaveform.module.css';

/**
 * @param {object} props
 * @param {string} [props.url]
 * @param {string|number} props.auditionId
 * @param {(id: string|number) => void} props.onPlay
 * @param {(id: string|number, ws: import('wavesurfer.js').default) => void} [props.onInstanceReady]
 * @param {(id: string|number) => void} [props.onInstanceDestroy]
 * @param {(sec: number) => void} [props.onDuration]
 * @param {() => void} [props.onWaveError]
 * @param {string} [props.className]
 */
export function AuditionWaveform({
  url,
  auditionId,
  onPlay,
  onInstanceReady,
  onInstanceDestroy,
  onDuration,
  onWaveError,
  className,
}) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const onPlayRef = useRef(onPlay);
  const onDurationRef = useRef(onDuration);
  const onWaveErrorRef = useRef(onWaveError);
  const onInstanceReadyRef = useRef(onInstanceReady);
  const onInstanceDestroyRef = useRef(onInstanceDestroy);
  const [playing, setPlaying] = useState(false);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onDurationRef.current = onDuration;
    onWaveErrorRef.current = onWaveError;
    onInstanceReadyRef.current = onInstanceReady;
    onInstanceDestroyRef.current = onInstanceDestroy;
  }, [onPlay, onDuration, onWaveError, onInstanceReady, onInstanceDestroy]);

  useEffect(() => {
    if (!url || !containerRef.current) return undefined;

    const el = containerRef.current;
    const cs = getComputedStyle(document.documentElement);
    const progressColor = cs.getPropertyValue('--brand-accent').trim() || '#f9d423';
    const r = cs.getPropertyValue('--brand-accent-r').trim() || '249';
    const g = cs.getPropertyValue('--brand-accent-g').trim() || '212';
    const b = cs.getPropertyValue('--brand-accent-b').trim() || '35';
    const waveColor =
      theme === 'ocean' ? 'rgba(168, 197, 212, 0.22)' : `rgba(${r}, ${g}, ${b}, 0.2)`;
    const cursorColor = `rgba(${r}, ${g}, ${b}, 0.9)`;

    const ws = WaveSurfer.create({
      container: el,
      url,
      height: 44,
      waveColor,
      progressColor,
      cursorColor,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      dragToSeek: true,
      normalize: true,
    });

    wsRef.current = ws;

    const handlePlay = () => {
      setPlaying(true);
      onPlayRef.current(auditionId);
    };
    const handlePause = () => setPlaying(false);
    const handleFinish = () => setPlaying(false);
    const handleReady = (dur) => onDurationRef.current?.(dur);
    const handleError = () => onWaveErrorRef.current?.();

    const unsubPlay = ws.on('play', handlePlay);
    const unsubPause = ws.on('pause', handlePause);
    const unsubFinish = ws.on('finish', handleFinish);
    const unsubReady = ws.on('ready', handleReady);
    const unsubErr = ws.on('error', handleError);

    onInstanceReadyRef.current?.(auditionId, ws);

    return () => {
      unsubPlay();
      unsubPause();
      unsubFinish();
      unsubReady();
      unsubErr();
      wsRef.current = null;
      setPlaying(false);
      onInstanceDestroyRef.current?.(auditionId);
      ws.destroy();
    };
  }, [url, auditionId, theme]);

  const togglePlay = () => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.isPlaying()) {
      ws.pause();
    } else {
      ws.play();
    }
  };

  if (!url) {
    return (
      <div className={className} style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Audio yo‘q</span>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.playBtn}
        aria-label={playing ? 'Pauza' : 'Ijro etish'}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      >
        {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} style={{ marginLeft: 2 }} fill="currentColor" />}
      </button>
      <div ref={containerRef} className={styles.wave} />
    </div>
  );
}
