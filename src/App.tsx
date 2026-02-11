import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, type GameState } from './game/GameEngine';
import { WEAPONS } from './game/weapons';
import type { MapName } from './game/MapBuilder';

const initialState: GameState = {
  health: 100,
  maxHealth: 100,
  ammo: 12,
  maxAmmo: 12,
  weapon: WEAPONS[0],
  weaponIndex: 0,
  score: 0,
  kills: 0,
  wave: 1,
  enemiesAlive: 0,
  reloading: false,
  reloadProgress: 0,
  gameOver: false,
  paused: false,
  hitMarker: false,
  damageFlash: false,
  killFeed: [],
  killFeedTimes: [],
  waveTransitioning: false,
  scoped: false,
  map: 'bootcamp',
};

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [state, setState] = useState<GameState>(initialState);
  const [started, setStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mapSelect, setMapSelect] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapName>('bootcamp');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBackToast, setShowBackToast] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);

  // Toggle fullscreen and orientation lock
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        const orientation = (screen as any).orientation;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape').catch(() => { });
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for native fullscreen changes (e.g., escape key or system gesture)
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Handle mobile back button double-tap to exit
  useEffect(() => {
    if (!started || !isMobile) return;

    window.history.pushState({ noBack: true }, '');

    let toastTimer: any;
    let resetTimer: any;

    const handlePopState = (e: PopStateEvent) => {
      // User pressed back button
      if (backPressCount === 0) {
        // First press
        setBackPressCount(1);
        setShowBackToast(true);
        window.history.pushState({ noBack: true }, '');

        // Show for 2 seconds
        toastTimer = setTimeout(() => setShowBackToast(false), 2000);
        // Reset count if they don't press again within 2s
        resetTimer = setTimeout(() => setBackPressCount(0), 2000);
      } else {
        // Second press within time window
        clearTimeout(toastTimer);
        clearTimeout(resetTimer);
        setShowBackToast(false);
        setBackPressCount(0);

        // Exit fullscreen/game logic
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
        // Actually allow the navigation this time or refresh
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(toastTimer);
      clearTimeout(resetTimer);
    };
  }, [started, isMobile, backPressCount]);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });
    document.addEventListener('gestureend', preventGesture, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  const startGame = useCallback((map: MapName) => {
    setLoading(true);
    setStarted(true);
    setMapSelect(false);
    setTimeout(async () => {
      if (!containerRef.current) return;
      const engine = new GameEngine();
      engineRef.current = engine;
      await engine.init(containerRef.current, (s) => setState({ ...s }), map);
      engine.initAudio();
      setLoading(false);
    }, 50);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  if (!started) {
    if (mapSelect) {
      return (
        <MapSelectScreen
          selectedMap={selectedMap}
          onSelect={setSelectedMap}
          onBack={() => setMapSelect(false)}
          onDeploy={() => {
            if (isMobile && !document.fullscreenElement) toggleFullscreen();
            startGame(selectedMap);
          }}
        />
      );
    }
    return (
      <StartScreen
        onStart={() => {
          if (isMobile) toggleFullscreen();
          setMapSelect(true);
        }}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
          <div className="text-white font-mono text-xl animate-pulse">LOADING UTILS...</div>
        </div>
      )}

      {/* Crosshair */}
      {!state.gameOver && !state.scoped && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative w-8 h-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/70" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/70" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2.5 bg-white/70" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-2.5 bg-white/70" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-red-500/50" />
          </div>
        </div>
      )}

      {/* Hit Marker */}
      {state.hitMarker && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative w-6 h-6">
            <div className="absolute top-0 left-0 w-3 h-0.5 bg-white origin-bottom-right rotate-45 translate-x-0.5 translate-y-1" />
            <div className="absolute top-0 right-0 w-3 h-0.5 bg-white origin-bottom-left -rotate-45 -translate-x-0.5 translate-y-1" />
            <div className="absolute bottom-0 left-0 w-3 h-0.5 bg-white origin-top-right -rotate-45 translate-x-0.5 -translate-y-1" />
            <div className="absolute bottom-0 right-0 w-3 h-0.5 bg-white origin-top-left rotate-45 -translate-x-0.5 -translate-y-1" />
          </div>
        </div>
      )}

      {/* Damage flash */}
      {state.damageFlash && (
        <div className="absolute inset-0 pointer-events-none z-20 bg-red-600/30 animate-pulse" />
      )}

      {/* Scope overlay */}
      {state.scoped && (
        <div className="absolute inset-0 pointer-events-none z-15">
          {/* Dark vignette border */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,1) 100%)'
          }} />
          {/* Crosshair lines */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/60" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/60" />
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-red-500" />
          {/* Mil-dots on horizontal line */}
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 flex gap-8" style={{ marginLeft: '20px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="w-[2px] h-2 bg-black/60" />)}
          </div>
          <div className="absolute top-1/2 right-1/2 -translate-y-1/2 flex gap-8" style={{ marginRight: '20px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="w-[2px] h-2 bg-black/60" />)}
          </div>
          {/* Scope ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30"
            style={{ width: '60vmin', height: '60vmin' }} />
        </div>
      )}

      {/* HUD */}
      <HUD state={state} isMobile={isMobile} />

      {/* Fullscreen Toggle Button (Visible for all for testing, under HUD) */}
      {!state.gameOver && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-20 left-2 z-50 bg-red-600/80 hover:bg-red-500 text-white font-bold 
                     px-4 py-2 rounded-lg text-xs shadow-lg shadow-red-900/40 active:scale-95 transition-all"
        >
          {isFullscreen ? '🗗 EXIT FULLSCREEN' : '🗖 ENTER FULLSCREEN'}
        </button>
      )}

      {/* ===== TOP RIGHT BRANDING ===== */}
      <div className="absolute top-4 right-4 z-[100] pointer-events-none">
        <div className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] font-sans">
          Created by Potato💗
        </div>
      </div>

      {/* Exit Confirmation Toast */}
      {showBackToast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-bounce">
          <div className="bg-red-600 text-white px-4 py-2 rounded-full font-black text-sm shadow-xl border-2 border-white">
            PRESS BACK AGAIN TO EXIT
          </div>
        </div>
      )}

      {/* Kill Feed - top right */}
      <KillFeed entries={state.killFeed} times={state.killFeedTimes} />

      {/* Mobile Controls */}
      {isMobile && !state.gameOver && (
        <MobileControls engine={engineRef.current} weaponIndex={state.weaponIndex} />
      )}

      {/* Game Over */}
      {state.gameOver && (
        <GameOverScreen state={state} onRestart={() => engineRef.current?.restart()} />
      )}

      {/* Desktop instruction */}
      {!isMobile && !state.gameOver && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-black/30 text-white/40 text-[10px] px-3 py-0.5 rounded-full font-mono">
            Click to lock mouse • WASD move • 1-4 weapons • R reload • V scope (sniper)
          </div>
        </div>
      )}
    </div>
  );
}

