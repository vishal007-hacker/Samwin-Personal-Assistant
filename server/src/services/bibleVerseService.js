// Daily Bible verse rotation + on-demand verse lookup.
// Uses the free public bible-api.com (no auth, no rate limit observed in
// practice for low-traffic use). Caches today's verse in-memory so we don't
// hit the upstream more than once per day.

// A rotating list of 60 popular verses — one for each day (cycles after 60).
// Refs are in bible-api.com's accepted format (e.g. "John 3:16").
const ROTATION = [
  'John 3:16', 'Psalm 23:1', 'Philippians 4:13', 'Jeremiah 29:11', 'Romans 8:28',
  'Proverbs 3:5-6', 'Isaiah 41:10', 'Psalm 46:1', 'Joshua 1:9', 'Matthew 6:33',
  'Romans 12:2', '1 Corinthians 13:4-7', '2 Timothy 1:7', 'Galatians 5:22-23',
  'Ephesians 2:8-9', 'James 1:5', 'Hebrews 11:1', 'Psalm 27:1', '1 John 4:19',
  'Proverbs 16:3', 'Matthew 11:28', 'Isaiah 40:31', 'Romans 5:8', 'Psalm 119:105',
  'John 14:6', 'Philippians 4:6-7', 'Psalm 37:4', 'Colossians 3:23',
  '1 Peter 5:7', 'Matthew 5:14', 'Proverbs 22:6', 'Romans 6:23', 'Psalm 91:1-2',
  '2 Corinthians 5:17', 'Galatians 2:20', 'John 1:1', 'Hebrews 12:1-2',
  '1 Corinthians 10:13', 'Ephesians 6:10-11', 'Psalm 139:14', 'Matthew 7:7',
  'Romans 10:9', 'Mark 12:30-31', 'John 13:34', 'Psalm 34:8', 'Proverbs 17:17',
  '1 Thessalonians 5:16-18', 'Lamentations 3:22-23', 'Psalm 16:8', 'Isaiah 53:5',
  'Romans 15:13', 'John 16:33', 'Psalm 51:10', '1 John 1:9', 'Matthew 28:19-20',
  'James 1:2-3', 'Proverbs 18:10', 'Psalm 1:1-2', 'Isaiah 26:3', 'Romans 8:38-39',
];

// Returns today's reference based on day-of-year so it's deterministic and
// the same verse shows for everyone on the same day.
function todaysRef(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  return ROTATION[day % ROTATION.length];
}

// In-memory cache: { key: 'YYYY-MM-DD', value: verse object }
let dayCache = { key: null, value: null };

async function fetchVerse(reference) {
  const url = `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`bible-api.com responded ${res.status}`);
  }
  const data = await res.json();
  // bible-api shape: { reference, verses: [...], text, translation_name, ... }
  return {
    reference: data.reference || reference,
    text: (data.text || '').replace(/\s+/g, ' ').trim(),
    translation: data.translation_name || data.translation_id || 'KJV',
    verses: data.verses || [],
  };
}

async function getVerseOfDay() {
  const today = new Date();
  const key = today.toISOString().slice(0, 10);
  if (dayCache.key === key && dayCache.value) {
    return { ...dayCache.value, cached: true, fetchedFor: key };
  }
  const ref = todaysRef(today);
  try {
    const verse = await fetchVerse(ref);
    dayCache = { key, value: verse };
    return { ...verse, cached: false, fetchedFor: key };
  } catch (err) {
    // If the upstream is unreachable, fall back to the reference only so the
    // UI can still show something useful.
    return {
      reference: ref,
      text: '',
      translation: 'KJV',
      verses: [],
      error: err.message,
      fetchedFor: key,
    };
  }
}

module.exports = { getVerseOfDay, fetchVerse, todaysRef };
