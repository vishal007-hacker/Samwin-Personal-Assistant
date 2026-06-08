import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Image as ImageIcon, Sparkles, Download, Save, Trash2, Loader2, RefreshCw,
  MessageCircle, BookOpen, Palette, Type, Edit3, Plus, Heart, X, Languages,
} from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import {
  useVerseOfDay, useFetchVerse, usePosters, useCreatePoster,
  useDeletePoster, useUpdatePoster,
} from './posterApi';

// ── Themes ──────────────────────────────────────────────────────────────────

const THEMES = [
  {
    id: 'sunset',
    name: 'Sunset',
    background: 'linear-gradient(135deg, #f97316 0%, #db2777 50%, #7c3aed 100%)',
    textColor: '#ffffff',
    decorClass: 'bg-white/10',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #1e40af 50%, #1e1b4b 100%)',
    textColor: '#ffffff',
    decorClass: 'bg-white/10',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'forest',
    name: 'Forest',
    background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #14532d 100%)',
    textColor: '#ecfccb',
    decorClass: 'bg-emerald-300/10',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'gold',
    name: 'Royal Gold',
    background: 'linear-gradient(135deg, #422006 0%, #78350f 50%, #b45309 100%)',
    textColor: '#fef3c7',
    decorClass: 'bg-amber-200/10',
    fontFamily: '"Times New Roman", serif',
  },
  {
    id: 'paper',
    name: 'Vintage Paper',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)',
    textColor: '#451a03',
    decorClass: 'bg-amber-900/5',
    fontFamily: '"Times New Roman", serif',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: 'linear-gradient(135deg, #020617 0%, #1e293b 50%, #334155 100%)',
    textColor: '#f1f5f9',
    decorClass: 'bg-sky-300/10',
    fontFamily: '"Helvetica Neue", sans-serif',
  },
  {
    id: 'rose',
    name: 'Rose Bloom',
    background: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 50%, #be185d 100%)',
    textColor: '#831843',
    decorClass: 'bg-rose-700/5',
    fontFamily: 'Georgia, serif',
  },
  {
    id: 'cross',
    name: 'Holy Cross',
    background: 'radial-gradient(circle at 50% 30%, #fbbf24 0%, #7c2d12 60%, #1c1917 100%)',
    textColor: '#fef3c7',
    decorClass: 'bg-amber-300/10',
    fontFamily: '"Times New Roman", serif',
  },
];

const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

// ── Poster preview component (also what gets captured to PNG) ───────────────

const POSTER_SIZE = 1080; // px — Instagram square
const TAMIL_FONT = '"Noto Serif Tamil", "Noto Sans Tamil", "Latha", "Nirmala UI", serif';

