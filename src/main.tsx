import { render } from 'preact';
import './styles.css';
import { App } from './app.tsx';
import { initStore } from './state/store.ts';

const root = document.getElementById('app')!;

initStore()
  .then(() => render(<App />, root))
  .catch((err) => {
    // If storage is unavailable the app still has to open, so say what happened
    // rather than showing a blank screen.
    root.innerHTML = '';
    const p = document.createElement('div');
    p.className = 'screen';
    p.innerHTML =
      '<div class="screen-head"><h1 class="screen-title">Could not open</h1></div>' +
      '<p class="empty">This browser would not let the app save anything, so it cannot keep your progress. ' +
      'If you are in a private window, try a normal one. If site data is blocked for this page, allow it and reload.</p>';
    root.append(p);
    console.error(err);
  });