/* ======== Kill Feed Component with stable keys ======== */
function KillFeed({ entries, times }: { entries: string[]; times: number[] }) {
  // Use a ref to assign stable IDs to each kill feed entry
  const stableKeysRef = useRef<Map<string, number>>(new Map());
  const counterRef = useRef(0);

  // Build stable keys: each unique entry+time combo gets a persistent ID
  const items = entries.map((msg, i) => {
    const timeKey = times[i] ? times[i].toFixed(3) : String(i);
    const compositeKey = `${msg}_${timeKey}`;
    if (!stableKeysRef.current.has(compositeKey)) {
      stableKeysRef.current.set(compositeKey, counterRef.current++);
    }
    return { msg, key: stableKeysRef.current.get(compositeKey)! };
  });

  // Clean up old keys periodically (keep map from growing forever)
  useEffect(() => {
    const activeKeys = new Set(items.map(it => {
      const timeKey = times[items.indexOf(it)] ? times[items.indexOf(it)].toFixed(3) : '';
      return `${it.msg}_${timeKey}`;
    }));
    stableKeysRef.current.forEach((value: number, key: string) => {
      if (!activeKeys.has(key)) stableKeysRef.current.delete(key);
    });
  }, [entries.length]);

  if (items.length === 0) return null;

  return (
    <div className="absolute top-14 right-2 z-10 pointer-events-none space-y-1 max-w-[200px]">
      {items.map((item) => (
        <div
          key={item.key}
          className="bg-black/80 text-white text-[11px] px-2 py-1 rounded font-mono border-l-2 border-red-500 killfeed-item whitespace-nowrap overflow-hidden text-ellipsis"
        >
          {item.msg}
        </div>
      ))}
    </div>
  );
}