function PosterPreview({ title, englishBody, tamilBody, language, footer, theme, scale = 1 }) {
  const t = themeById(theme);
  const size = POSTER_SIZE * scale;
  const showEn = language !== 'ta' && !!englishBody;
  const showTa = language !== 'en' && !!tamilBody;
  const both = showEn && showTa;

  // When showing both, allocate less vertical space per text → smaller fonts.
  const enSize = both ? bodyFontSize(englishBody, true) : bodyFontSize(englishBody, false);
  const taSize = both ? bodyFontSize(tamilBody, true) : bodyFontSize(tamilBody, false);

  return (
    <div
      className="relative overflow-hidden shadow-2xl"
      style={{
        width: size,
        height: size,
        background: t.background,
        color: t.textColor,
        fontFamily: t.fontFamily,
      }}
    >
      {/* Decorative ornaments */}
      <div className={`absolute -top-20 -left-20 w-60 h-60 rounded-full ${t.decorClass}`} />
      <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full ${t.decorClass}`} />
      <div className={`absolute top-1/3 -right-10 w-32 h-32 rounded-full ${t.decorClass}`} />

      {/* Inner border ring */}
      <div
        className="absolute"
        style={{
          inset: 30 * scale,
          border: `${3 * scale}px solid ${t.textColor}33`,
          borderRadius: 8 * scale,
        }}
      />

      {/* Content */}
      <div
        className="relative h-full flex flex-col items-center justify-center text-center"
        style={{ padding: 80 * scale }}
      >
        {/* Top icon */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 80 * scale,
            height: 80 * scale,
            background: `${t.textColor}22`,
            border: `${2 * scale}px solid ${t.textColor}55`,
            marginBottom: 32 * scale,
          }}
        >
          <BookOpen style={{ width: 40 * scale, height: 40 * scale }} />
        </div>

        {/* Title (reference) */}
        {title && (
          <p
            className="font-bold tracking-widest uppercase opacity-80"
            style={{ fontSize: 28 * scale, marginBottom: 28 * scale, letterSpacing: 4 * scale }}
          >
            {title}
          </p>
        )}

        {/* English body */}
        {showEn && (
          <p
            className="font-bold leading-snug px-2"
            style={{
              fontSize: enSize * scale,
              maxWidth: 900 * scale,
              lineHeight: 1.3,
            }}
          >
            {englishBody.startsWith('"') ? englishBody : `"${englishBody}"`}
          </p>
        )}

        {/* Divider between English + Tamil when both shown */}
        {both && (
          <div
            style={{
              width: 120 * scale,
              height: 2 * scale,
              background: `${t.textColor}55`,
              margin: `${28 * scale}px 0`,
            }}
          />
        )}

        {/* Tamil body */}
        {showTa && (
          <p
            className="font-bold leading-snug px-2"
            style={{
              fontFamily: TAMIL_FONT,
              fontSize: taSize * scale,
              maxWidth: 950 * scale,
              lineHeight: 1.5, // Tamil glyphs benefit from extra leading
            }}
          >
            {tamilBody}
          </p>
        )}

        {/* Footer */}
        {footer && (
          <p
            className="opacity-70 italic"
            style={{ fontSize: 24 * scale, marginTop: 40 * scale }}
          >
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

// Auto-shrink body font when the text is long. `compact=true` is used in
// bilingual mode where each language gets less vertical space.
function bodyFontSize(body, compact = false) {
  const len = (body || '').length;
  if (compact) {
    if (len < 80) return 50;
    if (len < 160) return 42;
    if (len < 250) return 34;
    if (len < 400) return 28;
    return 24;
  }
  if (len < 80) return 72;
  if (len < 160) return 58;
  if (len < 250) return 46;
  if (len < 400) return 36;
  return 30;
}

// ── Designer modal ──────────────────────────────────────────────────────────

function PosterDesigner({ initialVerse, onClose }) {
  const [title, setTitle] = useState(initialVerse?.reference || '');
  const [englishBody, setEnglishBody] = useState(initialVerse?.english || initialVerse?.text || '');
  const [tamilBody, setTamilBody] = useState(initialVerse?.tamil || '');
  // Default to whichever language is present; prefer "both" when both exist.
  const [language, setLanguage] = useState(() => {
    if (initialVerse?.tamil && (initialVerse?.english || initialVerse?.text)) return 'both';
    if (initialVerse?.tamil) return 'ta';
    return 'en';
  });
  const [footer, setFooter] = useState('— Samwin Infotech');
  const [theme, setTheme] = useState('sunset');
  const [refLookup, setRefLookup] = useState('');
  const previewRef = useRef(null);

  const createMutation = useCreatePoster();
  const { data: lookupData, isFetching: lookupFetching, refetch: lookup } = useFetchVerse(refLookup);

  // If we were opened with a reference but no English body (Dashboard "Make
  // Poster" deep-link), auto-fetch the KJV text once.
  useEffect(() => {
    if (initialVerse?.reference && !initialVerse?.english && !initialVerse?.text) {
      setRefLookup(initialVerse.reference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = lookupData?.data;
    if (v?.text) {
      setEnglishBody(v.text);
      if (!title) setTitle(v.reference);
      toast.success(`Loaded ${v.reference}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupData]);

  const handleDownload = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      canvas.toBlob((blob) => {
        if (!blob) return toast.error('Image generation failed');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const slug = (title || 'poster').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        a.href = url;
        a.download = `${slug}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded');
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate image');
    }
  };

  const handleShare = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 1, backgroundColor: null, logging: false });
      canvas.toBlob(async (blob) => {
        if (!blob) return toast.error('Image generation failed');
        const file = new File([blob], 'poster.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          const shareText = [title, '', englishBody, tamilBody, '', footer].filter(Boolean).join('\n');
          await navigator.share({
            files: [file],
            title: title || 'Daily Verse',
            text: shareText,
          });
        } else {
          // Fallback: download + open WhatsApp Web with text
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'poster.png';
          a.click();
          URL.revokeObjectURL(url);
          const shareText = [title, '', englishBody, tamilBody, '', footer].filter(Boolean).join('\n');
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
          toast('Image saved. Attach it in WhatsApp Web that just opened.', { icon: '📤' });
        }
      });
    } catch (err) {
      toast.error(err.message || 'Share failed');
    }
  };

  const handleSave = async () => {
    if (!englishBody.trim() && !tamilBody.trim()) return toast.error('At least one verse body is required');
    // Persist both bodies in the style blob (Mixed type, no DB migration needed)
    // and keep the active language's text in bodyText for the gallery thumbnail.
    const bodyText = language === 'ta' ? tamilBody : englishBody || tamilBody;
    try {
      await createMutation.mutateAsync({
        title,
        bodyText,
        footer,
        theme,
        style: { englishBody, tamilBody, language },
      });
      toast.success('Poster saved to gallery');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Poster Designer</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body: split panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden">
          {/* Preview pane (left) */}
          <div className="bg-gray-100 p-6 flex items-center justify-center overflow-auto">
            <div
              className="origin-center"
              style={{
                transform: 'scale(0.42)',
                transformOrigin: 'center center',
              }}
            >
              <div ref={previewRef}>
                <PosterPreview
                  title={title}
                  englishBody={englishBody}
                  tamilBody={tamilBody}
                  language={language}
                  footer={footer}
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* Controls (right) */}
          <div className="border-l border-gray-200 p-5 overflow-y-auto space-y-5">
            {/* Verse lookup */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600" /> Quick Verse Lookup
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={refLookup}
                  onChange={(e) => setRefLookup(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookup()}
                  placeholder="e.g. John 3:16, Psalm 23"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => lookup()}
                  disabled={!refLookup || lookupFetching}
                  className="px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {lookupFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Pulls KJV text from bible-api.com</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-purple-600" /> Reference / Title
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. John 3:16" className={inputCls} />
            </div>

            {/* Language toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-purple-600" /> Language
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-lg">
                {[
                  { v: 'ta', l: 'தமிழ்' },
                  { v: 'both', l: 'Both' },
                  { v: 'en', l: 'English' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setLanguage(opt.v)}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      language === opt.v ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* English body — shown when language is en or both */}
            {language !== 'ta' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">English Verse</label>
                <textarea
                  value={englishBody}
                  onChange={(e) => setEnglishBody(e.target.value)}
                  rows={language === 'both' ? 3 : 5}
                  placeholder="English verse text…"
                  className={inputCls + ' resize-none'}
                />
                <p className="text-xs text-gray-500 mt-1">{englishBody.length} chars</p>
              </div>
            )}

            {/* Tamil body — shown when language is ta or both */}
            {language !== 'en' && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">தமிழ் வசனம் (Tamil Verse)</label>
                <textarea
                  value={tamilBody}
                  onChange={(e) => setTamilBody(e.target.value)}
                  rows={language === 'both' ? 3 : 5}
                  placeholder="தமிழ் வசன உரை…"
                  className={inputCls + ' resize-none'}
                  style={{ fontFamily: TAMIL_FONT }}
                />
                <p className="text-xs text-gray-500 mt-1">{tamilBody.length} chars</p>
              </div>
            )}

            {/* Footer */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Footer</label>
              <input type="text" value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="— Samwin Infotech" className={inputCls} />
            </div>

            {/* Theme picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-purple-600" /> Theme
              </label>
              <div className="grid grid-cols-4 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    className={`aspect-square rounded-lg border-2 transition-all ${theme === t.id ? 'border-purple-600 scale-105 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-400'}`}
                    style={{ background: t.background }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{themeById(theme).name}</p>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow hover:shadow-lg"
              >
                <Download className="w-4 h-4" /> Download PNG (1080×1080)
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4" /> Share via WhatsApp
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
              >
                <Save className="w-4 h-4" /> {createMutation.isPending ? 'Saving…' : 'Save to Gallery'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function PostersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: verseData, isLoading: verseLoading, refetch: refetchVerse } = useVerseOfDay();
  const verse = verseData?.data;
  const { data: postersData, isLoading: postersLoading } = usePosters();
  const posters = postersData?.data || [];

  const deleteMutation = useDeletePoster();
  const updateMutation = useUpdatePoster();

  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerSeed, setDesignerSeed] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const previewRef = useRef(null);

  // Deep-link handling.
  //
  // ?seed=today  — open designer pre-filled with today's verse (Tamil + English
  //                from the existing /api/bible-verse/today endpoint). We wait
  //                for the verse query to resolve before opening so both bodies
  //                are seeded together.
  // ?ref=John+3:16 — open designer with that reference and auto-fetch KJV text
  //                  via bible-api.com (English only; legacy behaviour).
  useEffect(() => {
    if (searchParams.get('seed') === 'today' && verse) {
      setDesignerSeed({
        reference: verse.reference,
        english: verse.english,
        tamil: verse.tamil,
      });
      setDesignerOpen(true);
      searchParams.delete('seed');
      setSearchParams(searchParams, { replace: true });
    } else {
      const ref = searchParams.get('ref');
      if (ref) {
        setDesignerSeed({ reference: ref, text: '' });
        setDesignerOpen(true);
        searchParams.delete('ref');
        setSearchParams(searchParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verse]);

  const openDesigner = (seed = null) => {
    setDesignerSeed(seed);
    setDesignerOpen(true);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete poster "${p.title || p.bodyText.slice(0, 30)}"?`)) return;
    try {
      await deleteMutation.mutateAsync(p._id);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const toggleFavorite = async (p) => {
    try {
      await updateMutation.mutateAsync({ id: p._id, isFavorite: !p.isFavorite });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const downloadSaved = async (p) => {
    if (!previewRef.current) return;
    setPreviewing(p);
    // wait one tick for the preview to render
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(previewRef.current, { scale: 1, backgroundColor: null, logging: false });
        canvas.toBlob((blob) => {
          if (!blob) return toast.error('Image generation failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const slug = (p.title || 'poster').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
          a.href = url;
          a.download = `${slug}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Downloaded');
          setPreviewing(null);
        });
      } catch (err) {
        setPreviewing(null);
        toast.error(err.message || 'Failed');
      }
    }, 100);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><ImageIcon className="w-6 h-6 text-purple-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posters</h1>
            <p className="text-sm text-gray-500 mt-0.5">Turn daily Bible words into shareable posters</p>
          </div>
        </div>
        <button onClick={() => openDesigner(null)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow hover:shadow-lg">
          <Sparkles className="w-4 h-4" /> Create Poster
        </button>
      </div>

      {/* Verse of the Day card */}
      <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50 border border-purple-200 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-white rounded-xl shadow-sm shrink-0">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Verse of the Day</p>
              {verseLoading ? (
                <div className="flex items-center gap-2 text-gray-500 py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
              ) : (verse?.english || verse?.tamil) ? (
                <>
                  {verse.reference && <p className="text-lg font-bold text-gray-900 mb-1">{verse.reference}</p>}
                  {verse.english && <p className="text-gray-700 italic leading-relaxed mb-2">"{verse.english}"</p>}
                  {verse.tamil && (
                    <p
                      className="text-gray-700 italic leading-relaxed"
                      style={{ fontFamily: TAMIL_FONT }}
                    >
                      {verse.tamil}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">Could not load today's verse. {verse?.error && <span className="block text-red-500 mt-1">{verse.error}</span>}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => refetchVerse()} className="p-2 text-gray-500 hover:bg-white rounded-lg" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => openDesigner({ reference: verse?.reference, english: verse?.english, tamil: verse?.tamil })}
              disabled={!verse?.english && !verse?.tamil}
              className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 inline mr-1" /> Make Poster
            </button>
          </div>
        </div>
      </div>

      {/* Saved posters gallery */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Saved Posters ({posters.length})</h2>
        </div>
        {postersLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
        ) : posters.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No saved posters yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Create one and click "Save to Gallery"</p>
            <button onClick={() => openDesigner(null)} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Create First Poster
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-5">
            {posters.map((p) => {
              const t = themeById(p.theme);
              const en = p.style?.englishBody;
              const ta = p.style?.tamilBody;
              return (
                <div key={p._id} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-3"
                    style={{ background: t.background, color: t.textColor, fontFamily: t.fontFamily }}
                  >
                    {p.title && <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{p.title}</p>}
                    <p className="text-[11px] leading-tight font-bold line-clamp-3">{en || p.bodyText}</p>
                    {ta && <p className="text-[11px] leading-tight font-bold line-clamp-3 mt-1" style={{ fontFamily: TAMIL_FONT }}>{ta}</p>}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => downloadSaved(p)} title="Download" className="p-2 bg-white rounded-full hover:bg-gray-100"><Download className="w-4 h-4 text-gray-700" /></button>
                    <button onClick={() => openDesigner({ reference: p.title, english: en || p.bodyText, tamil: ta })} title="Edit copy" className="p-2 bg-white rounded-full hover:bg-gray-100"><Edit3 className="w-4 h-4 text-gray-700" /></button>
                    <button onClick={() => toggleFavorite(p)} title="Favorite" className="p-2 bg-white rounded-full hover:bg-gray-100"><Heart className={`w-4 h-4 ${p.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-gray-700'}`} /></button>
                    <button onClick={() => handleDelete(p)} title="Delete" className="p-2 bg-white rounded-full hover:bg-red-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden full-size preview used for downloading saved posters */}
      {previewing && (
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <div ref={previewRef}>
            <PosterPreview
              title={previewing.title}
              englishBody={previewing.style?.englishBody || previewing.bodyText}
              tamilBody={previewing.style?.tamilBody}
              language={previewing.style?.language || (previewing.style?.tamilBody ? 'both' : 'en')}
              footer={previewing.footer}
              theme={previewing.theme}
            />
          </div>
        </div>
      )}

      {designerOpen && <PosterDesigner initialVerse={designerSeed} onClose={() => setDesignerOpen(false)} />}
    </div>
  );
}
