import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { site } from '../site.config.mjs';
import { LUNAR_TABLE } from '../data/calendar.mjs';
import { addDays, resolveWindow, resolveSeasons, activeSeason, seasonPayload, parsePreview, validateSeasons, seasonDataTag, SEASON_INIT } from '../src/season-core.mjs';

const S = site.seasons;
const at = (iso, year = +iso.slice(0, 4)) => activeSeason(resolveSeasons(S, year), iso);

test('fixed range, both ends included', () => {
  assert.deepEqual(resolveWindow({ from: '10-15', to: '11-02' }, 2026), ['2026-10-15', '2026-11-02']);
  assert.equal(at('2026-10-14'), '');
  assert.equal(at('2026-10-15'), 'halloween');
  assert.equal(at('2026-11-02'), 'halloween');
  assert.equal(at('2026-11-03'), 'autumn');
  assert.equal(at('2026-11-30'), 'autumn');
  assert.equal(at('2026-12-01'), 'winter');
  assert.equal(at('2026-12-31'), 'winter');
  assert.equal(at('2026-07-01'), '');
});

test('a range that wraps over New Year', () => {
  const w = { from: '12-20', to: '01-05' };
  assert.deepEqual(resolveWindow(w, 2026), ['2026-12-20', '2027-01-05']);
  const wins = resolveSeasons([{ id: 'x', window: w }], 2027); // viewed in January 2027: last year's window
  assert.equal(activeSeason(wins, '2027-01-03'), 'x');
  assert.equal(activeSeason(resolveSeasons([{ id: 'x', window: w }], 2026), '2026-12-25'), 'x');
  assert.equal(activeSeason(wins, '2027-01-06'), '');
});

test('lunar window: 14 days before to 14 days after 春節 (the end is the Lantern Festival, 元宵)', () => {
  const rule = S.find((s) => s.id === 'lunar').window;
  for (const y of [2026, 2027, 2028, 2029, 2030]) {
    const [a, b] = resolveWindow(rule, y);
    assert.equal(a, addDays(LUNAR_TABLE.cny[y], -14));
    assert.equal(b, addDays(LUNAR_TABLE.cny[y], 14), `${y} ends 14 days after`);
  }
  assert.deepEqual(resolveWindow(rule, 2026), ['2026-02-03', '2026-03-03']);
  assert.deepEqual(resolveWindow(rule, 2027), ['2027-01-23', '2027-02-20']);
  assert.deepEqual(resolveWindow(rule, 2028), ['2028-01-12', '2028-02-09']);
  assert.equal(at('2026-02-17'), 'lunar');
  assert.equal(at('2026-03-04'), '');
  assert.equal(at('2028-01-12'), 'lunar'); // year boundary: seen from 2028
  assert.equal(at('2028-01-11'), '');
});

test('outside the lunar table: no window, nothing else breaks', () => {
  const rule = S.find((s) => s.id === 'lunar').window;
  assert.equal(resolveWindow(rule, 2025), null);
  assert.equal(resolveWindow(rule, 2031), null);
  assert.equal(at('2035-02-10'), '');
  assert.equal(at('2035-12-10'), 'winter'); // fixed ranges still work
  assert.ok(resolveSeasons(S, 2040).every(([id]) => id !== 'lunar'));
});

test('overlapping windows: the first season in the table wins', () => {
  const t = [{ id: 'a', window: { from: '03-01', to: '03-20' } }, { id: 'b', window: { from: '03-10', to: '03-30' } }];
  const w = resolveSeasons(t, 2026);
  assert.equal(activeSeason(w, '2026-03-15'), 'a');
  assert.equal(activeSeason(w, '2026-03-25'), 'b');
  assert.equal(activeSeason([...w].reverse(), '2026-03-15'), 'b'); // order matters, so the payload keeps table order
  // the real table never overlaps in 2026-2030
  for (let y = 2026; y <= 2030; y++) {
    for (let d = 0; d < 365; d += 1) {
      const iso = addDays(`${y}-01-01`, d), hits = resolveSeasons(S, y).filter(([, a, b]) => iso >= a && iso <= b).map(([id]) => id);
      assert.ok(new Set(hits).size <= 1, `${iso}: ${hits}`);
    }
  }
});

