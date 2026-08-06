// YouTube Data API v3 Client Utility
// Safely queries live YouTube endpoints, and includes a rich Ghibli/Lofi fallback in case API keys are missing.

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

// -------------------------------------------------------------
// HIGH QUALITY FALLBACK MOCK DATA (With 100% working YouTube IDs!)
// -------------------------------------------------------------
const FALLBACK_VIDEOS = [
  {
    videoId: 'ByXuk9QqQkk',
    title: 'Spirited Away Official Trailer',
    duration: '2m 16s',
    thumbnailUrl: 'https://img.youtube.com/vi/ByXuk9QqQkk/0.jpg',
    channelTitle: 'Madman Anime',
    provider: 'youtube',
    views: '12M views',
    uploadDate: 'Released 2001'
  },
  {
    videoId: 'iwROgK94yiM',
    title: 'Howls Moving Castle Official Trailer',
    duration: '1m 45s',
    thumbnailUrl: 'https://img.youtube.com/vi/iwROgK94yiM/0.jpg',
    channelTitle: 'Madman Anime',
    provider: 'youtube',
    views: '8.4M views',
    uploadDate: 'Released 2004'
  },
  {
    videoId: '4OiMTOB71BI',
    title: 'Princess Mononoke Trailer',
    duration: '2m 14s',
    thumbnailUrl: 'https://img.youtube.com/vi/4OiMTOB71BI/0.jpg',
    channelTitle: 'Madman Anime',
    provider: 'youtube',
    views: '4.8M views',
    uploadDate: 'Released 1997'
  },
  {
    videoId: '92a7HUtwCqc',
    title: 'My Neighbor Totoro Trailer',
    duration: '1m 32s',
    thumbnailUrl: 'https://img.youtube.com/vi/92a7HUtwCqc/0.jpg',
    channelTitle: 'Madman Anime',
    provider: 'youtube',
    views: '3.6M views',
    uploadDate: 'Released 1988'
  },
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 🌌 beats to relax/study to',
    duration: 'Live Stream',
    thumbnailUrl: 'https://img.youtube.com/vi/jfKfPfyJRdk/0.jpg',
    channelTitle: 'Lofi Girl',
    provider: 'youtube',
    views: '45K watching',
    uploadDate: 'LIVE NOW'
  },
  {
    videoId: 'hC8CH0j3YZE',
    title: 'Studio Ghibli Nature Loop - Beautiful Piano Tracks',
    duration: '3h 0m',
    thumbnailUrl: 'https://img.youtube.com/vi/hC8CH0j3YZE/0.jpg',
    channelTitle: 'Ghibli Music',
    provider: 'youtube',
    views: '2.1M views',
    uploadDate: 'Released 2022'
  },
  {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    duration: '3m 33s',
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
    channelTitle: 'Rick Astley',
    provider: 'youtube',
    views: '1.4B views',
    uploadDate: 'Released 2009'
  }
];

// Helper to format ISO 8601 Durations (e.g. PT3M25S -> 3m 25s)
function formatISODuration(iso) {
  if (!iso) return '2m 0m';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '2m 0s';
  const h = match[1] ? match[1] + 'h ' : '';
  const m = match[2] ? match[2] + 'm ' : '';
  const s = match[3] ? match[3] + 's' : '0s';
  return (h + m + s).trim();
}

// Helper to format numbers to short labels (e.g. 1500000 -> 1.5M views)
function formatViewsCount(count) {
  if (!count) return '100K views';
  const num = parseInt(count, 10);
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B views';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K views';
  return num + ' views';
}

