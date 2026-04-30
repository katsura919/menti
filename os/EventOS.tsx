'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SEGMENTS, SPEAKERS, COMPARE_PRESETS, type Segment, type ComparePreset } from './config';

// ── Palettes ─────────────────────────────────────────────────────────────────
type ThemeKey = 'tm' | 'am';
type Palette = Record<string, string>;

interface ThemeFonts {
  sans: string;   // UI / body
  serif: string;  // scripted / italic accents
}

// Both themes use Abie Maxey's brand fonts ~ only the colors differ between themes
const FONTS: Record<ThemeKey, ThemeFonts> = {
  tm: {
    sans: 'var(--font-host-grotesk, ui-sans-serif, system-ui, sans-serif)',
    serif: 'var(--font-instrument-serif, ui-serif, Georgia, serif)',
  },
  am: {
    sans: 'var(--font-host-grotesk, ui-sans-serif, system-ui, sans-serif)',
    serif: 'var(--font-instrument-serif, ui-serif, Georgia, serif)',
  },
};

const THEMES: Record<ThemeKey, { label: string; sub: string; isDark: boolean; C: Palette }> = {
  // Talent Mucho ~ light, beige + clay (matches talentmucho.com)
  tm: {
    label: 'TM',
    sub: 'Talent Mucho',
    isDark: false,
    C: {
      bg: '#FAF8F5', surface: '#FFFFFF', surface2: '#EBE4D8',
      border: 'rgba(42,37,32,0.12)',
      primary: '#7D6B5A', primaryHover: '#665847',
      text: '#2A2520', muted: '#9C8B7A',
      peach: 'rgba(125,107,90,0.10)', sage: 'rgba(156,139,122,0.20)',
      abie: '#2A2520', meri: '#7D6B5A', both: '#9C8B7A',
      good: '#4a7c59', bad: '#8b3a3a',
    },
  },
  // Abie Maxey ~ light, peach, sage ~ creator personal brand
  am: {
    label: 'AM',
    sub: 'Abie Maxey',
    isDark: false,
    C: {
      bg: '#f9f5f2', surface: '#ffffff', surface2: '#e7ddd3',
      border: 'rgba(58,58,58,0.12)',
      primary: '#e3a99c', primaryHover: '#d49283',
      text: '#3a3a3a', muted: '#6b6b6b',
      peach: '#f2d6c9', sage: '#bbcccd',
      abie: '#3a3a3a', meri: '#e3a99c', both: '#bbcccd',
      good: '#1e8449', bad: '#b03a2e',
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface QAItem { id: number; text: string; votes: number; answered: boolean; active: boolean; }
type Mode = 'demo' | 'compare' | 'products' | 'showcase' | 'qa';
type ViewType = 'presenter' | 'audience';
type ShowTab = 'abie' | 'meri';

interface CompareState {
  step: number;         // 0=ready, 1=left running, 2=right running, 3=landed
  running: boolean;
  leftText: string;
  rightText: string;
  leftDone: boolean;
  rightDone: boolean;
}

// ── Pin gate ───────────────────────────────────────────────────────────────────
const PIN = '2028'; // change this or set via NEXT_PUBLIC_EVENT_OS_PIN

function PinGate({ onUnlock, theme }: { onUnlock: () => void; theme: ThemeKey }) {
  const C = THEMES[theme].C;
  const [val, setVal] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function tryPin(v: string) {
    if (v === PIN) { onUnlock(); return; }
    if (v.length === 4) {
      setShake(true); setVal('');
      setTimeout(() => setShake(false), 500);
    } else {
      setVal(v);
    }
  }

  return (
    <div style={{ background: C.bg, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24, fontFamily: FONTS[theme].sans }}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.primary, fontWeight: 700 }}>{THEMES[theme].sub.toUpperCase()} ~ EVENT OS</div>
      <div style={{ fontSize: 13, color: C.muted, letterSpacing: '0.08em' }}>Enter access PIN to continue</div>
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={val}
        onChange={e => tryPin(e.target.value)}
        style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
          color: C.text, fontSize: 24, textAlign: 'center', letterSpacing: 12,
          padding: '14px 28px', width: 160, outline: 'none',
          transition: 'all 0.15s',
          animation: shake ? 'shake 0.4s ease' : 'none',
        }}
        placeholder="····"
      />
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

// ── Edit helpers ~ deep get/set for path-based field editing ─────────────────
type AnyRecord = Record<string, unknown>;
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => {
    if (o == null) return undefined;
    if (Array.isArray(o)) return o[Number(k)];
    return (o as AnyRecord)[k];
  }, obj);
}
function setByPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce<unknown>((o, k) => {
    if (o == null) return undefined;
    if (Array.isArray(o)) return o[Number(k)];
    return (o as AnyRecord)[k];
  }, obj);
  if (target == null) return;
  if (Array.isArray(target)) (target as unknown[])[Number(last)] = value;
  else (target as AnyRecord)[last] = value;
}

// ── Editable ~ contentEditable wrapper that fires onSave on blur ─────────────
function Editable({ value, editMode, onSave, style, tagName = 'span' }: {
  value: string;
  editMode: boolean;
  onSave: (next: string) => void;
  style?: React.CSSProperties;
  tagName?: 'span' | 'div';
}) {
  const editClass = editMode ? 'os-editable' : undefined;
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const next = e.currentTarget.innerHTML;
    if (next !== value) onSave(next);
  };
  const handleKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && tagName === 'span') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };
  const props = {
    className: editClass,
    contentEditable: editMode,
    suppressContentEditableWarning: true,
    onBlur: handleBlur,
    onKeyDown: handleKey,
    dangerouslySetInnerHTML: { __html: value },
    style,
  };
  if (tagName === 'div') return <div {...props} />;
  return <span {...props} />;
}

