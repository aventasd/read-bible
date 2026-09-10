import { useEffect, useRef, useState } from 'preact/hooks';
import { readingOf, textUrl, PLAN } from '../plan.ts';
import { useProgress } from '../state/store.ts';
import { formatReading, nivLink } from '../lib/refs.ts';

interface ShardChapter {
  book: string;
  name: string;
  chapter: number;
  verses: string[];
}

/**
 * Where he had got to in the reading he was last in.
 *
 * Only the most recent reading is remembered, because that is the only one that
 * matters. Stored in localStorage rather than sessionStorage so closing the app
 * and coming back tomorrow still lands him in the right place.
 */
const SCROLL_KEY = 'read-bible.scroll';

function saveScroll(n: number, y: number) {
  try {
    localStorage.setItem(SCROLL_KEY, JSON.stringify({ n, y }));
  } catch {
    /* private windows throw on access; the reader still works without this */
  }
}

function loadScroll(n: number): number {
  try {
    const raw = localStorage.getItem(SCROLL_KEY);
    if (!raw) return 0;
    const saved = JSON.parse(raw) as { n: number; y: number };
    return saved.n === n && Number.isFinite(saved.y) ? saved.y : 0;
  } catch {
    return 0;
  }
}

export function Reader({ n, onBack }: { n: number; onBack: () => void }) {
  const { store, completed } = useProgress();
  const reading = readingOf(n);
  const [chapters, setChapters] = useState<ShardChapter[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [through, setThrough] = useState(0);
  const restored = useRef(false);
  const latestScroll = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setChapters(null);
    setFailed(false);
    restored.current = false;
    fetch(textUrl(n))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((shard: { chapters: ShardChapter[] }) => {
        if (!cancelled) setChapters(shard.chapters);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [n]);

  // Put him back where he was, once the text exists to scroll through.
  useEffect(() => {
    if (!chapters || restored.current) return;
    restored.current = true;
    const y = loadScroll(n);
    if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
  }, [chapters, n]);

  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setThrough(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      latestScroll.current = window.scrollY;
      // Saving is delayed on purpose. Leaving this screen scrolls the page back
      // to the top, which would otherwise overwrite his real place with zero.
      // Unmounting cancels the pending save, so that never lands.
      clearTimeout(pending);
      pending = setTimeout(() => saveScroll(n, latestScroll.current), 200);
    };

    // Switching apps is the common case, and it is worth saving immediately.
    const onHide = () => {
      if (document.visibilityState === 'hidden') saveScroll(n, latestScroll.current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    onScroll();

    return () => {
      clearTimeout(pending);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [n]);

  if (!reading) {
    return (
      <div class="screen">
        <p class="empty">That reading number is not in the plan.</p>
      </div>
    );
  }

  const scale = store.get().fontScale;

  return (
    <>
      <div class="reader-progress" aria-hidden="true">
        <span style={{ width: `${Math.round(through * 100)}%` }} />
      </div>
      <div class="screen">
        <div class="reader-bar">
          <button class="back" onClick={onBack}>
            Back
          </button>
          <span class="where">
            {n} of {PLAN.totalReadings}
          </span>
        </div>

        <h1 class="screen-title" style={{ marginTop: '16px' }}>
          {formatReading(reading.parts)}
        </h1>

        {failed && (
          <div class="notice bad">
            This reading is not saved on your phone yet, and there is no connection
            right now. Open Settings and choose Save all readings for offline while
            you have internet, and this will never happen again.
          </div>
        )}

        {!chapters && !failed && <p class="empty">Loading the text.</p>}

        {chapters?.map((c) => (
          <div key={`${c.book}-${c.chapter}`}>
            <h2 class="chapter-head">
              <span>
                {c.name} {c.chapter}
              </span>
              <a
                href={nivLink(c.book, c.chapter)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Read ${c.name} ${c.chapter} in the NIV`}
              >
                NIV
              </a>
            </h2>
            <p class="verses" style={{ '--font-scale': String(scale) }}>
              {c.verses.map((text, i) => (
                <span key={i}>
                  <span class="vn">{i + 1}</span>
                  {text}{' '}
                </span>
              ))}
            </p>
          </div>
        ))}

        {chapters && (
          <div class="actions">
            <button
              class={completed.has(n) ? 'btn btn-done' : 'btn btn-primary'}
              onClick={() => {
                store.markRead(n);
                onBack();
              }}
            >
              {completed.has(n) ? 'Read' : 'Mark as read'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
