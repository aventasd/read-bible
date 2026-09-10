import { useEffect, useState } from 'preact/hooks';
import { PLAN } from '../plan.ts';
import { useProgress } from '../state/store.ts';
import { weekdayName, localToday } from '../state/dates.ts';
import { finishDate } from '../state/schedule.ts';
import { countCached, saveAllForOffline, type SaveProgress } from '../state/offline.ts';
import { shareProgress, downloadProgress, summaryLine, extractState } from '../state/backup.ts';

export function Settings() {
  const { store, stats, position } = useProgress();
  const settings = store.get();
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [cached, setCached] = useState<number | null>(null);
  const [saving, setSaving] = useState<SaveProgress | null>(null);
  const [repairTo, setRepairTo] = useState('');

  useEffect(() => {
    void countCached().then(setCached);
  }, []);

  const summary = summaryLine(stats, position, finishDate(position, PLAN.totalReadings, settings));

  async function onSaveOffline() {
    setNote(null);
    setSaving({ done: cached ?? 0, total: PLAN.totalReadings, failed: 0 });
    const failed = await saveAllForOffline(setSaving);
    setSaving(null);
    setCached(await countCached());
    setNote(
      failed === 0
        ? { text: 'All 313 readings are saved on this phone. It now works with no internet.' }
        : { text: `${failed} readings did not download. Tap the button again to finish them.`, bad: true },
    );
  }

  async function onShare() {
    const result = await shareProgress(store, summary);
    if (result === 'shared') setNote({ text: 'Progress sent.' });
    else if (result === 'downloaded') setNote({ text: 'Saved to your Downloads folder.' });
    else if (result === 'failed') setNote({ text: 'Sharing did not work. Try Save a backup file instead.', bad: true });
  }

  function onImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      const result = store.importBackup(extractState(text));
      input.value = '';
      setNote(
        result.ok
          ? { text: result.added > 0 ? `Restored. ${result.added} readings added.` : 'Restored. Nothing was missing.' }
          : { text: result.reason, bad: true },
      );
    });
  }

  return (
    <div class="screen">
      <div class="screen-head">
        <h1 class="screen-title">Settings</h1>
        <p>{PLAN.totalReadings} readings, six days a week, in the order the history happened.</p>
      </div>

      <div class="field">
        <label for="start">Start date</label>
        <p class="hint">
          Day one of the plan. Changing this moves the dates and keeps everything you
          have already read.
        </p>
        <input
          id="start"
          type="date"
          value={settings.startDate}
          max={localToday()}
          onChange={(e) => store.setSettings({ startDate: (e.currentTarget as HTMLInputElement).value })}
        />
      </div>

      <div class="field">
        <span class="field-label">Free day</span>
        <p class="hint">
          One day a week with no reading. A day you miss is absorbed here, so you stay
          on track without doubling up.
        </p>
        <div class="day-picker">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <button
              key={d}
              aria-pressed={settings.restDay === d}
              onClick={() => store.setSettings({ restDay: d })}
            >
              {weekdayName(d).slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div class="field">
        <label for="font">Text size</label>
        <p class="hint">How big the Bible text is when you read in the app.</p>
        <input
          id="font"
          type="range"
          min="0.9"
          max="1.6"
          step="0.1"
          value={String(settings.fontScale)}
          style={{ width: '100%' }}
          onInput={(e) => store.setSettings({ fontScale: Number((e.currentTarget as HTMLInputElement).value) })}
        />
        <p class="verses" style={{ '--font-scale': String(settings.fontScale), marginTop: '6px' }}>
          <span class="vn">1</span>In the beginning, God created the heavens and the earth.
        </p>
      </div>

      <div class="field">
        <span class="field-label">Save all readings for offline</span>
        <p class="hint">
          {cached === null
            ? 'Checking what is saved.'
            : cached >= PLAN.totalReadings
              ? 'All readings are saved. This app works with no internet.'
              : `${cached} of ${PLAN.totalReadings} readings are saved on this phone. Do this once on wifi.`}
        </p>
        {saving && (
          <>
            <div class="bar">
              <span style={{ width: `${Math.round((saving.done / saving.total) * 100)}%` }} />
            </div>
            <p class="hint" style={{ marginTop: '6px' }}>
              {saving.done} of {saving.total}
            </p>
          </>
        )}
        {!saving && cached !== null && cached < PLAN.totalReadings && (
          <button class="btn" onClick={onSaveOffline}>
            Save all readings
          </button>
        )}
      </div>

      <div class="field">
        <span class="field-label">Keep your progress safe</span>
        <p class="hint">
          Clearing your browser data deletes progress, and nothing stored in a browser
          survives that. Send yourself a copy so a year of reading cannot be lost.
        </p>
        <div class="row-actions">
          <button class="btn" onClick={onShare}>
            Share progress
          </button>
          <button
            class="btn"
            onClick={() => {
              setNote(
                downloadProgress(store, summary)
                  ? { text: 'Saved to your Downloads folder.' }
                  : { text: 'Could not save the file.', bad: true },
              );
            }}
          >
            Save a file
          </button>
        </div>
        <p class="hint" style={{ marginTop: '10px' }}>{summary}</p>

        <label class="btn" style={{ marginTop: '8px' }}>
          Restore from a file
          <input type="file" accept="text/plain,.txt,.json" onChange={onImport} style={{ display: 'none' }} />
        </label>
        <p class="hint" style={{ marginTop: '8px', marginBottom: 0 }}>
          Restoring adds anything missing. It never removes readings you have done.
        </p>
      </div>

      <div class="field">
        <label for="repair">If your progress was lost</label>
        <p class="hint">
          Type the reading number you had reached and everything up to it is marked as
          read. Use this only if a backup is not available.
        </p>
        <input
          id="repair"
          type="number"
          min="1"
          max={PLAN.totalReadings}
          value={repairTo}
          placeholder="For example 84"
          onInput={(e) => setRepairTo((e.currentTarget as HTMLInputElement).value)}
        />
        <button
          class="btn"
          style={{ marginTop: '8px' }}
          disabled={!repairTo || Number(repairTo) < 1 || Number(repairTo) > PLAN.totalReadings}
          onClick={() => {
            store.repairTo(Number(repairTo));
            setNote({ text: `Marked readings 1 to ${repairTo} as read.` });
            setRepairTo('');
          }}
        >
          Mark everything up to there as read
        </button>
      </div>

      <div class="field" style={{ borderBottom: 0 }}>
        <span class="field-label">Start the year again</span>
        <p class="hint">
          Clears every reading you have marked. Save a backup first if you might want
          this year back.
        </p>
        <button
          class="btn danger"
          onClick={() => {
            if (confirm('Clear all progress and start the plan again?')) {
              store.reset();
              setNote({ text: 'Progress cleared. The plan starts again at reading 1.' });
            }
          }}
        >
          Clear all progress
        </button>
      </div>

      {note && <div class={note.bad ? 'notice bad' : 'notice'}>{note.text}</div>}
    </div>
  );
}
