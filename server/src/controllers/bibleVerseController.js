const https = require('https');
const http = require('http');
const { success, error } = require('../utils/responseHelper');

// Simple cache — one verse per day
let cachedVerse = null;
let cacheDate = null;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse Tamil verse from tamil-bible.com homepage
function parseTamilVerse(html) {
  try {
    // Look for verse text in the page — the site has verse of the day
    // Try multiple patterns to find the verse

    // Pattern 1: Look for verse-card or daily verse section
    let tamilText = '';
    let reference = '';

    // Extract from meta description or og tags which often have the daily verse
    const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (ogDescMatch) {
      tamilText = ogDescMatch[1].trim();
    }

    // Try to find verse reference
    const refMatch = html.match(/(?:வசனம்|verse|Today).*?<[^>]*>([^<]*\d+:\d+[^<]*)</i);
    if (refMatch) {
      reference = refMatch[1].trim();
    }

    // Alternative: look for common verse patterns in the HTML body
    if (!tamilText) {
      // Look for Tamil Unicode text near "verse" or "வசனம்" keywords
      const verseBlockMatch = html.match(/<div[^>]*class="[^"]*verse[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (verseBlockMatch) {
        tamilText = verseBlockMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    // Try finding any paragraph with Tamil text and a Bible reference pattern
    if (!tamilText) {
      const tamilParaMatch = html.match(/<p[^>]*>([\u0B80-\u0BFF][\s\S]*?)<\/p>/);
      if (tamilParaMatch) {
        tamilText = tamilParaMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    return { tamilText, reference };
  } catch {
    return { tamilText: '', reference: '' };
  }
}

// GET /api/bible-verse/today
exports.getToday = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Return cached if same day
    if (cachedVerse && cacheDate === today) {
      return success(res, cachedVerse);
    }

    let tamilText = '';
    let englishText = '';
    let reference = '';

    // Fetch Tamil verse from tamil-bible.com
    try {
      const tamilHtml = await fetchUrl('https://www.tamil-bible.com/');
      const parsed = parseTamilVerse(tamilHtml);
      tamilText = parsed.tamilText;
      reference = parsed.reference;
    } catch {
      // Silently fail
    }

    // Fetch English verse of the day from bible.org API
    try {
      const englishJson = await fetchUrl('https://labs.bible.org/api/?passage=votd&type=json');
      const englishData = JSON.parse(englishJson);
      if (Array.isArray(englishData) && englishData.length > 0) {
        const verse = englishData[0];
        englishText = verse.text?.replace(/<[^>]+>/g, '').trim() || '';
        if (!reference) {
          reference = `${verse.bookname} ${verse.chapter}:${verse.verse}`;
        }
      }
    } catch {
      // Silently fail
    }

    // Fallback verses if both fail
    const fallbackVerses = [
      {
        tamil: 'கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; நான் தாழ்ச்சியடையேன்.',
        english: 'The Lord is my shepherd; I shall not want.',
        reference: 'Psalm 23:1',
      },
      {
        tamil: 'பயப்படாதே, நான் உன்னுடனே இருக்கிறேன்; திகையாதே, நான் உன் தேவன்.',
        english: 'Fear not, for I am with you; be not dismayed, for I am your God.',
        reference: 'Isaiah 41:10',
      },
      {
        tamil: 'என்னால் எல்லாம் செய்ய எனக்கு பலன் தருகிற கிறிஸ்துவினாலே கூடும்.',
        english: 'I can do all things through Christ who strengthens me.',
        reference: 'Philippians 4:13',
      },
      {
        tamil: 'தேவன், தம்முடைய ஒரேபேறான குமாரனை விசுவாசிக்கிறவன் எவனோ அவன் கெட்டுப்போகாமல் நித்தியஜீவனை அடையும்படிக்கு, அவரைத் தந்தருளி, இவ்வளவாய் உலகத்தில் அன்புகூர்ந்தார்.',
        english: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
        reference: 'John 3:16',
      },
      {
        tamil: 'உன் முழு இருதயத்தோடும் கர்த்தரில் நம்பிக்கையாயிரு; உன் சொந்த புத்தியின்மேல் சாயாதே.',
        english: 'Trust in the Lord with all your heart and lean not on your own understanding.',
        reference: 'Proverbs 3:5',
      },
      {
        tamil: 'கர்த்தருக்குக் காத்திருக்கிறவர்களோ புதுப்பெலன் அடைவார்கள்.',
        english: 'But those who hope in the Lord will renew their strength.',
        reference: 'Isaiah 40:31',
      },
      {
        tamil: 'சமாதானத்தை உங்களுக்கு வைத்துப்போகிறேன், என்னுடைய சமாதானத்தையே உங்களுக்குக் கொடுக்கிறேன்.',
        english: 'Peace I leave with you; my peace I give you.',
        reference: 'John 14:27',
      },
    ];

    // Use today's date to pick a consistent fallback verse
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const fallback = fallbackVerses[dayOfYear % fallbackVerses.length];

    const verse = {
      tamil: tamilText || fallback.tamil,
      english: englishText || fallback.english,
      reference: reference || fallback.reference,
      date: today,
    };

    // Cache it
    cachedVerse = verse;
    cacheDate = today;

    success(res, verse);
  } catch (err) {
    next(err);
  }
};
