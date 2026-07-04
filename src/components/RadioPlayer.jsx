import { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Plus, Trash2, Play, Pause, SkipForward, Volume2, VolumeX, Music2, X, RadioTower, Clock, Sunset } from 'lucide-react';

const BUILTIN_TRACKS = [
  { id: 'b1', title: '内置 · 自习轻音乐', artist: 'Web Audio · 无需网络', url: 'builtin:piano' },
  { id: 'b2', title: '内置 · 晚安氛围', artist: 'Web Audio · 无需网络', url: 'builtin:ambient' },
];

const DEFAULT_EXTERNAL = [
  { id: 's1', title: 'SoundHelix · 轻音乐', artist: '公开测试曲', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 's2', title: 'SoundHelix · 电子氛围', artist: '公开测试曲', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 's3', title: 'SoundHelix · 专注', artist: '公开测试曲', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 's4', title: 'SampleLib · 合成旋律', artist: '公开测试曲', url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3' },
  { id: 's5', title: 'Kozco · 钢琴片段', artist: '公开测试曲', url: 'https://www.kozco.com/tech/piano2-CoolEdit.mp3' },
];

const DEFAULT_CLOSING = [
  { id: 'c1', title: '晚安氛围 · 闭馆', artist: 'Web Audio · 无需网络', url: 'builtin:ambient' },
  { id: 'c2', title: 'SoundHelix · 晚安曲', artist: '公开测试曲', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 'c3', title: 'SampleLib · 结尾', artist: '公开测试曲', url: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3' },
];

const STORAGE_KEY = 'studyRadioStation';

function loadStation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        isLive: false,
        currentIndex: -1,
        volume: 0.65,
        adminUrl: '',
        queue: [...DEFAULT_EXTERNAL, ...BUILTIN_TRACKS],
        closingQueue: [...DEFAULT_CLOSING, ...BUILTIN_TRACKS],
      };
    }
    let parsed = JSON.parse(raw);
    return {
      isLive: false,
      currentIndex: -1,
      volume: 0.65,
      adminUrl: '',
      ...parsed,
      queue: parsed.queue || [...DEFAULT_EXTERNAL, ...BUILTIN_TRACKS],
      closingQueue: parsed.closingQueue || [...DEFAULT_CLOSING, ...BUILTIN_TRACKS],
    };
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && raw.length > 0) {
        const trimmed = raw.trim();
        if (trimmed.endsWith('}')) {
          const lastOpenBrace = trimmed.lastIndexOf('{');
          if (lastOpenBrace !== -1) {
            const partial = trimmed.substring(0, lastOpenBrace + 1);
            try {
              const parsed = JSON.parse(partial);
              return {
                isLive: false,
                currentIndex: -1,
                volume: 0.65,
                adminUrl: '',
                ...parsed,
                queue: parsed.queue || [...DEFAULT_EXTERNAL, ...BUILTIN_TRACKS],
                closingQueue: parsed.closingQueue || [...DEFAULT_CLOSING, ...BUILTIN_TRACKS],
              };
            } catch {}
          }
        }
      }
    } catch {}
    return {
      isLive: false,
      currentIndex: -1,
      volume: 0.65,
      adminUrl: '',
      queue: [...DEFAULT_EXTERNAL, ...BUILTIN_TRACKS],
      closingQueue: [...DEFAULT_CLOSING, ...BUILTIN_TRACKS],
    };
  }
}

function saveStation(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}

const isBuiltin = (u) => typeof u === 'string' && u.startsWith('builtin:');