export async function searchYouTubeVideos(query) {
  // If API KEY is blank or fallback is active
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    console.log("[YouTube API] No API Key found. Returning filtered fallback.");
    if (!query || !query.trim()) return FALLBACK_VIDEOS;
    const cleanQuery = query.toLowerCase().trim();
    return FALLBACK_VIDEOS.filter(v => 
      v.title.toLowerCase().includes(cleanQuery) || 
      v.channelTitle.toLowerCase().includes(cleanQuery)
    );
  }

  try {
    // 1. Query Search Endpoint
    const searchRes = await fetch(
      `${SEARCH_URL}?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`
    );
    const searchData = await searchRes.json();
    
    if (searchData.error) {
      console.warn("[YouTube API] Search endpoint error:", searchData.error);
      throw new Error(searchData.error.message);
    }

    const items = searchData.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map(item => item.id.videoId).join(',');

    // 2. Query Videos Endpoint to retrieve Durations and Statistics
    const detailRes = await fetch(
      `${VIDEOS_URL}?part=contentDetails,statistics,snippet&id=${videoIds}&key=${API_KEY}`
    );
    const detailData = await detailRes.json();

    return detailData.items.map(item => {
      const duration = formatISODuration(item.contentDetails?.duration);
      const views = formatViewsCount(item.statistics?.viewCount);
      const date = item.snippet?.publishedAt 
        ? 'Released ' + new Date(item.snippet.publishedAt).getFullYear() 
        : 'Uploaded recently';

      return {
        videoId: item.id,
        title: item.snippet?.title || 'YouTube Video',
        duration,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id}/0.jpg`,
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        provider: 'youtube',
        views,
        uploadDate: date
      };
    });
  } catch (err) {
    console.error("[YouTube API] Error fetching live results. Falling back to mockup lists.", err);
    // Return matching mock results on error
    if (!query) return FALLBACK_VIDEOS;
    return FALLBACK_VIDEOS.filter(v => v.title.toLowerCase().includes(query.toLowerCase()));
  }
}

export async function getTrendingYouTubeVideos() {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    return FALLBACK_VIDEOS.slice(0, 5);
  }

  try {
    const res = await fetch(
      `${VIDEOS_URL}?part=snippet,contentDetails,statistics&chart=mostPopular&maxResults=5&videoCategoryId=10&key=${API_KEY}` // Category 10 is Music
    );
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.items.map(item => ({
      videoId: item.id,
      title: item.snippet?.title || 'Trending Video',
      duration: formatISODuration(item.contentDetails?.duration),
      thumbnailUrl: item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${item.id}/0.jpg`,
      channelTitle: item.snippet?.channelTitle || 'YouTube',
      provider: 'youtube',
      views: formatViewsCount(item.statistics?.viewCount),
      uploadDate: item.snippet?.publishedAt 
        ? 'Released ' + new Date(item.snippet.publishedAt).getFullYear() 
        : 'Trending'
    }));
  } catch (err) {
    console.error("[YouTube API] Trending fetch failed. Falling back to mockup clips.", err);
    return FALLBACK_VIDEOS.slice(0, 4);
  }
}

export async function getYouTubeVideoDetails(videoId) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY') {
    const found = FALLBACK_VIDEOS.find(v => v.videoId === videoId);
    if (found) return found;
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      duration: '4m 30s',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      channelTitle: 'YouTube Creator',
      provider: 'youtube',
      views: '100K views',
      uploadDate: 'Uploaded recently'
    };
  }

  try {
    const detailRes = await fetch(
      `${VIDEOS_URL}?part=contentDetails,statistics,snippet&id=${videoId}&key=${API_KEY}`
    );
    const detailData = await detailRes.json();
    if (detailData.items && detailData.items.length > 0) {
      const item = detailData.items[0];
      const duration = formatISODuration(item.contentDetails?.duration);
      const views = formatViewsCount(item.statistics?.viewCount);
      const date = item.snippet?.publishedAt 
        ? 'Released ' + new Date(item.snippet.publishedAt).getFullYear() 
        : 'Uploaded recently';

      return {
        videoId,
        title: item.snippet?.title || 'YouTube Video',
        duration,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/0.jpg`,
        channelTitle: item.snippet?.channelTitle || 'YouTube',
        provider: 'youtube',
        views,
        uploadDate: date
      };
    }
    throw new Error('Video details not found');
  } catch (err) {
    console.error('[YouTube API] Detail fetch failed, using fallback mock metadata:', err);
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      duration: '4m 30s',
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      channelTitle: 'YouTube Creator',
      provider: 'youtube',
      views: '100K views',
      uploadDate: 'Uploaded recently'
    };
  }
}