function StartScreen({ onStart, isMobile }: { onStart: () => void; isMobile: boolean }) {
  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-500 tracking-tight">
            LOW POLY
          </h1>
          <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-400 to-red-500">
            ARENA
          </h2>
          <div className="text-gray-400 text-sm font-medium animate-pulse mt-2">
            Created by Potato💗
          </div>
        </div>

        <div className="space-y-3 text-gray-400 text-sm md:text-base">
          <p>🔫 4 unique weapons with different playstyles</p>
          <p>👾 Survive waves of increasingly tough enemies</p>
          <p>💀 3 enemy types: Grunts, Heavies, and Speedsters</p>
        </div>

        {!isMobile && (
          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto text-xs text-gray-500 font-mono">
            <div className="bg-gray-800 rounded px-2 py-1">WASD - Move</div>
            <div className="bg-gray-800 rounded px-2 py-1">Mouse - Look</div>
            <div className="bg-gray-800 rounded px-2 py-1">Click - Shoot</div>
            <div className="bg-gray-800 rounded px-2 py-1">R - Reload</div>
            <div className="bg-gray-800 rounded px-2 py-1">1-4 - Weapons</div>
            <div className="bg-gray-800 rounded px-2 py-1">Space - Jump</div>
          </div>
        )}

        {isMobile && (
          <div className="text-gray-500 text-xs font-mono space-y-1">
            <p>Left joystick - Move</p>
            <p>Right side - Look around</p>
            <p>🔴 Button - Shoot</p>
          </div>
        )}

        <button
          onClick={onStart}
          className="px-12 py-4 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xl font-bold rounded-xl
                     hover:from-red-500 hover:to-orange-400 active:scale-95 transition-all shadow-lg shadow-red-900/50"
        >
          PLAY NOW
        </button>

        <p className="text-gray-600 text-xs">
          {isMobile ? 'Touch to start' : 'Click to lock mouse after starting'}
        </p>
      </div>
    </div>
  );
}