class WebAudioEngine {
  constructor(onTick) {
    this.onTick = onTick;
    this.ctx = null;
    this.master = null;
    this.kind = null;
    this.timer = null;
    this.startedAt = 0;
    this.started = false;
    this.activeNodes = [];
  }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.master.gain.value = 0;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }
  setVolume(v) {
    if (this.master && this.ctx) this.master.gain.value = v;
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.master && this.ctx) {
      try {
        this.master.gain.cancelScheduledValues(this.ctx.currentTime);
        this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      } catch {}
    }
    for (const n of this.activeNodes) { try { if (n.stop) n.stop(); } catch {} }
    this.activeNodes = [];
    this.started = false;
    if (this.onTick) this.onTick({ time: 0, duration: 0 });
  }
  play(kind, volume) {
    if (!this.ensure()) return false;
    this.stop();
    this.kind = kind;
    this.startedAt = Date.now();
    this.started = true;

    const ctx = this.ctx;
    const master = this.master;
    const masterPeak = volume * 0.22;
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(masterPeak, ctx.currentTime + 1.2);

    const makeNote = (freq, durSec, peak) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.18);
      g.gain.linearRampToValueAtTime(peak * 0.3, now + durSec * 0.6);
      g.gain.linearRampToValueAtTime(0.0005, now + durSec);
      osc.connect(g); g.connect(master);
      osc.start(now);
      osc.stop(now + durSec + 0.25);
      this.activeNodes.push(osc);
    };

    const makePad = (freq, durSec, peak, offsetSec = 0) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const now = ctx.currentTime + offsetSec;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + durSec * 0.55);
      g.gain.linearRampToValueAtTime(peak * 0.9, now + durSec * 0.9);
      g.gain.linearRampToValueAtTime(0.0005, now + durSec);
      osc.connect(g); g.connect(master);
      osc.start(now);
      osc.stop(now + durSec + 0.25);
      this.activeNodes.push(osc);
    };

    if (kind === 'ambient') {
      // Slow drone pad — no transient at all
      makePad(110.00, 16, 0.40);
      makePad(146.83, 16, 0.28, 2.0);
      makePad(196.00, 16, 0.22, 4.0);
      makePad(261.63, 16, 0.16, 6.0);
      this.timer = setInterval(() => {
        if (!this.started) return;
        makePad(164.81, 16, 0.35);
        makePad(220.00, 16, 0.22, 2.2);
        makePad(329.63, 16, 0.14, 4.4);
        const t = (Date.now() - this.startedAt) / 1000;
        if (this.onTick) this.onTick({ time: t, duration: Math.max(t + 20, 180) });
      }, 9000);
      if (this.onTick) this.onTick({ time: 0, duration: 180 });
      return true;
    }

    if (kind === 'piano') {
      const scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
      let idx = 0;
      const tick = () => {
        if (!this.started) return;
        const n = scale[idx % scale.length];
        idx += 1;
        makeNote(n, 4.5, 0.70);
        makeNote(n / 2, 4.5, 0.25);
        if (idx % 5 === 0) {
          makeNote(n * 1.5, 5.5, 0.22);
        }
        const t = (Date.now() - this.startedAt) / 1000;
        if (this.onTick) this.onTick({ time: t, duration: Math.max(t + 40, 240) });
      };
      tick();
      this.timer = setInterval(tick, 1700);
      return true;
    }

    return true;
  }
}

