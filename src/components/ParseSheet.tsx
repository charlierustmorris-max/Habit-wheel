import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState } from '../types';
import { parseEntry, type ParsedAction } from '../lib/parse';
import { Sheet } from './Sheet';
import { IconMic } from './Icons';

interface Props {
  state: AppState;
  date: string;
  onApply: (actions: ParsedAction[]) => void;
  onClose: () => void;
}

const EXAMPLES = [
  'slept 7 hours',
  'tennis, light workout',
  '6 glasses of water',
  '45 min of SAT prep',
  "didn't meditate",
  "I'm there",
];

export function ParseSheet({ state, date, onApply, onClose }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognition = useRef<SpeechLike | null>(null);

  const actions = useMemo(() => parseEntry(text, state, date), [text, state, date]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => recognition.current?.abort();
  }, []);

  // Re-parsing on every keystroke changes the action list, so drop stale skips.
  useEffect(() => setSkipped(new Set()), [text]);

  const toggleSkip = (i: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSpeechError('This browser has no speech recognition. Type it instead.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      setText(transcript);
    };
    rec.onerror = () => {
      setSpeechError('Could not hear that. Type it instead.');
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setSpeechError(null);
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recognition.current?.stop();
    setListening(false);
  };

  const kept = actions.filter((_, i) => !skipped.has(i));

  return (
    <Sheet onClose={onClose}>
      <h3>What happened?</h3>
      <p className="lede">
        Say or type it however it comes out. Anything that isn't one of your habits becomes an
        unweighted to-do.
      </p>

      <textarea
        ref={inputRef}
        rows={3}
        value={text}
        placeholder="slept 7 and a half hours, hit protein, 30 minutes of SAT prep, called the orthodontist"
        onChange={(e) => setText(e.target.value)}
        style={{ resize: 'none', lineHeight: 1.45 }}
      />

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '12px 0 4px' }}>
        <button
          className="btn"
          style={{ flex: 'none', width: 52, height: 44, display: 'grid', placeItems: 'center', padding: 0 }}
          onClick={listening ? stopListening : startListening}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
        >
          <span className={listening ? 'listening' : ''}>
            <IconMic size={20} />
          </span>
        </button>
        <span style={{ fontSize: 14, color: listening ? 'var(--accent)' : 'var(--muted)' }}>
          {listening ? 'Listening…' : speechError ?? 'Tap to speak'}
        </span>
      </div>

      {text.trim() === '' ? (
        <div style={{ marginTop: 16 }}>
          {EXAMPLES.map((e) => (
            <button key={e} className="chip" onClick={() => setText((t) => (t ? `${t}, ${e}` : e))}>
              {e}
            </button>
          ))}
        </div>
      ) : (
        <div className="parse-preview">
          {actions.length === 0 ? (
            <p className="lede" style={{ marginTop: 16 }}>Nothing to log yet.</p>
          ) : (
            actions.map((action, i) => (
              <div key={i} className={`parse-item${skipped.has(i) ? ' off' : ''}`}>
                <input
                  type="checkbox"
                  checked={!skipped.has(i)}
                  onChange={() => toggleSkip(i)}
                  style={{ width: 20, height: 20, accentColor: 'var(--accent)', flex: 'none' }}
                />
                <span className="what">{action.label}</span>
                <span className="how">{action.detail}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="sheet-actions">
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={kept.length === 0} onClick={() => onApply(kept)}>
          Log {kept.length || ''}
        </button>
      </div>
    </Sheet>
  );
}

/* --- Web Speech API, which TypeScript's DOM lib does not describe --- */

interface SpeechLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognition(): (new () => SpeechLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechLike) | null;
}
