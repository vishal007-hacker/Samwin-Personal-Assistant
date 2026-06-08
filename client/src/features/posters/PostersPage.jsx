import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Image as ImageIcon, Sparkles, Download, Save, Trash2, Loader2, RefreshCw,
  MessageCircle, BookOpen, Palette, Type, Edit3, Plus, Heart, X,
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

function PosterPreview({ title, body, footer, theme, scale = 1 }) {
  const t = themeById(theme);
  const size = POSTER_SIZE * scale;
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
      {/* Decorative corner ornaments */}
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
          className="rounded-full flex items-center justify-center mb-8"
          style={{
            width: 80 * scale,
            height: 80 * scale,
            background: `${t.textColor}22`,
            border: `${2 * scale}px solid ${t.textColor}55`,
          }}
        >
          <BookOpen style={{ width: 40 * scale, height: 40 * scale }} />
        </div>

        {/* Title (reference) */}
        {title && (
          <p
            className="font-bold tracking-widest uppercase opacity-80"
            style={{ fontSize: 28 * scale, marginBottom: 32 * scale, letterSpacing: 4 * scale }}
          >
            {title}
          </p>
        )}

        {/* Body */}
        <p
          className="font-bold leading-snug px-4"
          style={{
            fontSize: bodyFontSize(body) * scale,
            maxWidth: 900 * scale,
            lineHeight: 1.3,
          }}
        >
          {body && body.startsWith('"') ? body : `"${body}"`}
        </p>

        {/* Footer */}
        {footer && (
          <p
            className="opacity-70 italic"
            style={{ fontSize: 24 * scale, marginTop: 48 * scale }}
          >
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

// Auto-shrink the body font when the text is long so it always fits.
function bodyFontSize(body) {
  const len = (body || '').length;
  if (len < 80) return 72;
  if (len < 160) return 58;
  if (len < 250) return 46;
  if (len < 400) return 36;
  return 30;
}

// ── Designer modal ──────────────────────────────────────────────────────────

function PosterDesigner({ initialVerse, onClose }) {
  const [title, setTitle] = useState(initialVerse?.reference || '');
  const [body, setBody] = useState(initialVerse?.text || '');
  const [footer, setFooter] = useState('— Samwin Infotech');
  const [theme, setTheme] = useState('sunset');
  const [refLookup, setRefLookup] = useState('');
  const previewRef = useRef(null);

  const createMutation = useCreatePoster();
  const { data: lookupData, isFetching: lookupFetching, refetch: lookup } = useFetchVerse(refLookup);

  // If we were opened with a reference but no text (Dashboard "Make Poster"
  // link), auto-fetch the verse text once.
  useEffect(() => {
    if (initialVerse?.reference && !initialVerse?.text) {
      setRefLookup(initialVerse.reference);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const v = lookupData?.data;
    if (v?.text) {
      setBody(v.text);
      setTitle(v.reference);
      toast.success(`Loaded ${v.reference}`);
    }
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
          await navigator.share({
            files: [file],
            title: title || 'Daily Verse',
            text: `${title ? `${title}\n\n` : ''}${body}`,
          });
        } else {
          // Fallback: download + open WhatsApp Web with text
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'poster.png';
          a.click();
          URL.revokeObjectURL(url);
          window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n\n${body}\n\n${footer}`)}`, '_blank');
          toast('Image saved. Attach it in WhatsApp Web that just opened.', { icon: '📤' });
        }
      });
    } catch (err) {
      toast.error(err.message || 'Share failed');
    }
  };

  const handleSave = async () => {
    if (!body.trim()) return toast.error('Body text is required');
    try {
      await createMutation.mutateAsync({ title, bodyText: body, footer, theme });
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
                <PosterPreview title={title} body={body} footer={footer} theme={theme} />
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

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Verse / Quote</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="The verse or message to display…"
                className={inputCls + ' resize-none'}
              />
              <p className="text-xs text-gray-500 mt-1">{body.length} chars — font auto-shrinks for longer text</p>
            </div>

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

  // If the URL has ?ref=John+3:16 (from the dashboard "Make Poster" link), open
  // the designer pre-seeded with that reference. The designer will fetch the
  // verse text via its built-in lookup.
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setDesignerSeed({ reference: ref, text: '' });
      setDesignerOpen(true);
      searchParams.delete('ref');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              ) : verse?.text ? (
                <>
                  <p className="text-lg font-bold text-gray-900 mb-1">{verse.reference}</p>
                  <p className="text-gray-700 italic leading-relaxed">"{verse.text}"</p>
                  <p className="text-xs text-gray-400 mt-2">{verse.translation || 'KJV'}{verse.cached ? ' · cached' : ''}</p>
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
              onClick={() => openDesigner({ reference: verse?.reference, text: verse?.text })}
              disabled={!verse?.text}
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
              return (
                <div key={p._id} className="group relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-200 hover:shadow-lg transition-shadow">
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-center p-3"
                    style={{ background: t.background, color: t.textColor, fontFamily: t.fontFamily }}
                  >
                    {p.title && <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{p.title}</p>}
                    <p className="text-xs leading-tight font-bold line-clamp-6">{p.bodyText}</p>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => downloadSaved(p)} title="Download" className="p-2 bg-white rounded-full hover:bg-gray-100"><Download className="w-4 h-4 text-gray-700" /></button>
                    <button onClick={() => openDesigner({ reference: p.title, text: p.bodyText })} title="Edit copy" className="p-2 bg-white rounded-full hover:bg-gray-100"><Edit3 className="w-4 h-4 text-gray-700" /></button>
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
            <PosterPreview title={previewing.title} body={previewing.bodyText} footer={previewing.footer} theme={previewing.theme} />
          </div>
        </div>
      )}

      {designerOpen && <PosterDesigner initialVerse={designerSeed} onClose={() => setDesignerOpen(false)} />}
    </div>
  );
}
