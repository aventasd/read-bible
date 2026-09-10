import { useEffect, useState } from 'preact/hooks';
import { PLAN } from './plan.ts';
import { getStore } from './state/store.ts';
import { Today } from './screens/Today.tsx';
import { Reader } from './screens/Reader.tsx';
import { Timeline } from './screens/Timeline.tsx';
import { Progress } from './screens/Progress.tsx';
import { Settings } from './screens/Settings.tsx';

type Route =
  | { name: 'today' }
  | { name: 'timeline' }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'read'; n: number };

/**
 * Hash routing, not paths.
 *
 * The app is hosted on GitHub Pages under a subpath, where a deep link to a path
 * returns a 404 page. Hashes never reach the server, so they cannot 404, and
 * there is no search engine to please here.
 */
function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const read = path.match(/^read\/(\d+)$/);
  if (read) return { name: 'read', n: Number(read[1]) };
  if (path === 'timeline') return { name: 'timeline' };
  if (path === 'progress') return { name: 'progress' };
  if (path === 'settings') return { name: 'settings' };
  return { name: 'today' };
}

const go = (to: string) => {
  location.hash = to;
};

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

  useEffect(() => {
    const onHash = () => {
      const next = parseHash(location.hash);
      setRoute(next);
      // The reader restores its own position, so leave the scroll alone when
      // opening one. Every other screen starts at the top.
      if (next.name !== 'read') window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const store = getStore();

  if (store.planMismatch) {
    return (
      <div class="screen">
        <div class="screen-head">
          <h1 class="screen-title">The plan has changed</h1>
        </div>
        <p class="empty">
          Your saved progress belongs to an older version of the reading plan, so the
          reading numbers no longer point at the same chapters. Rather than show you
          the wrong place, the app is waiting. Open Settings, save a backup, then use
          the repair field to say which reading you had reached.
        </p>
        <a class="btn" href="#/settings">
          Open Settings
        </a>
      </div>
    );
  }

  return (
    <>
      {route.name === 'read' ? (
        <Reader n={route.n} onBack={() => history.length > 1 ? history.back() : go('/today')} />
      ) : (
        <>
          {route.name === 'today' && <Today onRead={() => go('/today')} />}
          {route.name === 'timeline' && <Timeline onOpen={(n) => go(`/read/${n}`)} />}
          {route.name === 'progress' && <Progress onOpen={(n) => go(`/read/${n}`)} />}
          {route.name === 'settings' && <Settings />}
          <Nav current={route.name} />
        </>
      )}
    </>
  );
}

function Nav({ current }: { current: Route['name'] }) {
  const items = [
    { to: '/today', name: 'today', label: 'Today', icon: <path d="M4 6h16M4 12h10M4 18h7" /> },
    {
      to: '/timeline',
      name: 'timeline',
      label: 'Timeline',
      icon: (
        <>
          <path d="M6 3v18" />
          <circle cx="6" cy="7" r="1.6" />
          <circle cx="6" cy="16" r="1.6" />
          <path d="M11 7h8M11 16h6" />
        </>
      ),
    },
    {
      to: '/progress',
      name: 'progress',
      label: 'Progress',
      icon: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />,
    },
    {
      to: '/settings',
      name: 'settings',
      label: 'Settings',
      icon: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2M12 19v2M4.6 7.5l1.7 1M17.7 15.5l1.7 1M4.6 16.5l1.7-1M17.7 8.5l1.7-1" />
        </>
      ),
    },
  ] as const;

  return (
    <nav class="nav" aria-label="Main">
      {items.map((item) => (
        <a
          key={item.to}
          href={`#${item.to}`}
          aria-current={current === item.name ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export { PLAN };
