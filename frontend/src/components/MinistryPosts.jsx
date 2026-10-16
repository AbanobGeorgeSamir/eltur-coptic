import { useEffect, useState } from 'react';
import { api } from '../services/api';
import PostMedia from './PostMedia';

const PAGE_SIZE = 18;

const eventLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    ...(String(value).includes('T') ? { timeStyle: 'short' } : {}),
  }).format(date);
};

const newestFirst = (posts) => posts.sort((a, b) => (
  new Date(b.createdAt) - new Date(a.createdAt)
  || String(b._id).localeCompare(String(a._id))
));

export default function MinistryPosts({ types, title, description, gallery = false }) {
  const [posts, setPosts] = useState([]);
  const [pageState, setPageState] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const typeKey = types.join(',');

  useEffect(() => {
    let active = true;
    const pageTypes = typeKey.split(',').filter(Boolean);
    setLoading(true);
    setError('');
    setPosts([]);
    setPageState({});

    Promise.all(pageTypes.map((type) => api.postsPage(type, 1, PAGE_SIZE)))
      .then((results) => {
        if (!active) return;
        const initialPosts = results.flatMap((result) => result.data || []);
        setPosts(newestFirst(initialPosts));
        setPageState(Object.fromEntries(results.map((result, index) => [pageTypes[index], {
          page: result.pagination?.page || 1,
          hasMore: Boolean(result.pagination?.hasMore),
        }])));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'تعذر تحميل المنشورات.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [typeKey, reloadKey]);

  const loadMore = async () => {
    const nextTypes = typeKey.split(',').filter((type) => pageState[type]?.hasMore);
    if (!nextTypes.length || loadingMore) return;

    setLoadingMore(true);
    setError('');
    try {
      const results = await Promise.all(nextTypes.map((type) => (
        api.postsPage(type, pageState[type].page + 1, PAGE_SIZE)
      )));
      const newPosts = results.flatMap((result) => result.data || []);
      setPosts((current) => {
        const uniquePosts = new Map(current.map((post) => [String(post._id), post]));
        newPosts.forEach((post) => uniquePosts.set(String(post._id), post));
        return newestFirst([...uniquePosts.values()]);
      });
      setPageState((current) => ({
        ...current,
        ...Object.fromEntries(results.map((result, index) => [nextTypes[index], {
          page: result.pagination?.page || current[nextTypes[index]]?.page || 1,
          hasMore: Boolean(result.pagination?.hasMore),
        }])),
      }));
    } catch (requestError) {
      setError(requestError.message || 'تعذر تحميل المزيد من المنشورات.');
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = Object.values(pageState).some(({ hasMore: more }) => more);

  return (
    <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </header>
      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-sm text-rose-200">{error}</p>
          {!posts.length && <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="min-h-10 rounded-lg border border-rose-300/25 px-3 text-sm font-bold text-rose-100">إعادة المحاولة</button>}
        </div>
      )}
      {loading && <p role="status" aria-busy="true" className="animate-pulse rounded-2xl bg-slate-900 p-5 text-sm text-slate-400">جارٍ تحميل المحتوى...</p>}
      {!loading && !error && posts.length === 0 && <p className="rounded-2xl bg-slate-900 p-5 text-slate-400">لا يوجد محتوى منشور حالياً.</p>}
      <div className={gallery ? 'grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3' : 'space-y-3'}>
        {posts.map((post) => (
          <article key={post._id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {post.mediaUrl && <PostMedia mediaUrl={post.mediaUrl} mediaKind={post.mediaKind} title={post.title} downloadable={gallery && post.mediaKind === 'image'} className={gallery ? 'aspect-square w-full object-cover' : 'aspect-video max-h-96 w-full bg-slate-950 object-contain'} />}
            <div className="p-3 sm:p-4 md:p-5">
              <h2 className="break-words font-bold text-amber-300">{post.title}</h2>
              {!gallery && post.body && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">{post.body}</p>}
              {gallery && post.body && <p className="mt-2 break-words text-xs leading-5 text-slate-300">{post.body}</p>}
              {post.eventAt && <p className="mt-3 text-xs text-slate-400">{eventLabel(post.eventAt)}</p>}
            </div>
          </article>
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/5 px-5 py-3 text-sm font-bold text-amber-200 transition hover:border-amber-300/50 hover:bg-amber-300/10 disabled:cursor-wait disabled:opacity-60">
            {loadingMore ? 'جارٍ تحميل المزيد...' : 'عرض المزيد'}
          </button>
        </div>
      )}
    </div>
  );
}