// ── Typewriter helper ~ fakes streaming for pre-written answers ──────────────
async function typeOut(
  text: string,
  onChunk: (chunk: string) => void,
  signal: { cancelled: boolean },
): Promise<void> {
  // Stream word-by-word with small randomized delays (feels like a real model)
  const tokens = text.match(/\S+\s*/g) ?? [text];
  for (const tok of tokens) {
    if (signal.cancelled) return;
    onChunk(tok);
    // 20ms~55ms per token, slightly longer on punctuation
    const delay = /[.!?]\s*$/.test(tok) ? 90 : 22 + Math.random() * 30;
    await new Promise(r => setTimeout(r, delay));
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EventOS() {
  const [unlocked, setUnlocked] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>('tm');

  useEffect(() => {
    if (sessionStorage.getItem('os-unlocked') === '1') setUnlocked(true);
    const saved = localStorage.getItem('os-theme') as ThemeKey | null;
    if (saved && THEMES[saved]) setTheme(saved);
  }, []);

  function unlock() {
    sessionStorage.setItem('os-unlocked', '1');
    setUnlocked(true);
  }

  function changeTheme(t: ThemeKey) {
    setTheme(t);
    localStorage.setItem('os-theme', t);
  }

  if (!unlocked) return <PinGate onUnlock={unlock} theme={theme} />;
  return <OSApp theme={theme} onThemeChange={changeTheme} />;
}

// ── The actual OS ──────────────────────────────────────────────────────────────
function OSApp({ theme, onThemeChange }: { theme: ThemeKey; onThemeChange: (t: ThemeKey) => void }) {
  const C = THEMES[theme].C;
  const isDark = THEMES[theme].isDark;
  const [segIdx, setSegIdx] = useState(0);
  const [beatIdx, setBeatIdx] = useState(0);
  const [view, setView] = useState<ViewType>('presenter');
  const [mode, setMode] = useState<Mode>('demo');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecs, setTimerSecs] = useState(0);
  const [eventSecs, setEventSecs] = useState(7200);
  const [fontSize, setFontSize] = useState(19);
  const [showTab, setShowTab] = useState<ShowTab>('abie');
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [qaInput, setQaInput] = useState('');
  const [nextQId, setNextQId] = useState(1);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [showNotes, setShowNotes] = useState(false);
  const [compareState, setCompareState] = useState<CompareState>({
    step: 0, running: false, leftText: '', rightText: '', leftDone: false, rightDone: false,
  });
  const [activePreset, setActivePreset] = useState<ComparePreset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [segments, setSegments] = useState<Segment[]>(SEGMENTS);
  const [editStatus, setEditStatus] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prompterRef = useRef<HTMLDivElement>(null);
  const qaInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Clamp segment + beat indices defensively in case state goes out of bounds
  // (e.g. after edits remove beats, after imports, or during transitions)
  const seg = segments[segIdx] ?? segments[0];
  const beat = seg?.beats[beatIdx] ?? seg?.beats[0];

  // ── Edit persistence ─ server (Vercel Blob) is source of truth, localStorage backs it up
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'offline'>('idle');

  useEffect(() => {
    let cancelled = false;
    function applyEdits(edits: Record<string, string>) {
      if (cancelled) return;
      const copy: Segment[] = JSON.parse(JSON.stringify(SEGMENTS));
      Object.entries(edits).forEach(([path, val]) => setByPath(copy, path, val));
      setSegments(copy);
    }
    // 1. Hydrate immediately from localStorage (fast)
    try {
      const local = localStorage.getItem('os-edits');
      if (local) applyEdits(JSON.parse(local));
    } catch { /* ignore */ }
    // 2. Then fetch the canonical version from the server
    fetch('/api/events/claude-for-business/script', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.edits) return;
        applyEdits(data.edits);
        localStorage.setItem('os-edits', JSON.stringify(data.edits));
        setSyncStatus('synced');
      })
      .catch(() => setSyncStatus('offline'));
    return () => { cancelled = true; };
  }, []);

  function persistEditsToServer(edits: Record<string, string>) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/events/claude-for-business/script', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edits }),
      })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('offline'));
    }, 700);
  }

  function flashStatus(msg: string) {
    setEditStatus(msg);
    setTimeout(() => setEditStatus(''), 1800);
  }

  function saveEdit(path: string, value: string) {
    const copy: Segment[] = JSON.parse(JSON.stringify(segments));
    setByPath(copy, path, value);
    setSegments(copy);

    const original = String(getByPath(SEGMENTS, path) ?? '');
    const stored = JSON.parse(localStorage.getItem('os-edits') || '{}') as Record<string, string>;
    if (value !== original) stored[path] = value;
    else delete stored[path];
    localStorage.setItem('os-edits', JSON.stringify(stored));
    persistEditsToServer(stored);
    flashStatus('Saved ✓');
  }

  function resetEdits() {
    if (!confirm('Reset all edits? Original script will be restored.')) return;
    localStorage.removeItem('os-edits');
    setSegments(SEGMENTS);
    persistEditsToServer({});
    flashStatus('Reset ✓');
  }

  function exportConfig() {
    const blob = new Blob([JSON.stringify(segments, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `event-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    flashStatus('Downloaded ✓');
  }

  function importConfig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(String(ev.target?.result)) as Segment[];
        if (!Array.isArray(parsed)) throw new Error('not an array');
        setSegments(parsed);
        // Save full snapshot as edits
        const edits: Record<string, string> = {};
        parsed.forEach((s, i) => {
          ['title', 'titleItalic', 'subtitle', 'duration', 'audWhatTitle', 'audWhatBody', 'audTakeaway'].forEach(field => {
            const orig = String(getByPath(SEGMENTS, `${i}.${field}`) ?? '');
            const newVal = String(getByPath(parsed, `${i}.${field}`) ?? '');
            if (orig !== newVal) edits[`${i}.${field}`] = newVal;
          });
        });
        localStorage.setItem('os-edits', JSON.stringify(edits));
        persistEditsToServer(edits);
        flashStatus('Imported ✓');
      } catch {
        flashStatus('Invalid file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Persist notes ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('os-notes');
    if (saved) try { setNotes(JSON.parse(saved)); } catch { /* ignore */ }
  }, []);

  function saveNote(segId: number, val: string) {
    const next = { ...notes, [segId]: val };
    setNotes(next);
    localStorage.setItem('os-notes', JSON.stringify(next));
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerRef.current!);
      setTimerRunning(false);
    } else {
      timerRef.current = setInterval(() => {
        setTimerSecs(s => s + 1);
        setEventSecs(s => Math.max(0, s - 1));
      }, 1000);
      setTimerRunning(true);
    }
  }

  function resetTimer() { clearInterval(timerRef.current!); setTimerRunning(false); setTimerSecs(0); }

  useEffect(() => () => clearInterval(timerRef.current!), []);

  function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function fmtEvent(s: number) {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sc = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToSeg = useCallback((idx: number) => {
    setSegIdx(idx); setBeatIdx(0);
    const s = segments[idx];
    if (!s) return;
    const newMode = s.panel as Mode;
    setMode(newMode);
    if (newMode === 'compare' && s.panelData) {
      const preset = COMPARE_PRESETS[s.panelData];
      if (preset) { setActivePreset(preset); resetCompare(); }
    }
    const speakers = s.speakers ?? [];
    if (speakers.includes('MERI') && !speakers.includes('ABIE')) setShowTab('meri');
    else setShowTab('abie');
    prompterRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToBeat = useCallback((idx: number) => {
    setBeatIdx(idx);
    const b = segments[segIdx]?.beats[idx];
    if (b && mode === 'showcase') {
      if (b.speaker === 'MERI') setShowTab('meri');
      else if (b.speaker === 'ABIE') setShowTab('abie');
    }
    const el = document.getElementById(`beat-${idx}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [segIdx, mode, segments]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Don't intercept while editing contentEditable text
      if ((e.target as HTMLElement).isContentEditable) return;
      const s = segments[segIdx];
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (beatIdx < s.beats.length - 1) goToBeat(beatIdx + 1);
        else if (segIdx < segments.length - 1) goToSeg(segIdx + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (beatIdx > 0) goToBeat(beatIdx - 1);
        else if (segIdx > 0) {
          const prevSeg = segIdx - 1;
          setSegIdx(prevSeg);
          const lastBeat = segments[prevSeg].beats.length - 1;
          setBeatIdx(lastBeat);
          goToSeg(prevSeg);
          setTimeout(() => goToBeat(lastBeat), 50);
        }
      }
      if (e.key === ' ') { e.preventDefault(); toggleTimer(); }
      if (e.key === 'v' || e.key === 'V') setView(v => v === 'presenter' ? 'audience' : 'presenter');
      if (e.key === 'n' || e.key === 'N') setShowNotes(n => !n);
      if (e.key === 'r' || e.key === 'R') resetTimer();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [segIdx, beatIdx, goToBeat, goToSeg, toggleTimer]);

  // ── Compare ───────────────────────────────────────────────────────────────
  function resetCompare() {
    compareSignal.current.cancelled = true;
    setCompareState({ step: 0, running: false, leftText: '', rightText: '', leftDone: false, rightDone: false });
  }

  const compareSignal = useRef({ cancelled: false });
  async function runCompare() {
    if (!activePreset || compareState.running) return;
    compareSignal.current = { cancelled: false };
    resetCompare();
    setCompareState(s => ({ ...s, running: true, step: 1 }));
    await typeOut(activePreset.leftAnswer, (chunk) => {
      setCompareState(s => ({ ...s, leftText: s.leftText + chunk }));
    }, compareSignal.current);
    if (compareSignal.current.cancelled) return;
    setCompareState(s => ({ ...s, leftDone: true, step: 2 }));
    await new Promise(r => setTimeout(r, 500));
    if (compareSignal.current.cancelled) return;
    await typeOut(activePreset.rightAnswer, (chunk) => {
      setCompareState(s => ({ ...s, rightText: s.rightText + chunk }));
    }, compareSignal.current);
    if (compareSignal.current.cancelled) return;
    setCompareState(s => ({ ...s, rightDone: true, step: 3, running: false }));
  }

  // ── Q&A ───────────────────────────────────────────────────────────────────
  function addQA() {
    const text = qaInput.trim(); if (!text) return;
    setQaList(l => [...l, { id: nextQId, text, votes: 0, answered: false, active: false }]);
    setNextQId(n => n + 1); setQaInput('');
  }
  function voteQA(id: number, d: number) {
    setQaList(l => l.map(q => q.id === id ? { ...q, votes: Math.max(0, q.votes + d) } : q));
  }
  function toggleActiveQA(id: number) {
    setQaList(l => l.map(q => ({ ...q, active: q.id === id ? !q.active : false })));
  }
  function dismissQA(id: number) {
    setQaList(l => l.map(q => q.id === id ? { ...q, answered: true, active: false } : q));
  }

  // ── Export notes ──────────────────────────────────────────────────────────
  function exportNotes() {
    const lines = segments.map(s => {
      const note = notes[s.id];
      return note ? `## Segment ${s.num} ~ ${s.title}${s.titleItalic ? ' ' + s.titleItalic : ''}\n${note}` : null;
    }).filter(Boolean);
    if (!lines.length) return alert('No notes yet.');
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'event-notes.txt';
    a.click();
  }

  // ── Speaker color helper ──────────────────────────────────────────────────
  function spkColor(spk: string) {
    if (spk === 'ABIE') return C.abie;
    if (spk === 'MERI') return C.meri;
    return C.both;
  }

  // ── Handoff text ──────────────────────────────────────────────────────────
  function handoffText() {
    if (!beat) return '';
    if (beat.speaker === 'BOTH') return 'BOTH ON CAM';
    if (beat.speaker === 'ABIE') return 'ABIE ON CAM ~ Meri on chat';
    return 'MERI ON CAM ~ Abie on chat';
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = seg.beats.length > 1 ? (beatIdx / (seg.beats.length - 1)) * 100 : 100;

  // ── Audience workbook ~ find active poll/workbook ──────────────────────────
  const wbBlock = beat?.blocks.find(b => b.type === 'workbook');
  const pollBlock = beat?.blocks.find(b => b.type === 'poll');

  // ── Styles ────────────────────────────────────────────────────────────────
  const F = FONTS[theme];
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, "Geist Mono", monospace' };
  const sans: React.CSSProperties = { fontFamily: F.sans };
  const serif: React.CSSProperties = { fontFamily: F.serif };

  return (
    <div style={{ background: C.bg, color: C.text, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...sans }}>

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.primary, whiteSpace: 'nowrap', marginRight: 4 }}>
          TM<span style={{ color: C.muted, margin: '0 5px' }}>~</span>CFB
        </div>

        {/* Segment tabs */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
          {segments.map((s, i) => (
            <button key={s.id} onClick={() => goToSeg(i)} style={{
              padding: '3px 9px', borderRadius: 100, fontSize: 9, ...mono,
              cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
              border: `1px solid ${i === segIdx ? C.primary : C.border}`,
              background: i === segIdx ? C.primary : 'transparent',
              color: i === segIdx ? C.bg : C.muted,
              fontWeight: i === segIdx ? 700 : 400,
              transition: 'all 0.15s',
            }}>
              {s.num} {s.title}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ ...mono, fontSize: 10, color: C.muted, paddingRight: 8, borderRight: `1px solid ${C.border}` }}>
            {fmtEvent(eventSecs)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SIZE</span>
            <input type="range" min={14} max={30} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              style={{ width: 50, accentColor: C.primary }} />
          </div>
          <div style={{ ...mono, fontSize: 17, fontWeight: 500, minWidth: 52, textAlign: 'right' }}>{fmt(timerSecs)}</div>
          <Btn primary C={C} onClick={toggleTimer}>{timerRunning ? '⏸' : '▶'} {timerRunning ? 'PAUSE' : 'START'}</Btn>
          <Btn C={C} onClick={resetTimer} style={{ fontSize: 9 }}>↺</Btn>
          <Btn C={C} onClick={() => setView(v => v === 'presenter' ? 'audience' : 'presenter')}>
            {view === 'presenter' ? '🖥 SHARE' : '⬅ BACK'}
          </Btn>
          <Btn onClick={() => setShowNotes(n => !n)} C={C} style={{ color: showNotes ? C.primary : C.muted }}>
            ✎ NOTES
          </Btn>
          <Btn onClick={() => setEditMode(v => !v)} C={C} primary={editMode} style={!editMode ? { color: C.muted } : undefined}>
            {editMode ? '✓ DONE' : '✎ EDIT'}
          </Btn>
          {editMode && (
            <div title={`Sync: ${syncStatus}`} style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: syncStatus === 'offline' ? '#b03a2e' : syncStatus === 'saving' ? '#d4a92a' : C.primary, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: syncStatus === 'saving' ? 'blink 1s ease-in-out infinite' : undefined }} />
              {syncStatus === 'saving' ? 'SYNC' : syncStatus === 'synced' ? 'CLOUD' : syncStatus === 'offline' ? 'OFFLINE' : 'LOCAL'}
            </div>
          )}

          {/* Theme toggle ~ TM / AM */}
          <div style={{ display: 'flex', gap: 0, border: `1px solid ${C.border}`, borderRadius: 100, overflow: 'hidden', marginLeft: 4 }}>
            {(['tm', 'am'] as ThemeKey[]).map(t => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                title={THEMES[t].sub}
                style={{
                  padding: '4px 10px',
                  ...mono,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: 'none',
                  background: t === theme ? C.primary : 'transparent',
                  color: t === theme ? (isDark ? C.bg : C.text) : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                {THEMES[t].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── EDIT MODE TOOLBAR ── */}
      {editMode && (
        <div style={{
          padding: '10px 16px',
          background: '#fff8d6', borderBottom: '2px solid #d4a92a',
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          ...mono,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a5e10' }}>
            ✎ Edit mode
          </span>
          <span style={{ fontSize: 10, color: '#7a5e10', opacity: 0.7 }}>
            ~ Click any text to edit ~ saves automatically
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            {editStatus && <span style={{ fontSize: 9, color: '#7a5e10', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{editStatus}</span>}
            <button onClick={exportConfig} style={{ padding: '5px 12px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: '#3a3a3a', color: '#fff', border: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}>↓ Export</button>
            <button onClick={() => importInputRef.current?.click()} style={{ padding: '5px 12px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: '#7a5e10', border: '1px solid #7a5e10', letterSpacing: '0.08em', textTransform: 'uppercase' }}>↑ Import</button>
            <input type="file" ref={importInputRef} accept=".json" style={{ display: 'none' }} onChange={importConfig} />
            <button onClick={resetEdits} style={{ padding: '5px 12px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: 'transparent', color: '#b03a2e', border: '1px solid #b03a2e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>↺ Reset</button>
          </span>
        </div>
      )}

      {/* Edit-mode highlighting */}
      {editMode && (
        <style>{`
          .os-editable { outline: none; cursor: text; transition: background 0.15s, box-shadow 0.15s; border-radius: 3px; padding: 0 2px; margin: 0 -2px; box-shadow: 0 1px 0 rgba(212,169,42,0.5); }
          .os-editable:hover { background: rgba(255,243,189,0.5); }
          .os-editable:focus { background: rgba(255,243,189,0.85); box-shadow: 0 2px 0 #d4a92a; }
        `}</style>
      )}

      {/* ── HANDOFF BANNER ── */}
      {beat && (
        <div style={{
          padding: '5px 16px', textAlign: 'center', ...mono,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          background: beat.speaker === 'ABIE' ? 'rgba(250,248,245,0.05)' : beat.speaker === 'MERI' ? 'rgba(125,107,90,0.18)' : 'rgba(156,139,122,0.12)',
          color: spkColor(beat.speaker),
          flexShrink: 0,
        }}>
          ↑  {handoffText()}  ↑
        </div>
      )}

      {/* ── LEGEND ── */}
      {view === 'presenter' && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '5px 16px', background: C.surface2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Roles ~</span>
          {Object.entries(SPEAKERS).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, ...mono, fontSize: 9, color: C.muted }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: spkColor(k) }} />
              {v.name}
            </div>
          ))}
          <span style={{ marginLeft: 'auto', ...mono, fontSize: 9, color: C.muted, opacity: 0.55 }}>
            ← → beats &nbsp;·&nbsp; SPACE timer &nbsp;·&nbsp; R reset &nbsp;·&nbsp; V audience &nbsp;·&nbsp; N notes
          </span>
        </div>
      )}

      {/* ── NOTES DRAWER ── */}
      {showNotes && view === 'presenter' && (
        <div style={{ background: '#fff8d6', borderBottom: '2px solid #d4a92a', padding: '10px 16px', flexShrink: 0, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a5e10', marginBottom: 6 }}>
              Seg {seg.num} notes ~ auto-saved
            </div>
            <textarea
              value={notes[seg.id] ?? ''}
              onChange={e => saveNote(seg.id, e.target.value)}
              placeholder="Type notes for this segment..."
              style={{ width: '100%', minHeight: 56, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(212,169,42,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'var(--font-manrope, sans-serif)', color: '#3a3a3a', resize: 'vertical', outline: 'none' }}
            />
          </div>
          <button onClick={exportNotes} style={{ padding: '6px 14px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', background: '#3a3a3a', color: '#fff', border: 'none', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            ↓ Export notes
          </button>
        </div>
      )}

      {/* ── PRESENTER VIEW ── */}
      {view === 'presenter' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* SIDEBAR */}
          <div style={{ width: 190, background: C.surface, borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0, padding: '12px 0' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, padding: '0 12px 8px' }}>Beats</div>
            {seg.beats.map((b, i) => (
              <div key={b.id} onClick={() => goToBeat(i)} style={{
                padding: '8px 12px', cursor: 'pointer', borderLeft: `3px solid ${i === beatIdx ? C.primary : 'transparent'}`,
                background: i === beatIdx ? 'rgba(125,107,90,0.1)' : 'transparent',
                transition: 'all 0.15s',
              }}>
                <div style={{ ...mono, fontSize: 9, color: C.muted, marginBottom: 2, letterSpacing: '0.06em' }}>
                  {seg.num}.{String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{b.title}</div>
                <div style={{ ...mono, fontSize: 9, marginTop: 2, color: spkColor(b.speaker), letterSpacing: '0.05em' }}>
                  {SPEAKERS[b.speaker]?.name}
                </div>
              </div>
            ))}
          </div>

          {/* PROMPTER */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: `1px solid ${C.border}`, minWidth: 0 }}>
            {/* Seg header */}
            <div style={{ padding: '12px 24px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
                  SEGMENT {seg.num}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                  <Editable key={`title-${segIdx}`} value={seg.title} editMode={editMode} onSave={v => saveEdit(`${segIdx}.title`, v)} />
                  {(seg.titleItalic || editMode) && <>{' '}<em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary, textTransform: 'none', letterSpacing: 0 }}>
                    <Editable key={`titleI-${segIdx}`} value={seg.titleItalic} editMode={editMode} onSave={v => saveEdit(`${segIdx}.titleItalic`, v)} />
                  </em></>}
                </div>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: 12, color: C.muted, marginTop: 3 }}>
                  <Editable key={`sub-${segIdx}`} value={seg.subtitle} editMode={editMode} onSave={v => saveEdit(`${segIdx}.subtitle`, v)} />
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                  {seg.speakers.map(sk => (
                    <div key={sk} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 100, border: `1px solid ${spkColor(sk)}`, ...mono, fontSize: 9, fontWeight: 500, color: spkColor(sk), letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: spkColor(sk) }} />
                      {SPEAKERS[sk]?.name}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...mono, fontSize: 9, color: C.muted, padding: '3px 10px', border: `1px solid ${C.border}`, borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.07em', textTransform: 'uppercase', alignSelf: 'flex-start', marginTop: 2 }}>
                ⏱ {seg.duration}
              </div>
            </div>

            {/* Script */}
            <div ref={prompterRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 60px', background: C.bg }}>
              {seg.beats.map((b, bi) => (
                <div key={b.id} id={`beat-${bi}`} style={{ marginBottom: bi < seg.beats.length - 1 ? 0 : 0 }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, marginBottom: 14, paddingBottom: 7, borderBottom: `1px solid ${C.border}` }}>
                    {seg.num}.{String(bi + 1).padStart(2, '0')} ~{' '}
                    <Editable key={`bt-${segIdx}-${bi}`} value={b.title} editMode={editMode} onSave={v => saveEdit(`${segIdx}.beats.${bi}.title`, v)} />
                  </div>
                  {b.blocks.map((bl, bli) => {
                    const blPath = `${segIdx}.beats.${bi}.blocks.${bli}`;
                    return (
                    <div key={bli} style={{ marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      {bl.type === 'stage' && (
                        <div style={{ ...mono, fontSize: 11, color: C.muted, background: C.surface2, border: `1px dashed rgba(156,139,122,0.3)`, borderRadius: 6, padding: '8px 12px', letterSpacing: '0.03em', width: '100%' }}>
                          🎬{' '}
                          <Editable key={`stage-${segIdx}-${bi}-${bli}`} value={bl.text ?? ''} editMode={editMode} onSave={v => saveEdit(`${blPath}.text`, v)} />
                        </div>
                      )}
                      {bl.type === 'poll' && (
                        <div style={{ background: 'rgba(125,107,90,0.12)', border: `1px solid rgba(125,107,90,0.3)`, borderRadius: 8, padding: '10px 14px', width: '100%' }}>
                          <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.primary, marginBottom: 6 }}>~ Audience moment</div>
                          <div style={{ ...mono, fontSize: 11, color: C.text }}>
                            <Editable key={`poll-${segIdx}-${bi}-${bli}`} value={(bl.text ?? '').replace(/\n/g, ' · ')} editMode={editMode} onSave={v => saveEdit(`${blPath}.text`, v.replace(/ · /g, '\n'))} />
                          </div>
                        </div>
                      )}
                      {bl.type === 'workbook' && (
                        <div style={{ background: 'rgba(156,139,122,0.12)', border: `1px solid rgba(156,139,122,0.3)`, borderRadius: 8, padding: '10px 14px', width: '100%' }}>
                          <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8bab9a', marginBottom: 6 }}>~ Workbook moment</div>
                          <div style={{ ...mono, fontSize: 11, color: C.text }}>
                            <Editable key={`wb-${segIdx}-${bi}-${bli}`} value={bl.text ?? ''} editMode={editMode} onSave={v => saveEdit(`${blPath}.text`, v)} />
                          </div>
                        </div>
                      )}
                      {(bl.type === 'scripted' || bl.type === 'bullets') && (
                        <>
                          <div style={{ width: 56, flexShrink: 0, paddingTop: 1 }}>
                            {bl.speaker && (
                              <div style={{ ...mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: spkColor(bl.speaker) }}>
                                {SPEAKERS[bl.speaker]?.name}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, color: C.muted }}>
                              {bl.type === 'scripted' ? '✦ scripted' : '~ bullets'}
                            </div>
                            {bl.type === 'scripted' ? (
                              <Editable
                                key={`scr-${segIdx}-${bi}-${bli}`}
                                tagName="div"
                                value={(bl.text ?? '').replace(/<em>/g, `<em style="font-style:italic;color:${C.primary}">`)}
                                editMode={editMode}
                                onSave={v => saveEdit(`${blPath}.text`, v.replace(/<em [^>]*>/g, '<em>'))}
                                style={{ ...serif, fontSize, lineHeight: 1.75, fontWeight: 400, color: C.text }}
                              />
                            ) : (
                              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {bl.items?.map((item, ii) => (
                                  <li key={ii} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <span style={{ ...mono, fontSize: 12, color: C.primary, flexShrink: 0, paddingTop: 3 }}>~</span>
                                    <Editable
                                      key={`b-${segIdx}-${bi}-${bli}-${ii}`}
                                      value={item.replace(/<em>/g, `<em style="font-style:italic;color:${C.primary}">`)}
                                      editMode={editMode}
                                      onSave={v => saveEdit(`${blPath}.items.${ii}`, v.replace(/<em [^>]*>/g, '<em>'))}
                                      style={{ ...serif, fontSize: fontSize - 2, lineHeight: 1.6, color: C.text }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );})}
                  {bi < seg.beats.length - 1 && (
                    <div style={{ height: 1, background: C.border, margin: '16px 0 20px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: C.surface2, flexShrink: 0 }}>
              <div style={{ height: '100%', background: C.primary, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
          </div>

          {/* DEMO PANEL */}
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.surface }}>
            {/* Panel header */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: C.text }}>
                {{ demo: 'Live demo', compare: 'Compare', products: '4 Claudes', showcase: 'Behind scenes', qa: 'Q&A queue' }[mode]}
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {(['demo', 'compare', 'products', 'showcase', 'qa'] as Mode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    padding: '3px 9px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                    border: `1px solid ${m === mode ? C.primary : C.border}`,
                    background: m === mode ? C.primary : 'transparent',
                    color: m === mode ? C.bg : C.muted,
                    transition: 'all 0.15s',
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Demo iframe */}
              {mode === 'demo' && (
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                  {seg.panelUrl ? (
                    <iframe src={seg.panelUrl} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 24 }}>
                      <div style={{ fontSize: 28, opacity: 0.3 }}>↗</div>
                      <div style={{ ...serif, fontStyle: 'italic', fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.6 }}>
                        Switch to compare, products,<br />or showcase for this segment
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Compare */}
              {mode === 'compare' && activePreset && (
                <ComparePanel
                  preset={activePreset}
                  state={compareState}
                  onRun={runCompare}
                  onReset={resetCompare}
                  C={C} mono={mono} serif={serif}
                />
              )}
              {mode === 'compare' && !activePreset && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, ...serif, fontStyle: 'italic', fontSize: 14, color: C.muted }}>
                  No compare preset for this segment
                </div>
              )}

              {/* Products */}
              {mode === 'products' && <ProductsPanel C={C} mono={mono} serif={serif} />}

              {/* Showcase */}
              {mode === 'showcase' && (
                <ShowcasePanel showTab={showTab} onTabChange={setShowTab} C={C} mono={mono} serif={serif} />
              )}

              {/* Q&A */}
              {mode === 'qa' && (
                <QAPanel
                  qaList={qaList} qaInput={qaInput} inputRef={qaInputRef}
                  onInput={setQaInput} onAdd={addQA}
                  onVote={voteQA} onActive={toggleActiveQA} onDismiss={dismissQA}
                  C={C} mono={mono} serif={serif}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIENCE VIEW ── */}
      {view === 'audience' && (
        <AudienceView
          seg={seg} segIdx={segIdx} beat={beatIdx}
          totalSegs={segments.length}
          wbBlock={wbBlock} pollBlock={pollBlock}
          timerSecs={eventSecs}
          fontSize={fontSize}
          C={C} mono={mono} serif={serif} sans={sans}
          spkColor={spkColor}
          theme={theme}
          editMode={editMode}
          onSaveEdit={saveEdit}
        />
      )}
    </div>
  );
}

// ── Reusable Btn ─────────────────────────────────────────────────────────────
function Btn({ children, onClick, primary, style, C }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean;
  style?: React.CSSProperties;
  C?: Palette;
}) {
  const p = C?.primary ?? '#7D6B5A';
  const bg = C?.bg ?? '#1a1613';
  const text = C?.text ?? '#FAF8F5';
  const border = C?.border ?? 'rgba(156,139,122,0.3)';
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 100, fontSize: 9,
      fontFamily: 'ui-monospace, monospace', fontWeight: 700,
      cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase',
      border: `1px solid ${primary ? p : border}`,
      background: primary ? p : 'transparent',
      color: primary ? bg : text,
      transition: 'all 0.15s', whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </button>
  );
}

// ── Compare Panel ─────────────────────────────────────────────────────────────
function ComparePanel({ preset, state, onRun, onReset, C, mono, serif }: {
  preset: ComparePreset;
  state: CompareState;
  onRun: () => void;
  onReset: () => void;
  C: Record<string, string>;
  mono: React.CSSProperties;
  serif: React.CSSProperties;
}) {
  const steps = ['Ready', 'Left runs', 'Right runs', 'Lands'];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface, overflowX: 'auto' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: state.step === i ? C.text : state.step > i ? C.primaryHover : C.muted, whiteSpace: 'nowrap' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: state.step === i ? C.primary : state.step > i ? C.primaryHover : C.border }} />
            {s}
            {i < 3 && <span style={{ color: C.border, margin: '0 2px' }}>~</span>}
          </div>
        ))}
      </div>
      {/* Run row */}
      <div style={{ display: 'flex', gap: 6, padding: '7px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, alignItems: 'center' }}>
        <button onClick={onRun} disabled={state.running} style={{ padding: '5px 16px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: state.running ? 'not-allowed' : 'pointer', border: 'none', background: state.running ? C.border : C.primary, color: state.running ? C.muted : C.bg, letterSpacing: '0.09em', textTransform: 'uppercase', opacity: state.running ? 0.5 : 1 }}>
          {state.running ? '● RUNNING' : state.step === 3 ? '↺ AGAIN' : '▶ RUN'}
        </button>
        <button onClick={onReset} style={{ padding: '5px 14px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
          RESET
        </button>
        <span style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{preset.scenario}</span>
      </div>
      {/* Columns */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {[
          { tag: preset.leftTag, title: preset.leftTitle, why: preset.leftWhy, prompt: preset.leftPrompt, output: state.leftText, annLbl: preset.leftAnnLbl, annTxt: preset.leftAnnTxt, done: state.leftDone, isLeft: true },
          { tag: preset.rightTag, title: preset.rightTitle, why: preset.rightWhy, prompt: preset.rightPrompt, output: state.rightText, annLbl: preset.rightAnnLbl, annTxt: preset.rightAnnTxt, done: state.rightDone, isLeft: false },
        ].map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: ci === 0 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5, background: col.isLeft ? 'rgba(139,58,58,0.12)' : 'rgba(74,124,89,0.12)', color: col.isLeft ? '#b06060' : '#4a7c59', border: `1px solid ${col.isLeft ? 'rgba(139,58,58,0.25)' : 'rgba(74,124,89,0.25)'}` }}>
                {col.tag}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
                dangerouslySetInnerHTML={{ __html: col.title.replace(/<em>/g, `<em style="font-family:${serif.fontFamily as string};font-style:italic;font-weight:400;color:${C.primary};text-transform:none">`) }} />
              <div style={{ ...serif, fontStyle: 'italic', fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{col.why}</div>
            </div>
            <div style={{ padding: '6px 12px', background: C.surface2, flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 3 }}>Prompt</div>
              <div style={{ ...mono, fontSize: 10, lineHeight: 1.5, color: col.isLeft || state.step >= 2 ? C.text : C.muted, opacity: col.isLeft || state.step >= 2 ? 1 : 0.5, whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>
                {col.prompt}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              <div style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 7 }}>Response</div>
              <div style={{ ...serif, fontSize: 12, lineHeight: 1.65, color: C.text, whiteSpace: 'pre-wrap', minHeight: 32 }}>
                {col.output || <span style={{ fontStyle: 'italic', opacity: 0.4 }}>{col.isLeft ? 'Hit RUN...' : 'Unlocks after left...'}</span>}
                {((col.isLeft && state.step === 1) || (!col.isLeft && state.step === 2)) && !col.done && (
                  <span style={{ animation: 'blink 0.65s step-end infinite', color: C.primary }}>▋</span>
                )}
              </div>
            </div>
            {col.done && (
              <div style={{ margin: '0 12px 10px', padding: '8px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface2 }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>{col.annLbl}</div>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: 11, color: C.text, lineHeight: 1.5 }}>{col.annTxt}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {state.step === 3 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px', background: C.surface, flexShrink: 0 }}>
          <div style={{ ...serif, fontStyle: 'italic', fontSize: 13, color: C.text, lineHeight: 1.6, textAlign: 'center' }}
            dangerouslySetInnerHTML={{ __html: preset.landing.replace(/<em>/g, `<em style="color:${C.primary};font-style:italic">`) }} />
        </div>
      )}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ── Products Panel ────────────────────────────────────────────────────────────
// VIP value stack ~ used in segment 07 audience view (the close)
interface StackItem {
  name: string;
  desc: string;
  value: number | 'priceless';
}
// VIP stack mirrors the landing page perks 1:1 so what people see at signup
// matches what they see at the close (no surprises, builds trust)
const VIP_STACK: StackItem[] = [
  { name: 'Full replay + transcript',         desc: 'Rewatch any demo · copy any prompt · 30-day access',                                          value: 97 },
  { name: 'The Claude Vault',                 desc: "Private dashboard setups + Talent Mucho's premium proprietary Claude skills",                  value: 297 },
  { name: 'VIP-only group follow-up',         desc: '45-min private session with Abie & Meri · small group',                                       value: 'priceless' },
  { name: '30-day Premium Skool access',      desc: "Closed mentorship · weekly Vibe Coding · €49/mo after, cancel anytime",                       value: 49 },
];

// Three Doors Out ~ used in segment 07 audience view (the close)
interface DoorOption {
  label: string;
  name: string;
  italic: string;
  price: string;
  pitch: string;
  bestFor: string;
  whatYouGet: string[];
  nextStep: string;
  cta: string;
  ctaUrl: string;
  highlight?: boolean;
}
const THREE_DOORS: DoorOption[] = [
  {
    label: 'Door 1',
    name: 'Free',
    italic: 'just try it',
    price: '€0',
    pitch: 'Open Claude tonight. Try one demo from what you saw.',
    bestFor: 'You\'re curious. Just exploring. Not ready to commit anything.',
    whatYouGet: [
      "Free Skool tier ~ community access, no live sessions",
      "The mindset shift you got tonight",
      "Whatever you remember from this session",
    ],
    nextStep: 'Close this tab. Open claude.ai. Try one prompt.',
    cta: 'Try Claude tonight',
    ctaUrl: 'https://claude.ai/new',
  },
  {
    label: 'Door 2',
    name: 'VIP',
    italic: '€47 ~ the map',
    price: '€47',
    pitch: "The recording, the skill library, 30 days inside our community.",
    bestFor: 'Most of you. You don\'t want to figure this out alone over 6 months.',
    whatYouGet: [
      "Full replay + transcript ~ 30-day access (€97)",
      "The Claude Vault ~ Talent Mucho's premium proprietary skills (€297)",
      "VIP-only group follow-up ~ 45 min with Abie + Meri",
      "30-day Premium Skool · €49/mo after, cancel anytime (€49)",
      "Early access to the upcoming Bootcamp",
      "+ 14-day refund · no form · no questions",
    ],
    nextStep: 'Click VIP link → Stripe → instant access tomorrow morning.',
    cta: 'Join VIP — €47',
    ctaUrl: 'https://buy.stripe.com/00w3cpd0W40HbGxgcl73G04',
    highlight: true,
  },
  {
    label: 'Door 3',
    name: 'Custom',
    italic: 'we build it',
    price: 'Talk to us',
    pitch: "We build the AI stack inside your business and place a trained VA inside your team.",
    bestFor: "Founders who are booked-out. Need this done, not learned.",
    whatYouGet: [
      "AI-Trained Ops Manager built for your business",
      "Custom skills + connectors + scheduled runs",
      "A trained VA placed inside your team",
      "Monthly partnership ~ the Operate pillar",
    ],
    nextStep: 'Book a free 30-min call at talentmucho.com/booking',
    cta: 'Book free call',
    ctaUrl: 'https://talentmucho.com/booking',
  },
];

// "A day with your AI Ops Manager" ~ used in segment 05 audience view
interface OpsEvent {
  time: string;
  icon: string;
  title: string;
  oneLiner: string;
  detail: string;
  skill: string;
  connectors: string[];
  sample: string;
  saved: string;
}

const OPS_MANAGER_DAY: OpsEvent[] = [
  {
    time: '6:45 AM',
    icon: '☕',
    title: "You're still asleep",
    oneLiner: "Sarah's about to clock in. You're snoring.",
    detail: "Sarah is your AI Ops Manager. She runs on a schedule, lives inside a Claude Project trained on your business, and has access to your tools. While you sleep, she's lining up the day so you can wake up to results, not a to-do list.",
    skill: 'Schedule trigger',
    connectors: ['Calendar', 'Drive'],
    sample: '~ Sarah is reviewing her morning brief ~',
    saved: 'all of it',
  },
  {
    time: '7:00 AM',
    icon: '📧',
    title: 'Triages overnight inbox',
    oneLiner: "Reads 47 emails. Flags 3 for you. Drafts 12 replies in your voice.",
    detail: "Sarah opens Gmail, reads every overnight email, sorts by urgency, drafts replies in your tone for the easy ones, and flags only the 3 that need a human. The 12 drafts sit waiting for your one-click approval.",
    skill: 'Inbox Triage',
    connectors: ['Gmail', 'Drive'],
    sample: '"Hey Sarah, hope you\'re doing well! Quick one ~ invoice INV-204 hit the 7-day mark today..."',
    saved: '~3 hours',
  },
  {
    time: '8:30 AM',
    icon: '📊',
    title: 'Drafts the Monday report',
    oneLiner: "Pulls last week's metrics. Writes the recap. Spots 2 blockers.",
    detail: "Sarah pulls the numbers from your sheets, compares against last week, drafts the full Monday recap with bullet highlights, and flags 2 blockers she thinks deserve attention.",
    skill: 'Weekly Report',
    connectors: ['Sheets', 'Drive', 'Slack'],
    sample: "Revenue +12% WoW · Outreach replies down 30% (needs a look) · Sarah's invoice still outstanding",
    saved: '~1 hour',
  },
  {
    time: '9:30 AM',
    icon: '🎯',
    title: 'Qualifies 5 new leads',
    oneLiner: "Scores them. Drafts a first reply. Updates the CRM.",
    detail: "5 new leads landed overnight. Sarah scans LinkedIn + their website, scores each one, drafts a tailored first reply, and updates the CRM with notes. You only see the qualified ones.",
    skill: 'Lead Qualification',
    connectors: ['CRM', 'Gmail', 'Chrome agent'],
    sample: 'Lead 4/5 (€8K agency, MVP fit, replied to Threads post) ~ ready to reply',
    saved: '~45 minutes',
  },
  {
    time: '11:00 AM',
    icon: '🤝',
    title: 'Onboards a new client',
    oneLiner: "Sends welcome email. Generates SOPs. Creates Day-1 task list.",
    detail: "New client signed yesterday. Sarah pulls the intake form, writes a personalised welcome email in your voice, generates the project SOP doc, schedules the kickoff, and posts the Day-1 task list to your project channel.",
    skill: 'Onboarding',
    connectors: ['Gmail', 'Drive', 'Calendar', 'Slack'],
    sample: '"Welcome aboard, Maria! Couldn\'t be more excited. Here\'s how Week 1 looks..."',
    saved: '~2 hours',
  },
  {
    time: '2:00 PM',
    icon: '📝',
    title: 'Updates your project notes',
    oneLiner: "Writes up yesterday's call. Drafts decisions. Pings the team.",
    detail: "Yesterday's client call was 47 minutes. Sarah pulls the transcript, extracts decisions made, writes the action items, updates the project doc, and pings the relevant teammates with their next-step assignments.",
    skill: 'Meeting Notes',
    connectors: ['Notion', 'Drive', 'Slack'],
    sample: '3 decisions logged · 5 action items assigned · Meri tagged on the brief',
    saved: '~40 minutes',
  },
  {
    time: '4:00 PM',
    icon: '🚨',
    title: 'Chases overdue invoices',
    oneLiner: "Finds 4 invoices past due. Drafts reminders in matching tone.",
    detail: "Sarah scans Stripe, finds invoices past 7 days, looks up each client's relationship history (first time late? pattern?), and drafts reminders in the right tone ~ gentle for first-timers, firmer for repeat offenders.",
    skill: 'Invoice Chaser',
    connectors: ['Stripe', 'Gmail', 'CRM'],
    sample: 'INV-204 (Sarah, gentle) · INV-198 (Marco, firm) · INV-187 (Lisa, final notice)',
    saved: '~30 minutes',
  },
  {
    time: '5:30 PM',
    icon: '📤',
    title: 'Posts the EOD summary',
    oneLiner: "Done for the day. Posts a 5-line wrap-up to Slack.",
    detail: "Sarah closes out the day with a clean Slack summary: what got done, what got drafted, what needs your one-click sign-off tomorrow, and the 1 thing she couldn't figure out herself.",
    skill: 'EOD Summary',
    connectors: ['Slack'],
    sample: '✓ 12 emails drafted · ✓ Monday report ready · ⏳ 3 awaiting your sign-off · ❓ 1 question for tomorrow',
    saved: 'mental load',
  },
];

const OPS_TOTAL_SAVED = '~7+ hours per day';

// Building blocks ~ the actual Claude features behind each level, in TM voice
const CLAUDE_BUILDING_BLOCKS = [
  {
    name: 'Claude Skill',
    short: 'one-task pro',
    desc: "A specific job Claude nails every time. Built once, reused forever.",
    example: "Our Carousel Generator ~ paste a blog, get 7 slides, copy in your voice, takes 30 seconds. We have one for proposals, one for Threads, one for client briefs. Build a few and your weeks change shape.",
    simulation: {
      prompt: "Turn this blog post into an Instagram carousel.",
      steps: [
        '↳ Reading blog (1,200 words)',
        '↳ Extracting the 3 key insights',
        '↳ Structuring 7 slides ~ hook · setup · takeaways · CTA',
        '↳ Writing each slide in your brand voice',
        '✓ 7-slide carousel ready in 28 seconds',
      ],
    },
  },
  {
    name: 'Claude Project',
    short: 'trained employee',
    desc: "A workspace where Claude has actually been onboarded to your business.",
    example: "Drop your docs, your tone, your clients, your offers ~ once. Every chat in there starts with Claude already knowing you. The difference between hiring a temp and hiring an employee.",
    simulation: {
      prompt: "Draft a follow-up to Sarah from the call yesterday.",
      steps: [
        '↳ Pulling Sarah\'s profile from Project context',
        '↳ Reading the call notes from yesterday',
        '↳ Matching your tone (casual, no "kindly")',
        '↳ Using your standard follow-up structure',
        '✓ Draft ready ~ no re-explaining who Sarah is',
      ],
    },
  },
  {
    name: 'Claude Team',
    short: 'shared employee',
    desc: "Same trained employee. Everyone on your team has access to it.",
    example: "Add a new client to the Project on Monday ~ your VA's Claude knows about them by Tuesday's standup. No more \"have you got the latest brief?\" Same Claude, same context, same updates.",
    simulation: {
      prompt: "(Meri uploaded the Maria client brief on Monday)",
      steps: [
        '↳ Project syncs the brief across the team',
        '↳ Tuesday: Abie opens her Claude',
        '↳ Claude already knows Maria, the offer, the timeline',
        '↳ No Slack ping. No "did you see the doc?"',
        '✓ Same Claude. Same context. Same employee.',
      ],
    },
  },
];

// Abie's actual stack ~ used in segment 06 showcase AND the segment 04 spin-the-wheel
const ABIE_STACK = [
  { icon: 'CLI', name: 'Email Co-pilot CLI', short: 'Email CLI', desc: 'One command checks, summarises, drafts replies in my voice.' },
  { icon: 'PRP', name: 'Proposal System', short: 'Proposals', desc: 'Messy discovery notes in. Polished proposal out ~ structured by problem, approach, deliverables, timeline, price.' },
  { icon: 'DB', name: 'Personal Dashboard', short: 'Dashboard', desc: 'Replaces Notion + Coda. Custom-built, lives on my own site.' },
  { icon: '⚡', name: 'ADHD Command Centre', short: 'ADHD CC', desc: "Keeps me on track on the days my brain doesn't want to." },
  { icon: '▣', name: 'Carousel Studio', short: 'Carousels', desc: 'Drafts Threads & Instagram in my brand voice.' },
  { icon: 'UGC', name: 'UGC Pipeline', short: 'UGC', desc: 'Tracks every brand deal, deliverable, payment.' },
  { icon: '$', name: 'Sales Pipeline', short: 'Sales', desc: 'Leads, follow-ups, proposals ~ one view.' },
];

interface ClaudeProduct {
  icon: string;
  name: string;
  tag: string;
  desc: string;
  best: string;
  simulation: { prompt: string; steps: string[] };
}

const CLAUDE_PRODUCTS: ClaudeProduct[] = [
  {
    icon: '01', name: 'Claude Chat', tag: 'claude.ai ~ start here',
    desc: "The chat window. Where 90% of your wins start.",
    best: 'emails, content, replies, decisions',
    simulation: {
      prompt: "Help me reply to this difficult client email...",
      steps: [
        '↳ Reading your message + the client thread',
        '↳ Drafting a reply that acknowledges + redirects',
        '↳ Offering 3 versions: warm, neutral, firm',
        '✓ Done in under 30 seconds',
      ],
    },
  },
  {
    icon: '02', name: 'Claude Cowork', tag: 'desktop ~ runs alongside your work',
    desc: "Lives next to your files. Stops the copy-paste tax.",
    best: 'client docs, daily ops, multi-file work',
    simulation: {
      prompt: "Organise my Downloads folder by category",
      steps: [
        '↳ Scanning 247 files in /Downloads',
        '↳ Sorting → Images / Documents / Spreadsheets / Invoices',
        '↳ Renaming invoices by client + date',
        '✓ All clean. 3 hours of admin done in 30 seconds.',
      ],
    },
  },
  {
    icon: '03', name: 'Claude Code', tag: 'terminal ~ for builders',
    desc: "Plain-English coding. You describe, it builds.",
    best: 'automations, CSV cleaners, custom tools',
    simulation: {
      prompt: "Add a Privacy Policy page to talentmucho.com",
      steps: [
        '↳ Reading repo structure',
        '↳ Writing /app/privacy/page.tsx with GDPR copy',
        '↳ git commit -m "feat: add privacy policy"',
        '↳ Deploying to Vercel',
        '✓ Live at talentmucho.com/privacy in 90 seconds',
      ],
    },
  },
  {
    icon: '04', name: 'Claude in Chrome', tag: 'browser agent ~ does tasks for you',
    desc: "Browses, clicks, fills forms on your behalf.",
    best: 'research, lead gen, repetitive web tasks',
    simulation: {
      prompt: "Find 10 marketing agencies in Madrid hiring VAs",
      steps: [
        '↳ Opening LinkedIn + filtering by industry + city',
        '↳ Scanning 60 profiles for "hiring" + "remote"',
        '↳ Pulling: name, role, contact, recent post',
        '↳ Saving to Google Sheet you can act on',
        '✓ 10 qualified leads, ready to outreach',
      ],
    },
  },
];

function ProductsPanel({ C, mono, serif }: { C: Record<string, string>; mono: React.CSSProperties; serif: React.CSSProperties }) {
  const products = CLAUDE_PRODUCTS;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
        The four <em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary, textTransform: 'none' }}>Claudes</em>
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        Same brain. Four doors. Pick the one that matches what you&apos;re trying to do.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {products.map(p => (
          <div key={p.icon} style={{ padding: '11px 13px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.surface2, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 7, background: 'rgba(125,107,90,0.2)', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 11, fontWeight: 900 }}>{p.icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 2 }}>{p.name}</div>
              <div style={{ ...mono, fontSize: 9, color: C.primary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>{p.tag}</div>
              <div style={{ ...serif, fontSize: 12, lineHeight: 1.5, color: C.text }}>{p.desc}</div>
              <div style={{ ...mono, fontSize: 9, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 5 }}>
                Best for ~ <span style={{ color: C.text, fontWeight: 700 }}>{p.best}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Showcase Panel ────────────────────────────────────────────────────────────
function ShowcasePanel({ showTab, onTabChange, C, mono, serif }: {
  showTab: ShowTab; onTabChange: (t: ShowTab) => void;
  C: Record<string, string>; mono: React.CSSProperties; serif: React.CSSProperties;
}) {
  const abieItems = ABIE_STACK;
  const meriItems = [
    { icon: '📥', name: 'Inbox Triage AI', desc: 'Sorts, drafts replies in client voice, flags only what needs a human. 3hr/day > 30min.' },
    { icon: '🎯', name: 'Lead Qualification AI', desc: 'Scores leads, drafts first reply. VA only handles real prospects.' },
    { icon: '✍', name: 'Content Review AI', desc: "Checks every post against client's brand voice before going out." },
    { icon: '🤝', name: 'Onboarding AI', desc: 'Generates the full onboarding brief, SOPs, Day-1 task list.' },
    { icon: '📊', name: 'Weekly Report AI', desc: 'Pulls metrics, drafts the recap, flags blockers.' },
    { icon: '🔁', name: 'FAQ Voice AI', desc: "Trained on each client's past replies. Same 10 questions handled in their voice." },
  ];

  const items = showTab === 'abie' ? abieItems : meriItems;
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['abie', 'meri'] as ShowTab[]).map(t => (
          <button key={t} onClick={() => onTabChange(t)} style={{ padding: '4px 13px', borderRadius: 100, ...mono, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase', border: `1px solid ${t === showTab ? C.text : C.border}`, background: t === showTab ? C.surface : 'transparent', color: t === showTab ? C.primary : C.muted, transition: 'all 0.15s' }}>
            {t === 'abie' ? "Abie's stack" : 'AI employees'}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>
        {showTab === 'abie' ? <>Abie&apos;s <em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary, textTransform: 'none' }}>setup</em></> : <>Talent Mucho&apos;s <em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary, textTransform: 'none' }}>AI employees</em></>}
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        {showTab === 'abie' ? "Most days I don't open Gmail. I open my terminal." : "We don't replace VAs. We multiply what one VA can do."}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 6, background: 'rgba(125,107,90,0.2)', color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 10, fontWeight: 900 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 3 }}>{item.name}</div>
              <div style={{ ...serif, fontSize: 12, lineHeight: 1.5, color: C.muted }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 7, background: C.surface, color: C.primary, ...serif, fontStyle: 'italic', fontSize: 12, lineHeight: 1.55, textAlign: 'center' }}>
        {showTab === 'abie'
          ? <>Everyone should have <em style={{ color: C.text, fontStyle: 'italic' }}>a system that&apos;s yours.</em><br />Not rented from someone else&apos;s tool.</>
          : <>Same hours, more clients ~ <em style={{ color: C.text, fontStyle: 'italic' }}>or</em> same clients, less burnout.<br />The VA chooses.</>
        }
      </div>
    </div>
  );
}

// ── Q&A Panel ─────────────────────────────────────────────────────────────────
function QAPanel({ qaList, qaInput, inputRef, onInput, onAdd, onVote, onActive, onDismiss, C, mono, serif }: {
  qaList: QAItem[]; qaInput: string; inputRef: React.RefObject<HTMLInputElement | null>;
  onInput: (v: string) => void; onAdd: () => void;
  onVote: (id: number, d: number) => void; onActive: (id: number) => void; onDismiss: (id: number) => void;
  C: Record<string, string>; mono: React.CSSProperties; serif: React.CSSProperties;
}) {
  const live = qaList.filter(q => !q.answered).sort((a, b) => b.votes - a.votes);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 7, padding: '11px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <input ref={inputRef} type="text" value={qaInput} onChange={e => onInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onAdd()}
          placeholder="Question from chat..."
          style={{ flex: 1, padding: '7px 12px', border: `1px solid ${C.border}`, borderRadius: 100, ...mono, fontSize: 11, background: C.bg, color: C.text, outline: 'none' }} />
        <button onClick={onAdd} style={{ padding: '7px 16px', borderRadius: 100, ...mono, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: C.primary, color: C.bg, letterSpacing: '0.07em', textTransform: 'uppercase' }}>+ Add</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {live.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.45 }}>
            <div style={{ ...serif, fontStyle: 'italic', fontSize: 14, color: C.muted }}>No questions yet</div>
            <div style={{ ...mono, fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Meri pulls from chat</div>
          </div>
        ) : live.map(q => (
          <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 7, border: `1px solid ${q.active ? C.primary : C.border}`, background: q.active ? 'rgba(125,107,90,0.08)' : C.surface, transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <button onClick={() => onVote(q.id, 1)} style={{ fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: 2, opacity: 0.5, color: C.text }}>▲</button>
              <div style={{ ...mono, fontSize: 11, fontWeight: 500, color: C.muted }}>{q.votes}</div>
              <button onClick={() => onVote(q.id, -1)} style={{ fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1, padding: 2, opacity: 0.5, color: C.text }}>▼</button>
            </div>
            <div style={{ ...serif, fontSize: 13, lineHeight: 1.5, color: C.text, flex: 1, paddingTop: 2 }}>{q.text}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              <button onClick={() => onActive(q.id)} style={{ padding: '3px 8px', borderRadius: 100, ...mono, fontSize: 9, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: q.active ? C.primary : C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {q.active ? '✓ Live' : 'Go live'}
              </button>
              <button onClick={() => onDismiss(q.id)} style={{ padding: '3px 8px', borderRadius: 100, ...mono, fontSize: 9, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Done ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── OpsManagerDay ~ segment 05 audience view: a day with your AI Ops Manager ─
function OpsManagerDay({ C, mono, sans, serif, scale = 1 }: {
  C: Palette;
  mono: React.CSSProperties;
  sans: React.CSSProperties;
  serif: React.CSSProperties;
  scale?: number; // 1.0 = base, comes from the top-bar font slider
}) {
  const [activeIdx, setActiveIdx] = useState(1); // start at 7AM (skip the "still asleep" intro)
  const [autoplay, setAutoplay] = useState(false);
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  const [blockSteps, setBlockSteps] = useState(0);
  const [expandedExamples, setExpandedExamples] = useState<Set<number>>(new Set());
  const onDark = '#FAF8F5';
  const active = OPS_MANAGER_DAY[activeIdx];
  const sz = (px: number) => Math.round(px * scale);

  // Stagger reveal of simulation steps for the active building block
  useEffect(() => {
    if (activeBlock === null) { setBlockSteps(0); return; }
    const total = CLAUDE_BUILDING_BLOCKS[activeBlock].simulation.steps.length;
    setBlockSteps(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setBlockSteps(i);
      if (i < total) setTimeout(tick, 700);
    };
    const initial = setTimeout(tick, 350);
    return () => clearTimeout(initial);
  }, [activeBlock]);

  // autoplay: cycle through events every 5s when on
  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => {
      setActiveIdx(i => (i + 1) % OPS_MANAGER_DAY.length);
    }, 5000);
    return () => clearInterval(t);
  }, [autoplay]);

  return (
    <div style={{ maxWidth: 1280, margin: '48px auto 0' }}>
      {/* ── Building blocks ~ the concepts that make Sarah possible ── */}
      <div style={{ ...mono, fontSize: sz(13), fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
        First, the building blocks
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(20), color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
        Three Claude features that turn &ldquo;cool AI tool&rdquo; into &ldquo;an employee that runs without you.&rdquo;
      </div>
      <div style={{ ...mono, fontSize: sz(12), color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 22, opacity: 0.75 }}>
        ↓ click any block to see it run live
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 60 }}>
        {CLAUDE_BUILDING_BLOCKS.map((b, i) => {
          const isActive = activeBlock === i;
          return (
            <div
              key={b.name}
              onClick={() => setActiveBlock(isActive ? null : i)}
              style={{
                padding: '26px 28px',
                borderRadius: 16,
                background: isActive ? C.text : C.surface,
                color: isActive ? onDark : C.text,
                border: `2px solid ${isActive ? C.primary : C.border}`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isActive ? 'translateY(-2px)' : 'none',
                boxShadow: isActive ? `0 18px 36px -12px ${C.primary}55` : 'none',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: C.primary }} />
              <div style={{ ...mono, fontSize: sz(11), fontWeight: 800, color: C.primary, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                {String(i + 1).padStart(2, '0')} · {b.short}
              </div>
              <div style={{ ...sans, fontSize: sz(28), fontWeight: 700, color: isActive ? onDark : C.text, letterSpacing: '-0.01em' }}>
                {b.name}
              </div>
              <div style={{ ...serif, fontSize: sz(20), lineHeight: 1.5, color: isActive ? onDark : C.text, fontStyle: 'italic' }}>
                {b.desc}
              </div>

              {/* How we use it ~ collapsed toggle */}
              {(() => {
                const isExpanded = expandedExamples.has(i);
                return (
                  <div style={{
                    paddingTop: 10,
                    borderTop: `1px solid ${isActive ? 'rgba(250,248,245,0.15)' : C.border}`,
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedExamples(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        });
                      }}
                      style={{
                        ...mono, fontSize: sz(10), fontWeight: 700,
                        color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{
                        display: 'inline-block',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}>▸</span>
                      How we use it
                    </button>
                    {isExpanded && (
                      <div style={{
                        ...serif, fontSize: sz(17), lineHeight: 1.6,
                        color: isActive ? 'rgba(250,248,245,0.78)' : C.muted,
                        marginTop: 10,
                        animation: 'fadeInUp 0.25s ease',
                      }}>
                        {b.example}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Simulation log when active */}
              {isActive && (
                <div style={{
                  marginTop: 6,
                  padding: '14px 16px',
                  background: 'rgba(250,248,245,0.06)',
                  borderRadius: 10,
                  border: '1px solid rgba(250,248,245,0.1)',
                }}>
                  <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                    You ~
                  </div>
                  <div style={{ ...mono, fontSize: sz(13), lineHeight: 1.5, color: onDark, marginBottom: 12 }}>
                    &ldquo;{b.simulation.prompt}&rdquo;
                  </div>
                  <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Claude ~
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {b.simulation.steps.slice(0, blockSteps).map((step, si) => (
                      <div key={si} style={{
                        ...mono, fontSize: sz(12), lineHeight: 1.5,
                        color: step.startsWith('✓') ? C.primary : 'rgba(250,248,245,0.85)',
                        fontWeight: step.startsWith('✓') ? 700 : 400,
                        opacity: 0,
                        animation: 'fadeInUp 0.4s ease forwards',
                      }}>
                        {step}
                      </div>
                    ))}
                    {blockSteps < b.simulation.steps.length && (
                      <div style={{ ...mono, fontSize: sz(12), color: C.primary, opacity: 0.7 }}>
                        <span style={{ display: 'inline-block', animation: 'blink 0.8s step-end infinite' }}>▋</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%, 100% { opacity: 0.7; } 50% { opacity: 0; } }
      `}</style>

      {/* ── Now ~ the Talent Mucho AI-Trained Operations Manager ── */}
      <div style={{ ...mono, fontSize: sz(13), fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
        A day with a Talent Mucho <em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>AI-Trained</em> Ops Manager
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(20), color: C.muted, marginBottom: 32, lineHeight: 1.5 }}>
        Meet <span style={{ color: C.primary, fontWeight: 600 }}>Sarah</span> ~ this is what we place inside our clients&apos; businesses.
        Same Claude underneath, trained on your business (Project), plugged into your tools (Connectors), on a schedule.
        <span style={{ color: C.primary }}> Click any moment to see what she&apos;s doing.</span>
      </div>

      {/* Profile card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 22,
        alignItems: 'center',
        padding: '22px 26px',
        borderRadius: 18,
        background: C.text,
        color: onDark,
        marginBottom: 28,
        boxShadow: `0 18px 40px -14px ${C.text}40`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            width: sz(72), height: sz(72), flexShrink: 0,
            borderRadius: '50%',
            background: C.primary, color: C.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...mono, fontSize: sz(26), fontWeight: 800,
            boxShadow: `0 0 0 4px ${C.primary}30`,
          }}>tm</div>
          <div>
            <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: C.primary, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
              Talent Mucho ~ AI-Trained Ops Manager
            </div>
            <div style={{ ...sans, fontSize: sz(32), fontWeight: 700, color: onDark, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              Sarah <em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary }}>~ your second pair of hands</em>
            </div>
            <div style={{ ...serif, fontSize: sz(17), color: 'rgba(250,248,245,0.65)', marginTop: 8, fontStyle: 'italic' }}>
              Reports to: you · Salary: €0 · Sleeps: never · Asks dumb questions: also never
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: 'rgba(250,248,245,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
            Saves you ~
          </div>
          <div style={{ ...sans, fontSize: sz(38), fontWeight: 800, color: C.primary, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {OPS_TOTAL_SAVED}
          </div>
          <div style={{ ...mono, fontSize: sz(11), color: 'rgba(250,248,245,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
            every weekday
          </div>
        </div>
      </div>

      {/* Two-column: timeline + active-event detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 26, alignItems: 'flex-start' }}>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: 23, top: 16, bottom: 16,
            width: 2,
            background: `linear-gradient(to bottom, ${C.primary}, ${C.muted}40)`,
            borderRadius: 2,
            zIndex: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {OPS_MANAGER_DAY.map((ev, i) => {
              const isActive = activeIdx === i;
              const isPast = i < activeIdx;
              return (
                <div
                  key={ev.time}
                  onClick={() => { setActiveIdx(i); setAutoplay(false); }}
                  style={{
                    position: 'relative',
                    display: 'grid',
                    gridTemplateColumns: '50px 1fr',
                    gap: 14,
                    padding: '14px 16px 14px 0',
                    cursor: 'pointer',
                    borderRadius: 12,
                    background: isActive ? `${C.primary}10` : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', paddingTop: 2 }}>
                    <div style={{
                      width: sz(40), height: sz(40),
                      borderRadius: '50%',
                      background: isActive ? C.primary : (isPast ? `${C.primary}50` : C.surface),
                      border: `2px solid ${isActive ? C.primary : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: sz(20),
                      transition: 'all 0.2s',
                      boxShadow: isActive ? `0 0 0 4px ${C.primary}25` : 'none',
                    }}>
                      {ev.icon}
                    </div>
                  </div>
                  <div>
                    <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: isActive ? C.primary : C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>
                      {ev.time}
                    </div>
                    <div style={{ ...sans, fontSize: sz(19), fontWeight: 700, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 4 }}>
                      {ev.title}
                    </div>
                    <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(15), color: C.muted, lineHeight: 1.45 }}>
                      {ev.oneLiner}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button
              onClick={() => setAutoplay(a => !a)}
              style={{
                padding: '8px 18px', borderRadius: 100,
                ...mono, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer',
                background: autoplay ? C.primary : 'transparent',
                color: autoplay ? (C.text === '#2A2520' ? onDark : C.bg) : C.primary,
                border: `1px solid ${C.primary}`,
              }}
            >
              {autoplay ? '⏸ Pause autoplay' : '▶ Play her day'}
            </button>
          </div>

          {/* Brand stamp */}
          <div style={{
            marginTop: 26,
            padding: '16px 18px',
            borderRadius: 12,
            background: `${C.primary}15`,
            border: `1px solid ${C.primary}40`,
            textAlign: 'center',
          }}>
            <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
              ↳ This is the Operate pillar
            </div>
            <div style={{ ...serif, fontSize: sz(16), color: C.text, lineHeight: 1.5, fontStyle: 'italic' }}>
              We build, train, and place these inside our clients&apos; businesses.
            </div>
          </div>
        </div>

        {/* Active event detail */}
        <div style={{
          padding: '28px 30px',
          borderRadius: 18,
          background: C.surface,
          border: `1px solid ${C.border}`,
          position: 'sticky',
          top: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{
              width: sz(60), height: sz(60), flexShrink: 0,
              borderRadius: 14,
              background: `${C.primary}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: sz(30),
            }}>{active.icon}</div>
            <div>
              <div style={{ ...mono, fontSize: sz(12), fontWeight: 700, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                {active.time}
              </div>
              <div style={{ ...sans, fontSize: sz(28), fontWeight: 700, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {active.title}
              </div>
            </div>
          </div>

          <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(20), color: C.text, lineHeight: 1.5, marginBottom: 20 }}>
            {active.oneLiner}
          </div>

          <div style={{ ...serif, fontSize: sz(18), lineHeight: 1.65, color: C.text, opacity: 0.88, marginBottom: 24 }}>
            {active.detail}
          </div>

          <div style={{
            padding: '16px 20px',
            background: C.surface2,
            borderRadius: 10,
            borderLeft: `3px solid ${C.primary}`,
            marginBottom: 24,
          }}>
            <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sample output ~
            </div>
            <div style={{ ...mono, fontSize: sz(15), lineHeight: 1.55, color: C.text, fontStyle: 'italic' }}>
              {active.sample}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '14px 16px', background: `${C.primary}12`, borderRadius: 10, border: `1px solid ${C.primary}25` }}>
              <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: sz(16), height: sz(16),
                  borderRadius: '50%',
                  background: C.primary, color: C.text,
                  fontSize: sz(8), fontWeight: 800,
                }}>tm</span>
                Talent Mucho Skill
              </div>
              <div style={{ ...sans, fontSize: sz(16), fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
                {active.skill}
              </div>
            </div>
            <div style={{ padding: '14px 16px', background: `${C.primary}15`, borderRadius: 10, border: `1px solid ${C.primary}30` }}>
              <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>
                Time saved
              </div>
              <div style={{ ...sans, fontSize: sz(16), fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
                {active.saved}
              </div>
            </div>
          </div>

          {active.connectors.length > 0 && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: `${C.muted}10`, borderRadius: 10 }}>
              <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                Connectors plugged in
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {active.connectors.map(con => (
                  <div key={con} style={{
                    padding: '5px 12px',
                    borderRadius: 100,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    ...mono, fontSize: sz(13), fontWeight: 600, color: C.text,
                    letterSpacing: '0.04em',
                  }}>
                    {con}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SpinWheel ~ random demo picker, used in segment 04 audience view ─────────
type SpinItem = { name: string; short?: string; desc: string; icon?: string };
function SpinWheel({ items, C, mono, sans, serif }: {
  items: SpinItem[];
  C: Palette;
  mono: React.CSSProperties;
  sans: React.CSSProperties;
  serif: React.CSSProperties;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const wedgeAngle = 360 / items.length;
  const radius = 200;
  const onDark = '#FAF8F5';

  function spin() {
    if (spinning) return;

    // Step 1: pick a target wedge (skipping ones already demoed)
    const available = items.map((_, i) => i).filter(i => !history.includes(i));
    const pool = available.length ? available : items.map((_, i) => i);
    const targetIndex = pool[Math.floor(Math.random() * pool.length)];

    // Step 2: figure out the absolute rotation (mod 360) where wedge `targetIndex`
    // sits under the pointer (top of the wheel). Wedges are drawn starting at
    // (i * wedgeAngle - 90)°, so wedge i's centre lives at (i + 0.5) * wedgeAngle - 90.
    // After CSS rotation R, the centre is at that angle + R. We want it at -90 (top),
    // i.e. R ≡ -(i + 0.5) * wedgeAngle  (mod 360).
    const targetMod = (((-(targetIndex + 0.5) * wedgeAngle) % 360) + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta <= 0) delta += 360;

    // Step 3: add a few full rotations for drama, then animate
    const spins = 5 + Math.floor(Math.random() * 3);
    const totalDelta = 360 * spins + delta;

    setSpinning(true);
    setWinner(null);
    setRotation(prev => prev + totalDelta);

    setTimeout(() => {
      // Step 4: derive the winner from the actual final rotation, so the
      // result text always matches whatever wedge sits under the pointer
      // (defensive ~ if any rounding drifted, this still tells the truth).
      const finalRot = rotation + totalDelta;
      const finalMod = ((finalRot % 360) + 360) % 360;
      // Solve (i + 0.5) * wedgeAngle ≡ -finalMod (mod 360) for i
      const raw = ((-finalMod / wedgeAngle - 0.5) % items.length + items.length) % items.length;
      const derivedWinner = ((Math.round(raw) % items.length) + items.length) % items.length;
      setSpinning(false);
      setWinner(derivedWinner);
      setHistory(h => [...h, derivedWinner]);
    }, 4200);
  }

  function reset() {
    setHistory([]);
    setWinner(null);
  }

  const wedgeColors = [C.primary, C.surface2, C.muted + '40', C.peach || C.surface2];

  return (
    <div style={{ maxWidth: 1280, margin: '48px auto 0' }}>
      <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
        What we demo live
      </div>
      <div style={{ ...mono, fontSize: 12, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 28, opacity: 0.7 }}>
        ↓ Pick someone in chat to spin · we demo whatever it lands on
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 1.1fr', gap: 40, alignItems: 'center' }}>
        {/* Wheel */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 460, justifySelf: 'center', aspectRatio: '1 / 1' }}>
          {/* Pointer at top */}
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: `22px solid ${C.text}`,
            zIndex: 3,
            filter: `drop-shadow(0 4px 8px ${C.text}40)`,
          }} />
          <svg
            viewBox={`-${radius + 10} -${radius + 10} ${(radius + 10) * 2} ${(radius + 10) * 2}`}
            width="100%" height="100%"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.21, 1)' : 'none',
              filter: `drop-shadow(0 18px 32px ${C.text}25)`,
            }}
          >
            {items.map((item, i) => {
              const startAngle = (i * wedgeAngle - 90) * Math.PI / 180;
              const endAngle = ((i + 1) * wedgeAngle - 90) * Math.PI / 180;
              const x1 = radius * Math.cos(startAngle);
              const y1 = radius * Math.sin(startAngle);
              const x2 = radius * Math.cos(endAngle);
              const y2 = radius * Math.sin(endAngle);
              const largeArc = wedgeAngle > 180 ? 1 : 0;
              const path = `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
              const fill = wedgeColors[i % wedgeColors.length];
              const isWinner = winner === i && !spinning;

              // text positioning ~ middle of wedge, rotated to read radially
              const midAngleDeg = i * wedgeAngle - 90 + wedgeAngle / 2;
              const midRad = midAngleDeg * Math.PI / 180;
              const textR = radius * 0.62;
              const textX = textR * Math.cos(midRad);
              const textY = textR * Math.sin(midRad);
              const textRotation = midAngleDeg + 90;
              const isLightWedge = fill === C.surface2 || fill === (C.muted + '40');

              return (
                <g key={i}>
                  <path
                    d={path}
                    fill={fill}
                    stroke={C.bg}
                    strokeWidth={3}
                    style={{
                      filter: isWinner ? `drop-shadow(0 0 16px ${C.primary})` : undefined,
                      transition: 'filter 0.4s',
                    }}
                  />
                  <text
                    x={textX} y={textY}
                    textAnchor="middle" dominantBaseline="middle"
                    fontFamily={String(mono.fontFamily)}
                    fontSize={13} fontWeight={800}
                    fill={isLightWedge ? C.text : (fill === C.primary ? (C.text === '#2A2520' ? onDark : C.bg) : C.text)}
                    transform={`rotate(${textRotation} ${textX} ${textY})`}
                    style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {item.short ?? item.name}
                  </text>
                </g>
              );
            })}
            {/* Center cap */}
            <circle r={28} fill={C.text} />
            <circle r={20} fill={C.primary} />
          </svg>
        </div>

        {/* Result panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 320 }}>
          {winner === null ? (
            <div style={{
              flex: 1,
              borderRadius: 18, border: `2px dashed ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 32, textAlign: 'center',
              minHeight: 220,
            }}>
              <div>
                <div style={{ ...mono, fontSize: 12, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
                  Awaiting the spin
                </div>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: 22, color: C.muted, lineHeight: 1.4 }}>
                  Wherever it lands, that&apos;s what we demo live.
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              borderRadius: 18, padding: '28px 30px',
              background: C.text, color: onDark,
              boxShadow: `0 24px 48px -12px ${C.text}30, 0 0 0 1px ${C.primary}40`,
            }}>
              <div style={{ ...mono, fontSize: 12, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
                The wheel says ~
              </div>
              <div style={{ ...sans, fontSize: 36, fontWeight: 800, color: onDark, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 14 }}>
                {items[winner].name}
              </div>
              <div style={{ ...serif, fontSize: 19, lineHeight: 1.55, color: 'rgba(250,248,245,0.8)' }}>
                {items[winner].desc}
              </div>
            </div>
          )}

          {/* Controls */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={spin}
              disabled={spinning}
              style={{
                flex: 1, minWidth: 160,
                padding: '16px 28px', borderRadius: 100,
                ...mono, fontSize: 14, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: spinning ? 'not-allowed' : 'pointer',
                background: spinning ? C.muted : C.primary,
                color: C.text === '#2A2520' ? onDark : C.bg,
                border: 'none',
                boxShadow: spinning ? 'none' : `0 8px 20px -4px ${C.primary}55`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                opacity: spinning ? 0.6 : 1,
              }}
            >
              {spinning ? '● Spinning...' : winner !== null ? '↻ Spin again' : '▸ SPIN'}
            </button>
            {history.length > 0 && (
              <button
                onClick={reset}
                disabled={spinning}
                style={{
                  padding: '14px 22px', borderRadius: 100,
                  ...mono, fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  background: 'transparent', color: C.muted,
                  border: `1px solid ${C.border}`,
                }}
              >
                Reset
              </button>
            )}
          </div>

          {/* History tally */}
          {history.length > 0 && (
            <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
              Demoed so far ~ {history.map(i => items[i].short ?? items[i].name).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ValueStack ~ segment 07 audience view: the €47 math ─────────────────────
function ValueStack({ C, mono, sans, serif, scale = 1 }: {
  C: Palette;
  mono: React.CSSProperties;
  sans: React.CSSProperties;
  serif: React.CSSProperties;
  scale?: number;
}) {
  const onDark = '#FAF8F5';
  const sz = (px: number) => Math.round(px * scale);
  const totalNumeric = VIP_STACK.reduce((s, item) => s + (typeof item.value === 'number' ? item.value : 0), 0);

  return (
    <div style={{ maxWidth: 1280, margin: '48px auto 0' }}>
      <div style={{ ...mono, fontSize: sz(13), fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
        The €47 stack
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(20), color: C.muted, marginBottom: 26, lineHeight: 1.5 }}>
        What&apos;s actually inside VIP. Honest values. Math doesn&apos;t lie.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 18 }}>
        {VIP_STACK.map((item, i) => {
          const isPriceless = item.value === 'priceless';
          return (
            <div key={item.name} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 18,
              alignItems: 'center',
              padding: '18px 22px',
              borderRadius: 12,
              background: C.surface,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: sz(34), height: sz(34),
                borderRadius: '50%',
                background: `${C.primary}20`,
                color: C.primary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...mono, fontSize: sz(13), fontWeight: 800,
              }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div style={{ ...sans, fontSize: sz(20), fontWeight: 700, color: C.text, letterSpacing: '-0.01em', marginBottom: 3 }}>
                  {item.name}
                </div>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(15), color: C.muted, lineHeight: 1.45 }}>
                  {item.desc}
                </div>
              </div>
              <div style={{
                ...mono, fontSize: sz(16), fontWeight: 800, color: isPriceless ? C.primary : C.text,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>
                {isPriceless ? 'priceless' : `€${item.value}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total + price reveal */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
        padding: '24px 28px', borderRadius: 16,
        background: C.text, color: onDark,
        boxShadow: `0 18px 40px -14px ${C.text}40`,
      }}>
        <div>
          <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: 'rgba(250,248,245,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
            Real value if bought separately
          </div>
          <div style={{ ...sans, fontSize: sz(36), fontWeight: 700, color: 'rgba(250,248,245,0.6)', letterSpacing: '-0.02em', textDecoration: 'line-through', textDecorationThickness: 2 }}>
            €{totalNumeric}+
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...mono, fontSize: sz(11), fontWeight: 700, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
            Tonight only
          </div>
          <div style={{ ...sans, fontSize: sz(48), fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', lineHeight: 1 }}>
            €47
          </div>
        </div>
      </div>

      {/* 14-day guarantee badge */}
      <div style={{
        marginTop: 14,
        padding: '14px 22px',
        borderRadius: 100,
        background: `${C.primary}15`,
        border: `1px solid ${C.primary}40`,
        display: 'flex', alignItems: 'center', gap: 14,
        justifyContent: 'center',
      }}>
        <div style={{
          width: sz(28), height: sz(28),
          borderRadius: '50%',
          background: C.primary, color: C.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...mono, fontSize: sz(14), fontWeight: 800,
        }}>✓</div>
        <div style={{ ...mono, fontSize: sz(12), fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          14-day refund
        </div>
        <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(15), color: C.text }}>
          No form. No questions. The only thing you risk is showing up.
        </div>
      </div>
    </div>
  );
}

// ── ThreeDoorsOut ~ segment 07 audience view: the choice ────────────────────
function ThreeDoorsOut({ C, mono, sans, serif, scale = 1 }: {
  C: Palette;
  mono: React.CSSProperties;
  sans: React.CSSProperties;
  serif: React.CSSProperties;
  scale?: number;
}) {
  const [activeDoor, setActiveDoor] = useState(1); // VIP open by default
  const onDark = '#FAF8F5';
  const sz = (px: number) => Math.round(px * scale);

  return (
    <div style={{ maxWidth: 1280, margin: '56px auto 0' }}>
      <div style={{ ...mono, fontSize: sz(13), fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
        Three doors out
      </div>
      <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(20), color: C.muted, marginBottom: 32, lineHeight: 1.5 }}>
        Three ways to use what you learned tonight. Mapped to how we work at Talent Mucho ~ <span style={{ color: C.primary, fontWeight: 600 }}>Educate · Educate Deeper · Build &amp; Operate.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'stretch' }}>
        {THREE_DOORS.map((door, i) => {
          const isActive = activeDoor === i;
          const accentBg = door.highlight ? C.primary : (isActive ? C.text : C.surface);
          const textColor = (door.highlight || isActive) ? onDark : C.text;
          return (
            <div
              key={door.label}
              onClick={() => setActiveDoor(i)}
              style={{
                display: 'flex', flexDirection: 'column',
                padding: '26px 26px 22px',
                borderRadius: 18,
                background: door.highlight ? C.text : (isActive ? C.surface2 : C.surface),
                border: `2px solid ${door.highlight ? C.primary : (isActive ? C.primary : C.border)}`,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: door.highlight
                  ? `0 24px 48px -12px ${C.primary}55`
                  : isActive ? `0 12px 28px -10px ${C.text}25` : 'none',
                transform: door.highlight ? 'translateY(-4px)' : 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {door.highlight && (
                <div style={{
                  position: 'absolute', top: 14, right: 16,
                  ...mono, fontSize: sz(9), fontWeight: 800,
                  color: C.text, background: C.primary,
                  padding: '4px 10px', borderRadius: 100,
                  letterSpacing: '0.18em',
                }}>RECOMMENDED</div>
              )}

              <div style={{ ...mono, fontSize: sz(10), fontWeight: 700, color: door.highlight ? C.primary : C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
                {door.label}
              </div>
              <div style={{ ...sans, fontSize: sz(34), fontWeight: 700, color: door.highlight ? onDark : C.text, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 4 }}>
                {door.name}
              </div>
              <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(18), color: C.primary, marginBottom: 14, lineHeight: 1.3 }}>
                ~ {door.italic}
              </div>
              <div style={{ ...sans, fontSize: sz(16), fontWeight: 600, color: door.highlight ? onDark : C.text, marginBottom: 14, lineHeight: 1.4 }}>
                {door.pitch}
              </div>
              <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(14), color: door.highlight ? 'rgba(250,248,245,0.7)' : C.muted, marginBottom: 16, lineHeight: 1.45, paddingBottom: 12, borderBottom: `1px solid ${door.highlight ? 'rgba(250,248,245,0.18)' : C.border}` }}>
                <span style={{ ...mono, fontSize: sz(9), fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginRight: 6 }}>Best for ~</span>
                {door.bestFor}
              </div>

              {/* What you get list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18, flex: 1 }}>
                {door.whatYouGet.map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, ...serif, fontSize: sz(14), color: door.highlight ? 'rgba(250,248,245,0.88)' : C.text, lineHeight: 1.4 }}>
                    <span style={{ ...mono, fontSize: sz(12), color: C.primary, flexShrink: 0, paddingTop: 2 }}>~</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Next step + CTA */}
              <div style={{ marginTop: 'auto' }}>
                <div style={{ ...mono, fontSize: sz(9), fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Next step ~
                </div>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: sz(13), color: door.highlight ? 'rgba(250,248,245,0.78)' : C.muted, lineHeight: 1.5, marginBottom: 14 }}>
                  {door.nextStep}
                </div>
                <a
                  href={door.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'block',
                    padding: `${sz(14)}px ${sz(20)}px`,
                    borderRadius: 100,
                    textAlign: 'center',
                    textDecoration: 'none',
                    ...mono, fontSize: sz(12), fontWeight: 800,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    background: door.highlight ? C.primary : (accentBg === C.text ? C.primary : C.text),
                    color: door.highlight ? onDark : (accentBg === C.text ? C.text : onDark),
                    border: 'none',
                  }}
                >
                  {door.cta} →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Audience View ─────────────────────────────────────────────────────────────
function AudienceView({ seg, segIdx, totalSegs, wbBlock, pollBlock, timerSecs, fontSize, C, mono, serif, sans, spkColor, theme, editMode, onSaveEdit }: {
  seg: Segment; segIdx: number; beat: number;
  totalSegs: number;
  wbBlock: { text?: string } | undefined;
  pollBlock: { text?: string } | undefined;
  timerSecs: number;
  fontSize: number; // top-bar slider value (14~30, default 19)
  C: Palette; mono: React.CSSProperties; serif: React.CSSProperties; sans: React.CSSProperties;
  spkColor: (spk: string) => string;
  theme: ThemeKey;
  editMode: boolean;
  onSaveEdit: (path: string, value: string) => void;
}) {
  // Scale factor derived from the top-bar slider ~ 1.0 = normal, ~1.58 = max
  const audScale = fontSize / 19;
  const sz = (px: number) => Math.round(px * audScale);
  const fmtEvent = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const pollLines = pollBlock?.text?.replace(/^POLL ~ /, '').split('\n') ?? [];
  const wbText = wbBlock?.text?.replace(/^WORKBOOK ~ /, '') ?? '';

  // Compare-panel reveal stages for interactive Claude flow:
  // 0 = Claude's questions only · 1 = + Claude's 3 draft variations
  const [compareStage, setCompareStage] = useState(0);
  // User's selected draft index (after Claude shows variations)
  const [selectedDraft, setSelectedDraft] = useState<number | null>(null);
  // Active Claude product (4-Claudes panel simulation)
  const [activeClaude, setActiveClaude] = useState<number | null>(null);
  // How many simulation steps have been revealed for the active Claude
  const [revealedSteps, setRevealedSteps] = useState(0);

  // Reset stages when segment changes
  useEffect(() => {
    setCompareStage(0);
    setSelectedDraft(null);
    setActiveClaude(null);
    setRevealedSteps(0);
  }, [segIdx]);

  // Stagger the reveal of simulation steps when a Claude is selected
  useEffect(() => {
    if (activeClaude === null) { setRevealedSteps(0); return; }
    const product = CLAUDE_PRODUCTS[activeClaude];
    setRevealedSteps(0);
    let i = 0;
    const total = product.simulation.steps.length;
    const tick = () => {
      i += 1;
      setRevealedSteps(i);
      if (i < total) setTimeout(tick, 700);
    };
    const initial = setTimeout(tick, 350);
    return () => clearTimeout(initial);
  }, [activeClaude]);

  // Premium contrast text on dark elements (uses light beige regardless of theme bg)
  const onDark = '#FAF8F5';
  const brand = 'TALENT MUCHO';
  const brandSub = 'CLAUDE FOR BUSINESS';
  const footerLink = 'talentmucho.com';

  // Themed em rendering for body copy
  const emRender = (html: string) => html.replace(/<em>/g, `<em style="font-style:italic;color:${C.primary};font-family:${(serif.fontFamily as string)}">`);
  const emOnDark = (html: string) => html.replace(/<em>/g, `<em style="font-style:italic;color:${C.primary};font-family:${(serif.fontFamily as string)}">`);

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg, color: C.text, ...sans, position: 'relative' }}>
      {/* Subtle texture overlay */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, background: `radial-gradient(ellipse at top, ${C.primary}15 0%, transparent 60%), radial-gradient(ellipse at bottom right, ${C.peach} 0%, transparent 50%)` }} />

      {/* ── HERO TOP STRIP ── */}
      <div style={{ background: C.text, color: onDark, padding: '18px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: 11, fontWeight: 800, color: C.text }}>
            {theme === 'tm' ? 'tm' : 'am'}
          </div>
          <div>
            <div style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.primary }}>{brand}</div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,248,245,0.45)', marginTop: 2 }}>{brandSub}</div>
          </div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'rgba(250,248,245,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ff5e5e', animation: 'pulse 1.4s ease-in-out infinite', boxShadow: '0 0 12px #ff5e5e' }} />
          LIVE <span style={{ opacity: 0.4 }}>~</span> <span style={{ fontWeight: 600, color: onDark }}>{fmtEvent(timerSecs)}</span> LEFT
        </div>
      </div>

      {/* ── HERO TITLE BAND ── */}
      <div style={{ flexShrink: 0, padding: '52px 48px 38px', position: 'relative', zIndex: 2, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ ...mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.primary, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-block', width: 32, height: 1, background: C.primary }} />
            Segment {seg.num} <span style={{ opacity: 0.4 }}>of {String(totalSegs).padStart(2, '0')}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(64px, 9vw, 128px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 0.95, color: C.text, margin: 0, ...sans }}>
            <span style={{ textTransform: 'uppercase' }}>
              <Editable key={`av-t-${segIdx}`} value={seg.title} editMode={editMode} onSave={v => onSaveEdit(`${segIdx}.title`, v)} />
            </span>
            {(seg.titleItalic || editMode) && <>{' '}<em style={{ ...serif, fontStyle: 'italic', fontWeight: 400, color: C.primary, textTransform: 'none', letterSpacing: 0 }}>
              <Editable key={`av-ti-${segIdx}`} value={seg.titleItalic} editMode={editMode} onSave={v => onSaveEdit(`${segIdx}.titleItalic`, v)} />
            </em></>}
          </h1>

          {/* Progress bars only ~ speaker badges removed for a cleaner audience view */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 28, justifyContent: 'flex-end' }}>
            {Array.from({ length: totalSegs }).map((_, i) => (
              <div key={i} style={{
                height: 4,
                width: i === segIdx ? 32 : 14,
                borderRadius: 4,
                background: i < segIdx ? C.primary : i === segIdx ? C.primary : `${C.muted}40`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px 80px', position: 'relative', zIndex: 2 }}>
        {/* Standard body grid hidden when the segment uses the compare panel ~ the side-by-side comparison takes that real estate instead */}
        <div style={{ display: seg.panel === 'compare' ? 'none' : 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 36, maxWidth: 1280, margin: '0 auto' }}>

          {/* ── LEFT: What we're covering ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
                What we&apos;re covering
              </div>
              <Editable
                key={`awt-${segIdx}`}
                tagName="div"
                value={emRender(seg.audWhatTitle)}
                editMode={editMode}
                onSave={v => onSaveEdit(`${segIdx}.audWhatTitle`, v.replace(/<em [^>]*>/g, '<em>'))}
                style={{ ...sans, fontSize: 42, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 22 }}
              />
              <Editable
                key={`awb-${segIdx}`}
                tagName="div"
                value={emRender(seg.audWhatBody)}
                editMode={editMode}
                onSave={v => onSaveEdit(`${segIdx}.audWhatBody`, v.replace(/<em [^>]*>/g, '<em>'))}
                style={{ ...serif, fontSize: 26, lineHeight: 1.6, color: C.text, opacity: 0.9 }}
              />
            </div>
          </div>

          {/* ── RIGHT: Takeaway + active prompt ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Takeaway pull-quote ~ hidden on products segments where the model-comparison card replaces it */}
            {seg.panel !== 'products' && (
              <div style={{
                background: C.text, color: onDark,
                borderRadius: 20, padding: '34px 30px',
                boxShadow: `0 24px 48px -12px ${C.text}30, 0 0 0 1px ${C.primary}25`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Decorative quote mark */}
                <div style={{ position: 'absolute', top: -22, right: 18, ...serif, fontSize: 140, lineHeight: 1, color: C.primary, opacity: 0.25, fontStyle: 'italic', userSelect: 'none' }}>"</div>

                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                  <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
                  Take this with you
                </div>
                <Editable
                  key={`atk-${segIdx}`}
                  tagName="div"
                  value={emOnDark(seg.audTakeaway)}
                  editMode={editMode}
                  onSave={v => onSaveEdit(`${segIdx}.audTakeaway`, v.replace(/<em [^>]*>/g, '<em>'))}
                  style={{ ...serif, fontStyle: 'italic', fontSize: 30, lineHeight: 1.45, color: onDark, position: 'relative' }}
                />
              </div>
            )}

            {/* Model translation card ~ shows on products segments only */}
            {seg.panel === 'products' && (
              <div style={{
                background: C.surface, borderRadius: 20, padding: '26px 28px',
                border: `1px solid ${C.border}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: C.primary }} />
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 16 }}>
                  The 3 models
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { claude: 'Opus', desc: 'the genius', gpt: 'o1 / GPT-4', when: 'Complex thinking, strategy' },
                    { claude: 'Sonnet', desc: 'the workhorse', gpt: 'GPT-4o', when: 'Daily driver · use 90% of the time', highlight: true },
                    { claude: 'Haiku', desc: 'the fast one', gpt: 'GPT-4o mini', when: 'Quick lookups, short answers' },
                  ].map(row => (
                    <div key={row.claude} style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: row.highlight ? `${C.primary}18` : `${C.muted}10`,
                      border: row.highlight ? `1px solid ${C.primary}` : `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                        <div style={{ ...sans, fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>
                          {row.claude}
                          <span style={{ ...serif, fontStyle: 'italic', fontSize: 14, color: C.muted, fontWeight: 400, marginLeft: 8 }}>
                            ~ {row.desc}
                          </span>
                        </div>
                        <div style={{ ...mono, fontSize: 11, color: C.primary, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          ≈ {row.gpt}
                        </div>
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: '0.04em' }}>
                        {row.when}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, ...mono, fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center' }}>
                  TL;DR ~ just use Sonnet
                </div>
              </div>
            )}

            {/* Workbook prompt */}
            {wbBlock && (
              <div style={{
                background: C.surface, borderRadius: 20, padding: '26px 28px',
                border: `1px solid ${C.border}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: C.primary }} />
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>
                  ~ Workbook moment
                </div>
                <div style={{ ...sans, fontSize: 24, fontWeight: 600, color: C.text, marginBottom: 12, letterSpacing: '-0.01em', lineHeight: 1.3 }}
                  dangerouslySetInnerHTML={{ __html: wbText.split('"')[1] ? `&ldquo;${wbText.split('"')[1]}&rdquo;` : wbText }} />
                <div style={{ ...serif, fontStyle: 'italic', fontSize: 17, color: C.muted, lineHeight: 1.55 }}>
                  Write your answer down ~ paper or notes app. We&apos;ll come back to these.
                </div>
              </div>
            )}

            {/* Poll prompt */}
            {pollBlock && (
              <div style={{
                background: C.surface2, borderRadius: 20, padding: '26px 28px',
                border: `1px solid ${C.primary}40`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: C.primary }} />
                <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>
                  ~ Audience moment
                </div>
                <div style={{ ...sans, fontSize: 22, fontWeight: 600, color: C.text, marginBottom: 14, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {pollLines[0]}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {pollLines.slice(1).map((l, i) => (
                    <div key={i} style={{
                      padding: '12px 16px', background: C.surface, borderRadius: 10,
                      ...mono, fontSize: 16, color: C.text,
                      border: `1px solid ${C.border}`,
                    }}>{l}</div>
                  ))}
                </div>
                <div style={{ marginTop: 16, ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  ↳ Drop your answer in the Zoom chat
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ChatGPT vs Claude side-by-side ~ shows when segment uses the compare panel ── */}
        {seg.panel === 'compare' && seg.panelData && COMPARE_PRESETS[seg.panelData] && (() => {
          const p = COMPARE_PRESETS[seg.panelData];
          const samePrompt = p.leftPrompt === p.rightPrompt;
          const cols = [
            { side: 'left' as const, tag: p.leftTag, title: p.leftTitle, why: p.leftWhy, prompt: p.leftPrompt, answer: p.leftAnswer, annLbl: p.leftAnnLbl, annTxt: p.leftAnnTxt },
            { side: 'right' as const, tag: p.rightTag, title: p.rightTitle, why: p.rightWhy, prompt: p.rightPrompt, answer: p.rightAnswer, annLbl: p.rightAnnLbl, annTxt: p.rightAnnTxt },
          ];
          return (
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
                {samePrompt ? 'Same prompt, two responses' : 'Same prompt, two ways'}
              </div>
              <div style={{ ...serif, fontStyle: 'italic', fontSize: 18, color: C.muted, marginBottom: 24, lineHeight: 1.5 }}>
                {p.scenario}
              </div>

              {/* Shared prompt at top (only when both sides use the same prompt) */}
              {samePrompt && (
                <div style={{
                  padding: '20px 26px',
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  marginBottom: 22,
                  textAlign: 'center',
                }}>
                  <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
                    The prompt (sent to both)
                  </div>
                  <div style={{ ...mono, fontSize: 22, lineHeight: 1.4, color: C.text, fontWeight: 500 }}>
                    &ldquo;{p.leftPrompt}&rdquo;
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22, alignItems: 'stretch' }}>
                {cols.map(col => {
                  const isBad = col.side === 'left';
                  const tagBg = isBad ? 'rgba(176,58,46,0.12)' : 'rgba(74,124,89,0.14)';
                  const tagFg = isBad ? '#b03a2e' : '#1e8449';
                  const tagBorder = isBad ? 'rgba(176,58,46,0.3)' : 'rgba(74,124,89,0.3)';
                  return (
                    <div key={col.side} style={{
                      background: C.surface,
                      borderRadius: 18,
                      border: `1px solid ${C.border}`,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {/* Header */}
                      <div style={{ padding: '20px 22px 18px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '5px 12px', borderRadius: 100,
                          ...mono, fontSize: 11, fontWeight: 700,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          background: tagBg, color: tagFg,
                          border: `1px solid ${tagBorder}`,
                          marginBottom: 12,
                        }}>{col.tag}</div>
                        <div style={{ ...sans, fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 8 }}
                          dangerouslySetInnerHTML={{ __html: col.title.replace(/<em>/g, `<em style="font-family:${(serif.fontFamily as string)};font-style:italic;font-weight:400;color:${C.primary}">`) }} />
                        <div style={{ ...serif, fontStyle: 'italic', fontSize: 16, color: C.muted, lineHeight: 1.5 }}>
                          {col.why}
                        </div>
                      </div>
                      {/* Prompt (only show per-column when prompts differ) */}
                      {!samePrompt && (
                        <div style={{ padding: '14px 22px', background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                            The prompt
                          </div>
                          <div style={{ ...mono, fontSize: 14, lineHeight: 1.55, color: C.text, whiteSpace: 'pre-wrap' }}>
                            {col.prompt}
                          </div>
                        </div>
                      )}
                      {/* Response (Claude's first response = the questions; ChatGPT's = the template) */}
                      <div style={{ padding: '16px 22px 14px', borderBottom: `1px solid ${C.border}`, flex: 1 }}>
                        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
                          {col.side === 'right' && p.rightDrafts ? 'Step 1 · Claude asks back' : 'The response'}
                        </div>
                        <div style={{ ...serif, fontSize: 16, lineHeight: 1.6, color: C.text, whiteSpace: 'pre-wrap' }}>
                          {col.answer}
                        </div>
                      </div>

                      {/* Step 2 ~ Claude offers multiple draft versions (Claude column only, when stage >= 1) */}
                      {col.side === 'right' && p.rightDrafts && compareStage >= 1 && (
                        <div style={{ padding: '18px 22px 16px', borderBottom: `1px solid ${C.border}`, background: `${C.primary}10` }}>
                          <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 10 }}>
                            Step 2 · Claude offers a selection
                          </div>
                          {p.rightBridge && (
                            <div style={{ ...serif, fontSize: 16, lineHeight: 1.55, color: C.text, marginBottom: 14, fontStyle: 'italic' }}>
                              {p.rightBridge}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {p.rightDrafts.map((draft, i) => {
                              const isSelected = selectedDraft === i;
                              return (
                                <div
                                  key={i}
                                  onClick={() => setSelectedDraft(isSelected ? null : i)}
                                  style={{
                                    padding: '14px 16px',
                                    borderRadius: 12,
                                    border: `2px solid ${isSelected ? C.primary : C.border}`,
                                    background: isSelected ? C.text : C.surface,
                                    color: isSelected ? onDark : C.text,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelected ? `0 8px 24px -6px ${C.primary}55` : 'none',
                                    transform: isSelected ? 'translateY(-1px)' : 'none',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSelected ? 10 : 0 }}>
                                    <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: isSelected ? C.primary : C.text, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                      {draft.label}
                                    </div>
                                    <div style={{ ...mono, fontSize: 9, fontWeight: 700, color: isSelected ? C.primary : C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                                      {isSelected ? '✓ Selected' : 'Click to select'}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div style={{ ...serif, fontSize: 15, lineHeight: 1.65, color: onDark, whiteSpace: 'pre-wrap', marginTop: 4 }}>
                                      {draft.body}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {selectedDraft === null && (
                            <div style={{ ...mono, fontSize: 11, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 12, textAlign: 'center', opacity: 0.7 }}>
                              ↑ click any version to read it
                            </div>
                          )}
                        </div>
                      )}

                      {/* Annotation ~ what this teaches */}
                      <div style={{ padding: '14px 22px 18px' }}>
                        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                          {col.annLbl}
                        </div>
                        <div style={{ ...serif, fontStyle: 'italic', fontSize: 17, color: C.text, lineHeight: 1.5 }}>
                          {col.annTxt}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reveal controls (only when Claude has draft variations defined) */}
              {p.rightDrafts && (
                <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {compareStage === 0 && (
                    <button
                      onClick={() => setCompareStage(1)}
                      style={{
                        padding: '12px 28px', borderRadius: 100,
                        ...mono, fontSize: 13, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        cursor: 'pointer',
                        background: C.primary, color: C.text === '#2A2520' ? '#FAF8F5' : C.bg,
                        border: 'none',
                        boxShadow: `0 6px 16px -4px ${C.primary}60`,
                      }}
                    >
                      ▸ Show Claude&apos;s 3 versions
                    </button>
                  )}
                  {compareStage === 1 && (
                    <button
                      onClick={() => { setCompareStage(0); setSelectedDraft(null); }}
                      style={{
                        padding: '12px 28px', borderRadius: 100,
                        ...mono, fontSize: 13, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        cursor: 'pointer',
                        background: 'transparent', color: C.muted,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      ↺ Reset
                    </button>
                  )}
                </div>
              )}
              {/* Landing line */}
              <div style={{
                marginTop: 26,
                padding: '22px 28px',
                background: C.text,
                color: '#FAF8F5',
                borderRadius: 14,
                textAlign: 'center',
              }}>
                <div style={{ ...serif, fontStyle: 'italic', fontSize: 24, color: '#FAF8F5', lineHeight: 1.45 }}
                  dangerouslySetInnerHTML={{ __html: p.landing.replace(/<em>/g, `<em style="color:${C.primary};font-style:italic">`) }} />
              </div>
            </div>
          );
        })()}

        {/* ── Spin the wheel ~ shows on segment 04 (live demos) ── */}
        {seg.num === '04' && (
          <SpinWheel items={ABIE_STACK} C={C} mono={mono} sans={sans} serif={serif} />
        )}

        {/* ── AI Ops Manager day visualisation ~ shows on segment 05 (AI employees) ── */}
        {seg.num === '05' && (
          <OpsManagerDay C={C} mono={mono} sans={sans} serif={serif} scale={audScale} />
        )}

        {/* ── The close ~ Value Stack + Three Doors ~ shows on segment 07 (Q&A + next step) ── */}
        {seg.num === '07' && (
          <>
            <ValueStack C={C} mono={mono} sans={sans} serif={serif} scale={audScale} />
            <ThreeDoorsOut C={C} mono={mono} sans={sans} serif={serif} scale={audScale} />
          </>
        )}

        {/* ── 4 Claudes grid ~ interactive simulation when segment uses the products panel ── */}
        {seg.panel === 'products' && (
          <div style={{ maxWidth: 1280, margin: '48px auto 0' }}>
            <div style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-block', width: 22, height: 1, background: C.primary }} />
              Same brain ~ four doors
            </div>
            <div style={{ ...mono, fontSize: 12, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 22, opacity: 0.7 }}>
              {activeClaude === null ? '↓ click any door to see it in action' : '↓ click another to switch · click again to close'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
              {CLAUDE_PRODUCTS.map((p, i) => {
                const isActive = activeClaude === i;
                return (
                  <div
                    key={p.icon}
                    onClick={() => setActiveClaude(isActive ? null : i)}
                    style={{
                      padding: '24px 26px',
                      borderRadius: 16,
                      border: `2px solid ${isActive ? C.primary : C.border}`,
                      background: isActive ? C.text : C.surface,
                      color: isActive ? onDark : C.text,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isActive ? 'translateY(-2px)' : 'none',
                      boxShadow: isActive ? `0 16px 32px -10px ${C.primary}55` : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 52, height: 52, flexShrink: 0,
                        borderRadius: 12,
                        background: isActive ? C.primary : `${C.primary}20`,
                        color: isActive ? (C.text === '#2A2520' ? '#FAF8F5' : C.bg) : C.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...mono, fontSize: 18, fontWeight: 800,
                      }}>{p.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ ...sans, fontSize: 22, fontWeight: 700, color: isActive ? onDark : C.text, letterSpacing: '-0.01em', marginBottom: 4 }}>
                          {p.name}
                        </div>
                        <div style={{ ...mono, fontSize: 11, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                          {p.tag}
                        </div>
                        <div style={{ ...serif, fontSize: 18, lineHeight: 1.5, color: isActive ? onDark : C.text, marginBottom: 8 }}>
                          {p.desc}
                        </div>
                        <div style={{ ...mono, fontSize: 11, color: isActive ? 'rgba(250,248,245,0.55)' : C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Best for ~ <span style={{ color: isActive ? onDark : C.text, fontWeight: 700 }}>{p.best}</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulation log (only when active) */}
                    {isActive && (
                      <div style={{
                        marginTop: 4,
                        padding: '14px 16px',
                        background: 'rgba(250,248,245,0.06)',
                        borderRadius: 10,
                        border: '1px solid rgba(250,248,245,0.1)',
                      }}>
                        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                          You ~
                        </div>
                        <div style={{ ...mono, fontSize: 14, lineHeight: 1.5, color: onDark, marginBottom: 14 }}>
                          &ldquo;{p.simulation.prompt}&rdquo;
                        </div>
                        <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: C.primary, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                          Claude ~
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {p.simulation.steps.slice(0, revealedSteps).map((step, si) => (
                            <div key={si} style={{
                              ...mono, fontSize: 13, lineHeight: 1.5,
                              color: step.startsWith('✓') ? C.primary : 'rgba(250,248,245,0.85)',
                              fontWeight: step.startsWith('✓') ? 700 : 400,
                              opacity: 0,
                              animation: 'fadeInUp 0.4s ease forwards',
                            }}>
                              {step}
                            </div>
                          ))}
                          {revealedSteps < p.simulation.steps.length && (
                            <div style={{ ...mono, fontSize: 13, color: C.primary, opacity: 0.7 }}>
                              <span style={{ display: 'inline-block', animation: 'blink 0.8s step-end infinite' }}>▋</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes blink { 0%, 100% { opacity: 0.7; } 50% { opacity: 0; } }
            `}</style>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: C.text, color: 'rgba(250,248,245,0.55)', padding: '14px 48px', flexShrink: 0, ...mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <div>Workshop hosted by <span style={{ color: onDark }}>Abie Maxey</span> + <span style={{ color: onDark }}>Meri Gee</span></div>
        <div>
          <a href={`https://${footerLink}`} style={{ color: C.primary, textDecoration: 'none', fontWeight: 700 }}>{footerLink}</a>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(1.1)}}`}</style>
    </div>
  );
}