function NowPlaying({ queue, currentIndex, isLive }) {
  if (!isLive || currentIndex < 0 || !queue[currentIndex]) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <RadioTower className="w-5 h-5 text-gray-500" />
        </div>
        <div className="text-xs text-gray-400 hidden sm:block">自习室电台 · {isLive ? '直播中' : '已暂停'}</div>
      </div>
    );
  }
  const cur = queue[currentIndex];
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
        <Music2 className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 hidden sm:block">
        <div className={`font-medium truncate ${isLive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{cur.title}</div>
        <div className="text-xs text-gray-500 truncate">{cur.artist}</div>
      </div>
    </div>
  );
}

function MiniBar({ onOpen, isDark }) {
  const [now, setNow] = useState(new Date().getHours());
  const [station, setStation] = useState(() => loadStation());
  useEffect(() => {
    const t = setInterval(() => { setNow(new Date().getHours()); setStation(loadStation()); }, 30000);
    return () => clearInterval(t);
  }, []);
  const closingHours = now >= 22 || now < 1;
  const cur = station.isLive && station.currentIndex >= 0
    ? (station.queue[station.currentIndex] || station.closingQueue[station.currentIndex])
    : null;
  const liveTitle = cur ? cur.title : closingHours ? '闭馆音乐' : '自习室电台';

  return (
    <button
      onClick={onOpen}
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-3 pl-2 pr-4 py-2 rounded-full shadow-lg border cursor-pointer transition-all hover:scale-[1.02] ${
        closingHours
          ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white border-indigo-400'
          : station.isLive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400'
            : (isDark ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200')
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
        {closingHours ? <Sunset className="w-4 h-4" /> : station.isLive ? <RadioTower className="w-4 h-4 animate-pulse" /> : <Radio className="w-4 h-4" />}
      </div>
      <span className="text-sm font-medium max-w-[180px] truncate">{liveTitle}</span>
      {station.isLive && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />}
    </button>
  );
}

function RadioPlayerModal({ onClose, isDark, isAdmin }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
        <RadioPanel isDark={isDark} isAdmin={isAdmin} onClose={onClose} />
      </div>
    </div>
  );
}

export function RadioMiniBar({ isDark }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MiniBar onOpen={() => setOpen(true)} isDark={isDark} />
      {open && <RadioPlayerModal onClose={() => setOpen(false)} isDark={isDark} isAdmin={false} />}
    </>
  );
}

export default function RadioPlayer({ isDark, isAdmin }) {
  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-4xl mx-auto ${isDark ? 'text-white' : 'text-gray-800'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">自习室电台</h1>
            {isAdmin && (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                管理员控制台 · 全站同步播放
              </p>
            )}
          </div>
        </div>

        <RadioPanel isDark={isDark} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function RadioPanel({ isDark, isAdmin, onClose }) {
  const [station, setStation] = useState(() => loadStation());
  const [localUrl, setLocalUrl] = useState(station.adminUrl || '');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState('normal');
  const [engineKind, setEngineKind] = useState('idle');

  const htmlAudioRef = useRef(null);
  const webAudioRef = useRef(null);
  const modeRef = useRef(mode);
  const stationRef = useRef(station);
  const saveFailedRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { 
    stationRef.current = station; 
    const ok = saveStation(station);
    saveFailedRef.current = !ok;
    if (!ok && !error) {
      setError('存储空间不足，本地音乐无法持久保存。刷新后可能丢失，建议使用较小的音频文件或在线链接。');
    }
  }, [station]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const s = loadStation();
        if (s.queue && s.queue.length > 0) {
          setStation(prev => {
            const prevQueue = prev.queue || [];
            const newQueue = s.queue || [];
            
            const prevHasLocal = prevQueue.some(item => item.isLocal || (item.url && item.url.startsWith('data:')));
            const newHasLocal = newQueue.some(item => item.isLocal || (item.url && item.url.startsWith('data:')));
            
            if (prevHasLocal && !newHasLocal) {
              return prev;
            }
            
            return {
              ...prev,
              queue: newQueue,
              closingQueue: s.closingQueue,
              volume: s.volume,
              adminUrl: s.adminUrl,
            };
          });
        }
      } catch {
        console.warn('Failed to load station from storage');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const stopAll = useCallback(() => {
    if (webAudioRef.current) { webAudioRef.current.stop(); }
    if (htmlAudioRef.current) {
      try { htmlAudioRef.current.pause(); htmlAudioRef.current.removeAttribute('src'); htmlAudioRef.current.load(); } catch {}
    }
    setEngineKind('idle');
    setCurrentTime(0);
  }, []);

  const seekTo = useCallback((time) => {
    if (engineKind === 'html' && htmlAudioRef.current) {
      try {
        htmlAudioRef.current.currentTime = time;
        setCurrentTime(time);
      } catch (e) {
        console.error('Failed to seek:', e);
      }
    } else if (engineKind === 'webaudio' && webAudioRef.current) {
      const q = modeRef.current === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
      const cur = q[stationRef.current.currentIndex];
      const kind = cur?.url?.split(':')[1] || 'piano';
      webAudioRef.current.stop();
      setTimeout(() => {
        webAudioRef.current.play(kind, stationRef.current.volume);
      }, 50);
      setCurrentTime(time);
    }
  }, [engineKind]);

  const playIndex = useCallback((i, m = modeRef.current) => {
    const q = m === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
    const track = q[i];
    if (!track) return;
    stopAll();

    if (isBuiltin(track.url)) {
      if (!webAudioRef.current) webAudioRef.current = new WebAudioEngine(({ time, duration: d }) => {
        setCurrentTime(time);
        if (d) setDuration(d);
      });
      const kind = track.url.split(':')[1] || 'piano';
      const ok = webAudioRef.current.play(kind, stationRef.current.volume);
      if (!ok) { setError('浏览器不支持 Web Audio API'); return; }
      setEngineKind('webaudio');
    } else {
      try {
        const audio = new Audio(track.url);
        audio.volume = stationRef.current.volume;
        
        audio.addEventListener('timeupdate', (e) => {
          setCurrentTime(e.target.currentTime);
        });
        
        audio.addEventListener('loadedmetadata', (e) => {
          setDuration(e.target.duration || 0);
        });
        
        audio.addEventListener('ended', () => {
          const curQ = modeRef.current === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
          const curIdx = stationRef.current.currentIndex;
          if (curIdx < curQ.length - 1) {
            playIndex(curIdx + 1, modeRef.current);
            setStation(s => ({ ...s, currentIndex: curIdx + 1, isLive: true }));
          } else {
            stopAll();
            setStation(s => ({ ...s, currentIndex: -1, isLive: false }));
          }
        });
        
        audio.addEventListener('playing', () => { 
          setError(''); 
          setEngineKind('html');
        });
        
        audio.addEventListener('error', () => {
          const errorCode = audio.error?.code || 0;
          const errorMessages = {
            1: '音频加载被中止',
            2: '网络错误',
            3: '音频解码失败（可能是不支持的格式）',
            4: '资源不存在或被拒绝'
          };
          const message = errorMessages[errorCode] || '未知错误';
          setError(`播放失败: ${message}。请尝试使用其他音频文件或内置音乐。`);
          setEngineKind('idle');
        });

        htmlAudioRef.current = audio;
        
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {}).catch((err) => {
            const msg = err.message || '';
            if (msg.includes('autoplay') || msg.includes('gesture')) {
              setError('播放被浏览器拦截。请再点一次播放按钮。');
            } else {
              setError(`播放失败: ${msg || '无法播放此音频文件'}`);
            }
            setEngineKind('idle');
          });
        }
      } catch (err) {
        setError(`播放异常: ${err.message || '无法播放此音频文件'}`);
        setEngineKind('idle');
      }
    }

    setStation(s => ({ ...s, currentIndex: i, isLive: true }));
  }, [stopAll]);

  const pauseAll = useCallback(() => {
    if (webAudioRef.current && webAudioRef.current.stop) { webAudioRef.current.stop(); }
    if (htmlAudioRef.current) {
      try { htmlAudioRef.current.pause(); } catch {}
    }
    setEngineKind('idle');
  }, []);

  const resumeAll = useCallback(() => {
    const s = stationRef.current;
    if (s.currentIndex < 0) return;
    const m = modeRef.current;
    const q = m === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
    const track = q[s.currentIndex];
    if (!track) return;

    if (isBuiltin(track.url)) {
      if (!webAudioRef.current) webAudioRef.current = new WebAudioEngine(({ time, duration: d }) => {
        setCurrentTime(time);
        if (d) setDuration(d);
      });
      const kind = track.url.split(':')[1] || 'piano';
      const ok = webAudioRef.current.play(kind, s.volume);
      if (!ok) { setError('浏览器不支持 Web Audio API'); return; }
      setEngineKind('webaudio');
    } else {
      if (!htmlAudioRef.current) {
        htmlAudioRef.current = new Audio();
        htmlAudioRef.current.preload = 'auto';
        htmlAudioRef.current.crossOrigin = 'anonymous';
        htmlAudioRef.current.addEventListener('timeupdate', (e) => setCurrentTime(e.target.currentTime));
        htmlAudioRef.current.addEventListener('loadedmetadata', (e) => setDuration(e.target.duration || 0));
        htmlAudioRef.current.addEventListener('ended', () => {
          const curQ = modeRef.current === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
          const curIdx = stationRef.current.currentIndex;
          if (curIdx < curQ.length - 1) {
            playIndex(curIdx + 1, modeRef.current);
            setStation(st => ({ ...st, currentIndex: curIdx + 1, isLive: true }));
          } else {
            pauseAll();
            setStation(st => ({ ...st, currentIndex: -1, isLive: false }));
          }
        });
        htmlAudioRef.current.addEventListener('playing', () => { setError(''); });
        htmlAudioRef.current.addEventListener('error', () => {
          const code = htmlAudioRef.current.error ? htmlAudioRef.current.error.code : 0;
          const map = { 1: '音频加载被中止', 2: '网络错误', 3: '音频解码失败', 4: '资源不存在或跨域被拒' };
          const msg = map[code] || '未知错误';
          setError(`外链失败（${msg}）。请换一首，或粘贴能在浏览器里直接播放的 .mp3 直达链接。`);
          setEngineKind('idle');
        });
        htmlAudioRef.current.src = track.url;
        htmlAudioRef.current.load();
      }
      try {
        htmlAudioRef.current.volume = stationRef.current.volume;
        const p = htmlAudioRef.current.play();
        if (p && typeof p.then === 'function') {
          p.then(() => setEngineKind('html')).catch((err) => {
            const msg = (err && err.message) ? err.message : '';
            if (msg.includes('autoplay') || msg.includes('gesture')) {
              setError('浏览器拦截了自动播放。请先点一次任意播放按钮再试。');
            } else {
              setError(`播放失败：${msg || '链接无法访问。请粘贴浏览器能直接打开的 .mp3 直达链接。'}`);
            }
            setEngineKind('idle');
          });
        } else {
          setEngineKind('html');
        }
      } catch (err) {
        setError(`播放异常：${err && err.message ? err.message : '请再点一次播放'}`);
      }
    }
  }, []);

  const toggleIndex = useCallback((i) => {
    const s = stationRef.current;
    const m = modeRef.current;
    const q = m === 'closing' ? s.closingQueue : s.queue;
    if (s.currentIndex === i && s.isLive) {
      pauseAll();
      setStation(st => ({ ...st, isLive: false }));
    } else if (s.currentIndex === i && !s.isLive) {
      resumeAll();
      setStation(st => ({ ...st, isLive: true }));
    } else {
      stopAll();
      playIndex(i, m);
      setStation(st => ({ ...st, currentIndex: i, isLive: true }));
    }
  }, [pauseAll, resumeAll, playIndex, stopAll]);

  const next = useCallback(() => {
    const q = modeRef.current === 'closing' ? stationRef.current.closingQueue : stationRef.current.queue;
    const ni = stationRef.current.currentIndex + 1;
    if (ni >= q.length) return;
    playIndex(ni, modeRef.current);
    setStation(s => ({ ...s, currentIndex: ni, isLive: true }));
  }, [playIndex]);

  useEffect(() => {
    if (webAudioRef.current) webAudioRef.current.setVolume(station.volume);
    if (htmlAudioRef.current) htmlAudioRef.current.volume = station.volume;
  }, [station.volume]);

  useEffect(() => () => stopAll(), [stopAll]);

  const queue = mode === 'closing' ? station.closingQueue : station.queue;
  const current = queue[station.currentIndex];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      setError('请选择音频文件（支持 MP3、WAV、OGG 等格式）');
      return;
    }

    // 检查文件大小（Base64 编码后约为原文件 1.37 倍，localStorage 通常限制 5-10MB）
    const maxSize = 8 * 1024 * 1024; // 8MB 限制，留出 localStorage 其他数据的空间
    if (file.size > maxSize) {
      setError(`音频文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），建议使用小于 8MB 的音频文件，或粘贴在线音乐链接。`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const t = title.trim() || fileName;
      const a = artist.trim() || '本地音乐';
      const key = mode === 'closing' ? 'closingQueue' : 'queue';
      
      setStation(s => {
        const newQueue = [...s[key], { id: `f${Date.now()}`, title: t, artist: a, url: base64Data, isLocal: true }];
        return {
          ...s,
          [key]: newQueue,
          adminUrl: base64Data,
        };
      });
      
      e.target.value = '';
      setTitle(''); setArtist(''); setError('');
    };
    
    reader.onerror = () => {
      setError('文件读取失败，请尝试其他文件');
    };
    
    reader.readAsDataURL(file);
  };

  const addSong = () => {
    if (!localUrl.trim()) { setError('请先粘贴音乐链接（.mp3 直达）'); return; }
    const t = title.trim() || `自定义音乐 ${queue.length + 1}`;
    const a = artist.trim() || (isAdmin ? '管理员添加' : '自习室电台');
    const key = mode === 'closing' ? 'closingQueue' : 'queue';
    setStation(s => {
      const existing = s[key].some(x => x.url === localUrl.trim());
      if (existing) return s;
      return {
        ...s,
        [key]: [...s[key], { id: `u${Date.now()}`, title: t, artist: a, url: localUrl.trim() }],
        adminUrl: localUrl.trim(),
      };
    });
    setLocalUrl(''); setTitle(''); setArtist(''); setError('');
  };

  const removeSong = (id) => {
    const key = mode === 'closing' ? 'closingQueue' : 'queue';
    setStation(s => {
      const newQ = s[key].filter(x => x.id !== id);
      let idx = s.currentIndex;
      if (idx >= newQ.length) idx = Math.max(0, newQ.length - 1);
      return { ...s, [key]: newQ, currentIndex: idx };
    });
    saveFailedRef.current = false;
    setError('');
  };

  return (
    <div className={`rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <div className={`flex items-center justify-between p-4 ${isDark ? 'bg-gray-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>当前播放</h2>
            {isAdmin && (
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                管理员控制台 · 全站同步
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-600'}`}>DJ</span>}
          {engineKind !== 'idle' && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${engineKind === 'webaudio' ? (isDark ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700') : (isDark ? 'bg-amber-900/60 text-amber-300' : 'bg-amber-100 text-amber-700')}`}>
              {engineKind === 'webaudio' ? '内置合成' : 'MP3'}
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className={`p-2 rounded-lg hover:bg-black/10 cursor-pointer transition ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

        <div className="p-5 space-y-5">
          <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {station.isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  <span className={`text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {station.isLive ? 'LIVE' : 'PAUSED'}
                  </span>
                </div>
                <div className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {current ? current.title : '点一首歌开始播放'}
                </div>
                <div className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {current ? `${current.artist}${isBuiltin(current.url) ? ' · 无需网络' : ''}` : '自习室电台'}
                </div>
              </div>

              <button
                onClick={() => {
                  if (station.isLive) {
                    pauseAll();
                    setStation(st => ({ ...st, isLive: false }));
                  } else {
                    if (station.currentIndex >= 0) {
                      playIndex(station.currentIndex, modeRef.current);
                    } else {
                      playIndex(0, modeRef.current);
                      setStation(st => ({ ...st, currentIndex: 0 }));
                    }
                    setStation(st => ({ ...st, isLive: true }));
                    setError('');
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer ${
                  station.isLive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
                title={station.isLive ? '暂停' : '播放'}
              >
                {station.isLive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
            </div>

            {duration > 0 && (
              <div className="mt-4">
                <div
                  className={`h-1.5 rounded-full cursor-pointer relative ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    const newTime = Math.max(0, Math.min(duration, percent * duration));
                    seekTo(newTime);
                  }}
                >
                  <div
                    className="h-full bg-indigo-500 rounded-full relative"
                    style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className={`flex justify-between text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setStation(s => ({ ...s, volume: s.volume > 0 ? 0 : 0.65 }))}
                className={`cursor-pointer ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {station.volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={station.volume}
                onChange={(e) => setStation(s => ({ ...s, volume: parseFloat(e.target.value) }))}
                className="flex-1 accent-indigo-500"
              />
              <span className={`text-xs w-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round(station.volume * 100)}</span>
              {isAdmin && (
                <button onClick={next} className={`p-2 rounded-lg cursor-pointer ${isDark ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-200 text-gray-700'}`} title="下一首">
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            {error && (
              <div className={`mt-3 text-xs rounded px-2 py-1.5 ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className={`inline-flex rounded-lg p-1 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
              <button onClick={() => setMode('normal')} className={`px-3 py-1 rounded-md text-sm font-medium cursor-pointer transition ${mode === 'normal' ? 'bg-indigo-500 text-white' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>
                白天电台
              </button>
              <button onClick={() => setMode('closing')} className={`px-3 py-1 rounded-md text-sm font-medium cursor-pointer transition ${mode === 'closing' ? 'bg-indigo-500 text-white' : (isDark ? 'text-gray-300' : 'text-gray-600')}`}>
                闭馆音乐
              </button>
            </div>
          )}

          <div>
            <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {isAdmin ? (mode === 'closing' ? '闭馆音乐 · 播放列表' : '电台播放列表（全站同步）') : '电台播放列表'}
            </div>
            <div className={`max-h-64 overflow-y-auto rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              {queue.length === 0 ? (
                <div className={`p-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>队列还空着。</div>
              ) : (
                queue.map((song, i) => {
                  const playing = station.currentIndex === i && station.isLive;
                  return (
                    <div key={song.id} className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${isDark ? 'border-gray-700' : 'border-gray-100'} ${playing ? (isDark ? 'bg-indigo-900/30' : 'bg-indigo-50') : ''}`}>
                      <button
                        onClick={() => toggleIndex(i)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer ${playing ? 'bg-indigo-500 text-white' : (isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100')}`}
                        title={playing ? '暂停' : '播放'}
                      >
                        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate font-medium ${playing ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : (isDark ? 'text-white' : 'text-gray-800')}`}>
                          {song.title}
                          {isBuiltin(song.url) && <span className={`ml-2 text-xs font-normal ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>内置</span>}
                        </div>
                        <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{song.artist}</div>
                      </div>
                      <div className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{String(i + 1).padStart(2, '0')}</div>
                      {isAdmin && (
                        <button onClick={() => removeSong(song.id)} className={`p-1.5 rounded flex-shrink-0 cursor-pointer ${isDark ? 'hover:bg-red-900/40 text-red-400' : 'hover:bg-red-100 text-red-500'}`} title="移除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {isAdmin && (
            <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Plus className={`w-4 h-4 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`} />
                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>添加音乐</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>（支持本地文件或链接）</span>
              </div>
              
              <div className="flex gap-2 mb-2">
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="歌曲名（可选）"
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <input
                  value={artist} onChange={(e) => setArtist(e.target.value)}
                  placeholder="作者（可选）"
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              
              <div className="flex gap-2 mb-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-file-upload"
                />
                <label
                  htmlFor="audio-file-upload"
                  className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium cursor-pointer flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" /> 导入本地文件
                </label>
                <input
                  value={localUrl} onChange={(e) => setLocalUrl(e.target.value)}
                  placeholder="或粘贴 MP3 链接..."
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  onKeyDown={(e) => e.key === 'Enter' && addSong()}
                />
                <button onClick={addSong} className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium cursor-pointer flex items-center gap-2">
                  <Plus className="w-4 h-4" /> 加入队列
                </button>
              </div>
              
              <div className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                💡 支持导入本地 MP3/WAV/OGG 音频文件，也可以粘贴公开的 MP3 直达链接。内置曲目使用 Web Audio 合成，无需联网。
              </div>
            </div>
          )}
        </div>

        <div className={`px-5 py-3 text-xs border-t ${isDark ? 'border-gray-700 text-gray-400 bg-gray-700/50' : 'border-gray-200 text-gray-500 bg-gray-50'}`}>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />每天 22:00 后自动进入闭馆音乐</span>
        </div>
      </div>
  );
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