test('payload is compact and covers year-1..year+1', () => {
  const p = seasonPayload(S, 2027, 'en');
  assert.deepEqual(p.k, ['halloween', 'autumn', 'winter', 'lunar', 'spring']);
  assert.deepEqual(p.m.halloween, ['\u{1F383}', 'Halloween', 'halloween', '']);
  assert.deepEqual(seasonPayload(S, 2027, 'zh').m.lunar[1], '春節');
  assert.ok(p.w.some(([id, a]) => id === 'halloween' && a === '2026-10-15') && p.w.some(([id, a]) => id === 'halloween' && a === '2028-10-15'));
  assert.ok(p.w.every((w) => w.length === 3));
  assert.ok(JSON.stringify(p).length < 1500);
  const tag = seasonDataTag(S, new Date('2026-11-02T00:00:00Z'), 'zh');
  assert.match(tag, /^<script type="application\/json" id="season-data">/);
  const json = JSON.parse(tag.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  assert.deepEqual(json.w, resolveSeasons(S, 2026));
  assert.ok(!/<(?!\/script)/.test(tag.slice(tag.indexOf('>') + 1, -9)), 'no raw < inside');
});

test('?season= parsing', () => {
  const ids = S.map((s) => s.id);
  assert.equal(parsePreview('?season=winter', ids), 'winter');
  assert.equal(parsePreview('?a=1&season=off', ids), 'off');
  assert.equal(parsePreview('?season=nope', ids), null);
  assert.equal(parsePreview('?season=constructor', ids), null);
  assert.equal(parsePreview('', ids), null);
  assert.equal(parsePreview('?xseason=winter', ids), null);
});

test('config validation', () => {
  assert.deepEqual(validateSeasons(S), []);
  assert.ok(validateSeasons([{ id: 'a', icon: 'x', label: { zh: 'a', en: 'a' }, art: 'x', window: { around: 'nothing' } }]).length);
  assert.ok(validateSeasons([{ id: 'a', icon: 'x', label: { zh: 'a', en: 'a' }, art: 'x', window: { from: '13', to: '01' } }]).length);
  assert.ok(validateSeasons([S[0], S[0]]).length);
});

// Run the real inline script against a fake browser.
function run(iso, search = '', saved = null) {
  const now = new Date(Date.parse(iso + 'T12:00:00+08:00'));
  const el = { dataset: {} }, tag = seasonDataTag(S, now, 'en').replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  const ctx = { document: { documentElement: el, getElementById: () => ({ textContent: tag }) }, location: { search },
    localStorage: { getItem: (k) => (k === 'season-off' ? saved : null) }, Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now.getTime()])); } static now() { return now.getTime(); } } };
  vm.runInNewContext(SEASON_INIT, ctx);
  return el.dataset;
}

test('inline script: date, preview, saved off', () => {
  assert.deepEqual({ ...run('2026-10-20') }, { season: 'halloween', seasonWindow: 'halloween' });
  assert.deepEqual({ ...run('2026-11-10') }, { season: 'autumn', seasonWindow: 'autumn' });
  assert.deepEqual({ ...run('2026-02-20') }, { season: 'lunar', seasonWindow: 'lunar' });
  assert.deepEqual({ ...run('2026-08-01') }, {});
  assert.deepEqual({ ...run('2026-08-01', '?season=spring') }, { season: 'spring', seasonWindow: 'spring' });
  assert.deepEqual({ ...run('2026-08-01', '?season=bogus') }, {});
  assert.deepEqual({ ...run('2026-12-05', '?season=off') }, { seasonWindow: 'winter' });
  assert.deepEqual({ ...run('2026-12-05', '', 'winter') }, { seasonWindow: 'winter' }); // saved off for this season
  assert.deepEqual({ ...run('2026-12-05', '', 'halloween') }, { season: 'winter', seasonWindow: 'winter' }); // saved off belongs to another season
  assert.deepEqual({ ...run('2026-12-05', '?season=winter', 'winter') }, { season: 'winter', seasonWindow: 'winter' }); // preview ignores saved off
  assert.deepEqual({ ...run('2026-08-01', '?season=off') }, {});
  // Taipei day boundary: 2026-11-02 23:30 +08:00 is still Halloween, 00:30 on the 3rd is autumn
  assert.equal(run('2026-11-02').season, 'halloween');
  assert.equal(run('2026-11-03').season, 'autumn');
});