function MapSelectScreen({
  selectedMap,
  onSelect,
  onBack,
  onDeploy,
}: {
  selectedMap: MapName;
  onSelect: (map: MapName) => void;
  onBack: () => void;
  onDeploy: () => void;
}) {
  const maps: { id: MapName; name: string; emoji: string; desc: string; color: string; border: string; glow: string }[] = [
    {
      id: 'bootcamp',
      name: 'Bootcamp',
      emoji: '🏕️',
      desc: 'Grassy training grounds with buildings, watch towers, crate clusters, and sandbag bunkers.',
      color: 'from-green-900/60 to-green-800/40',
      border: 'border-green-500/50',
      glow: 'shadow-green-500/30',
    },
    {
      id: 'desert',
      name: 'Desert Outpost',
      emoji: '🏜️',
      desc: 'Arid wasteland with a central fortress, sniper towers, ruined buildings, and abandoned vehicles.',
      color: 'from-amber-900/60 to-amber-800/40',
      border: 'border-amber-500/50',
      glow: 'shadow-amber-500/30',
    },
  ];

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
      <div className="text-center space-y-8 p-6 max-w-lg w-full">
        <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-tight">
          SELECT MAP
        </h2>

        <div className="space-y-4">
          {maps.map((m) => {
            const isSelected = selectedMap === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`w-full text-left rounded-xl p-4 bg-gradient-to-r ${m.color} border-2 transition-all duration-200
                  ${isSelected
                    ? `${m.border} ring-2 ring-green-400/60 shadow-lg ${m.glow} scale-[1.02]`
                    : 'border-white/10 hover:border-white/25 hover:scale-[1.01]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{m.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">{m.name}</span>
                      {isSelected && (
                        <span className="text-green-400 text-xs font-mono bg-green-400/10 px-2 py-0.5 rounded-full">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gray-700/60 text-gray-300 font-bold rounded-xl border border-white/10
                       hover:bg-gray-600/60 active:scale-95 transition-all"
          >
            ← BACK
          </button>
          <button
            onClick={onDeploy}
            className="px-10 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white text-lg font-bold rounded-xl
                       hover:from-green-500 hover:to-emerald-400 active:scale-95 transition-all shadow-lg shadow-green-900/50"
          >
            DEPLOY →
          </button>
        </div>
      </div>
    </div>
  );
}

function HUD({ state, isMobile }: { state: GameState; isMobile: boolean }) {
  const healthPercent = (state.health / state.maxHealth) * 100;
  const healthColor =
    healthPercent > 60
      ? 'bg-green-500'
      : healthPercent > 30
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const weaponEmoji = (name: string) => {
    switch (name) {
      case 'Pistol': return '🔫';
      case 'Shotgun': return '💥';
      case 'Rifle': return '🔫';
      case 'Sniper': return '🎯';
      default: return '🔫';
    }
  };

  return (
    <>
      {/* ===== TOP CENTER - Enemies Remaining ===== */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-1 border border-red-500/30 flex items-center gap-2">
          <span className="text-red-400 text-xs">👾</span>
          <span className="text-red-400 font-black text-lg font-mono leading-none">{state.enemiesAlive}</span>
          <span className="text-red-300/60 text-[10px] font-mono uppercase tracking-wider">enemies</span>
        </div>
      </div>

      {/* ===== TOP LEFT - Score / Wave / Kills ===== */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1 border border-white/10">
          <div className="text-yellow-400 font-bold text-base font-mono flex items-center gap-1.5">
            <span className="text-yellow-500 text-sm">⭐</span> {state.score}
          </div>
          <div className="border-t border-white/10 pt-1 flex gap-3">
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] font-mono">WAVE</span>
              <span className="text-blue-400 font-bold text-xs font-mono">{state.wave}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-[10px] font-mono">KILLS</span>
              <span className="text-red-400 font-bold text-xs font-mono">{state.kills}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Wave Transition Banner ===== */}
      {state.waveTransitioning && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="text-center animate-pulse">
            <div className="text-green-400 font-black text-3xl md:text-5xl drop-shadow-lg">
              WAVE {state.wave - 1} CLEARED!
            </div>
            <div className="text-white/70 text-lg font-mono mt-2">
              Next wave incoming...
            </div>
          </div>
        </div>
      )}

      {/* ===== BOTTOM HUD ===== */}
      <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ bottom: isMobile ? '46px' : '4px' }}>
        {/* Health bar row - above weapon row */}
        <div className="flex justify-center mb-1.5">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 border border-white/10" style={{ width: '220px' }}>
            <span className="text-xs">❤️</span>
            <div className="flex-1 h-2 bg-black/80 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full ${healthColor} transition-all duration-150 rounded-full`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-white/70 w-6 text-right font-bold">{Math.floor(state.health)}</span>
          </div>
        </div>

        {/* Weapon row: [gun+ammo left] [weapon slots right] */}
        <div className="flex items-end justify-between px-2 mt-1">
          {/* LEFT: Current gun + ammo */}
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10 flex items-center gap-1.5 shrink-0">
            <span className="text-sm">{weaponEmoji(state.weapon.name)}</span>
            <span className="text-white font-bold text-[10px] font-mono uppercase">{state.weapon.name}</span>
            <span className="text-white/20">|</span>
            <span className={`font-bold text-sm font-mono ${state.ammo === 0 ? 'text-red-400' : 'text-white'}`}>
              {state.ammo}
            </span>
            <span className="text-gray-500 text-[10px] font-mono">/{state.maxAmmo}</span>
            {state.reloading && (
              <div className="flex items-center gap-1 ml-1">
                <span className="text-blue-400 text-[9px] font-mono font-bold animate-pulse">RLD</span>
                <div className="w-10 h-1.5 bg-black/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-100"
                    style={{ width: `${state.reloadProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Weapon selector slots (desktop only) */}
          {!isMobile && (
            <div className="flex gap-1">
              {WEAPONS.map((w, i) => (
                <div
                  key={i}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] transition-all flex items-center gap-1 ${i === state.weaponIndex
                    ? 'bg-white/20 text-white border border-white/40'
                    : 'bg-black/40 text-gray-500 border border-white/5'
                    }`}
                >
                  <span className="text-gray-400 text-[8px]">{i + 1}</span>
                  {w.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MobileControls({ engine, weaponIndex }: { engine: GameEngine | null; weaponIndex: number }) {
  const moveContainerRef = useRef<HTMLDivElement>(null);
  const moveDataRef = useRef({ active: false, id: -1, startX: 0, startY: 0, curX: 0, curY: 0 });
  const lookDataRef = useRef({ active: false, id: -1, lastX: 0, lastY: 0 });
  const shootingRef = useRef(false);

  const [, forceRender] = useState(0);
  const [shooting, setShooting] = useState(false);

  // Move joystick - native events
  useEffect(() => {
    const moveEl = moveContainerRef.current;
    if (!moveEl) return;

    const onMoveStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (moveDataRef.current.active) return;
      const touch = e.changedTouches[0];
      moveDataRef.current = {
        active: true,
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        curX: touch.clientX,
        curY: touch.clientY,
      };
      engine?.setMoveJoystick(true, 0, 0, touch.identifier, touch.clientX, touch.clientY);
      forceRender((n: number) => n + 1);
    };

    const onMoveMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const md = moveDataRef.current;
      if (!md.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === md.id) {
          const dx = touch.clientX - md.startX;
          const dy = touch.clientY - md.startY;
          const maxDist = 50;
          const clampedDx = Math.max(-maxDist, Math.min(maxDist, dx));
          const clampedDy = Math.max(-maxDist, Math.min(maxDist, dy));
          md.curX = md.startX + clampedDx;
          md.curY = md.startY + clampedDy;
          engine?.setMoveJoystick(true, clampedDx, clampedDy, touch.identifier, md.startX, md.startY);
          forceRender((n: number) => n + 1);
        }
      }
    };

    const onMoveEnd = (e: TouchEvent) => {
      e.preventDefault();
      const md = moveDataRef.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === md.id) {
          md.active = false;
          md.id = -1;
          engine?.setMoveJoystick(false, 0, 0, -1, 0, 0);
          forceRender((n: number) => n + 1);
        }
      }
    };

    moveEl.addEventListener('touchstart', onMoveStart, { passive: false });
    moveEl.addEventListener('touchmove', onMoveMove, { passive: false });
    moveEl.addEventListener('touchend', onMoveEnd, { passive: false });
    moveEl.addEventListener('touchcancel', onMoveEnd, { passive: false });

    return () => {
      moveEl.removeEventListener('touchstart', onMoveStart);
      moveEl.removeEventListener('touchmove', onMoveMove);
      moveEl.removeEventListener('touchend', onMoveEnd);
      moveEl.removeEventListener('touchcancel', onMoveEnd);
    };
  }, [engine]);

  // Look area - native events
  const lookContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lookEl = lookContainerRef.current;
    if (!lookEl) return;

    const onLookStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (lookDataRef.current.active) return;
      const touch = e.changedTouches[0];
      lookDataRef.current = { active: true, id: touch.identifier, lastX: touch.clientX, lastY: touch.clientY };
    };

    const onLookMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const ld = lookDataRef.current;
      if (!ld.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === ld.id) {
          const dx = touch.clientX - ld.lastX;
          const dy = touch.clientY - ld.lastY;
          ld.lastX = touch.clientX;
          ld.lastY = touch.clientY;
          engine?.setLookJoystick(true, dx, dy, touch.identifier, 0, 0);
        }
      }
    };

    const onLookEnd = (e: TouchEvent) => {
      e.preventDefault();
      const ld = lookDataRef.current;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === ld.id) {
          ld.active = false;
          ld.id = -1;
          engine?.setLookJoystick(false, 0, 0, -1, 0, 0);
        }
      }
    };

    lookEl.addEventListener('touchstart', onLookStart, { passive: false });
    lookEl.addEventListener('touchmove', onLookMove, { passive: false });
    lookEl.addEventListener('touchend', onLookEnd, { passive: false });
    lookEl.addEventListener('touchcancel', onLookEnd, { passive: false });

    return () => {
      lookEl.removeEventListener('touchstart', onLookStart);
      lookEl.removeEventListener('touchmove', onLookMove);
      lookEl.removeEventListener('touchend', onLookEnd);
      lookEl.removeEventListener('touchcancel', onLookEnd);
    };
  }, [engine]);

  const handleShootStart = useCallback(() => {
    shootingRef.current = true;
    setShooting(true);
    engine?.setMobileShoot(true);
  }, [engine]);

  const handleShootEnd = useCallback(() => {
    shootingRef.current = false;
    setShooting(false);
    engine?.setMobileShoot(false);
  }, [engine]);

  const md = moveDataRef.current;
  const containerRect = moveContainerRef.current?.getBoundingClientRect();
  const joyBaseLeft = md.active && containerRect ? md.startX - containerRect.left - 48 : -1;
  const joyBaseTop = md.active && containerRect ? md.startY - containerRect.top - 48 : -1;
  const joyThumbLeft = md.active && containerRect ? md.curX - containerRect.left - 20 : -1;
  const joyThumbTop = md.active && containerRect ? md.curY - containerRect.top - 20 : -1;

  return (
    <>
      {/* Move joystick area - left side */}
      <div
        ref={moveContainerRef}
        className="absolute bottom-0 left-0 w-[45%] h-[40%] z-30"
        style={{ touchAction: 'none' }}
      >
        {md.active ? (
          <>
            <div
              className="absolute w-24 h-24 rounded-full border-2 border-white/30 bg-white/10"
              style={{ left: joyBaseLeft, top: joyBaseTop, pointerEvents: 'none' }}
            />
            <div
              className="absolute w-10 h-10 rounded-full bg-white/40"
              style={{ left: joyThumbLeft, top: joyThumbTop, pointerEvents: 'none' }}
            />
          </>
        ) : (
          <div className="absolute bottom-10 left-10 w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white/15" />
          </div>
        )}
      </div>

      {/* Look area - right side */}
      <div
        ref={lookContainerRef}
        className="absolute top-0 right-0 w-[55%] h-[65%] z-30"
        style={{ touchAction: 'none' }}
      />

      {/* Shoot button */}
      <div
        className={`absolute bottom-10 right-8 z-40 w-20 h-20 rounded-full flex items-center justify-center
          ${shooting ? 'bg-red-600/80 scale-90' : 'bg-red-500/50 border-2 border-red-400/60'} transition-all`}
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); handleShootStart(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleShootEnd(); }}
        onTouchCancel={(e) => { e.preventDefault(); handleShootEnd(); }}
      >
        <span className="text-white text-3xl pointer-events-none">🔥</span>
      </div>

      {/* Reload button */}
      <div
        className="absolute bottom-10 right-32 z-40 w-14 h-14 rounded-full bg-blue-500/40 border border-blue-400/50
                   flex items-center justify-center active:bg-blue-500/70"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); engine?.mobileReload(); }}
      >
        <span className="text-white text-xs font-bold pointer-events-none">R</span>
      </div>

      {/* Jump button */}
      <div
        className="absolute bottom-28 right-28 z-40 w-14 h-14 rounded-full bg-yellow-500/30 border border-yellow-400/40
                   flex items-center justify-center active:bg-yellow-500/60"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); engine?.mobileJump(); }}
      >
        <span className="text-white text-lg pointer-events-none">⬆</span>
      </div>

      {/* Scope button - only when sniper equipped */}
      {weaponIndex === 3 && (
        <div
          className="absolute bottom-44 right-10 z-40 w-14 h-14 rounded-full bg-purple-500/40 border border-purple-400/50
                     flex items-center justify-center active:bg-purple-500/70"
          style={{ touchAction: 'none' }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); engine?.toggleScope(); }}
        >
          <span className="text-white text-lg pointer-events-none">🔭</span>
        </div>
      )}

      {/* Weapon switch buttons - bottom center, very bottom */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-40 flex gap-1">
        {WEAPONS.map((w, i) => (
          <button
            key={i}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${i === weaponIndex
              ? 'bg-white/25 text-white border border-white/50'
              : 'bg-black/40 text-gray-400 border border-gray-600/30'
              }`}
            style={{ touchAction: 'none' }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              engine?.mobileSwitchWeapon(i);
            }}
          >
            {w.name}
          </button>
        ))}
      </div>
    </>
  );
}

function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center space-y-6 p-8">
        <h2 className="text-5xl font-black text-red-500">GAME OVER</h2>
        <div className="space-y-2 text-gray-300 font-mono">
          <p className="text-2xl">Score: <span className="text-yellow-400">{state.score}</span></p>
          <p>Kills: <span className="text-red-400">{state.kills}</span></p>
          <p>Waves Survived: <span className="text-blue-400">{state.wave - 1}</span></p>
        </div>
        <button
          onClick={onRestart}
          className="px-10 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white text-lg font-bold rounded-xl
                     hover:from-red-500 hover:to-orange-400 active:scale-95 transition-all"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
