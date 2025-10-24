// routes/tiktok-public.js
const express = require('express');
const { fetchTikTokFeed } = require('../utils/rsshub');

const router = express.Router();
const DEFAULT_LIMIT = 8;

const getChannels = () =>
  (process.env.TIKTOK_USERNAMES || '')
    .split(',').map(s => s.trim()).filter(Boolean);

const extractId = (link) => {
  const m = (link || '').match(/\/video\/(\d+)/);
  return m ? m[1] : null;
};

// รายชื่อช่อง (ให้หน้าเว็บทำปุ่ม)
router.get('/channels', (req, res) => {
  res.json({ channels: getChannels().map(u => ({ username: u, avatar_url: null })) });
});

// โหลดล็อตแรก (รวมหลายช่อง)
router.get('/videos-public', async (req, res) => {
  try {
    const qs = String(req.query.channels || '').trim();
    const channels = qs ? qs.split(',').map(s => s.trim()).filter(Boolean) : getChannels();
    const limit = Math.min(20, parseInt(req.query.limit || DEFAULT_LIMIT, 10));

    const bag = [];
    for (const u of channels) {
      try {
        const items = await fetchTikTokFeed(u, console);
        for (const it of items.slice(0, 8)) {
          const id = extractId(it.link);
          if (id) bag.push({ id, channel_name: u, date: new Date(it.isoDate || it.pubDate || Date.now()) });
        }
      } catch (e) {
        console.warn(`[videos-public] ${u} failed`, e?.details || e?.message);
      }
    }

    bag.sort((a,b) => b.date - a.date);
    const seen = new Set();
    const videos = [];
    for (const it of bag) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      videos.push({ id: it.id, channel_name: it.channel_name, embed_link: `https://www.tiktok.com/player/v1/${it.id}` });
      if (videos.length >= limit) break;
    }

    if (videos.length === 0) {
      // 🔥 Fallback โหมดฝังโปรไฟล์ (ทางการ ไม่ต้อง API)
      return res.json({
        success: true,
        videos: [],
        fallback: { mode: 'creator_embed', channels }
      });
    }

    return res.json({ success: true, videos });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'fetch_failed' });
  }
});

// SSE: โพลทุก 60 วิ แล้ว push เฉพาะคลิปใหม่
const subscribers = new Set();
const seenGlobal = new Set();
async function pollOnce() {
  const channels = getChannels();
  for (const u of channels) {
    try {
      const items = await fetchTikTokFeed(u, console);
      for (const it of items.slice(0, 6)) {
        const id = extractId(it.link);
        if (!id) continue;
        const key = `${u}:${id}`;
        if (seenGlobal.has(key)) continue;
        seenGlobal.add(key);
        const payload = { type: 'video_new', channel_name: u, video: { id, embed_link: `https://www.tiktok.com/player/v1/${id}` } };
        for (const res of subscribers) {
          if (res.__channels && !res.__channels.has('all') && !res.__channels.has(u)) continue;
          res.write(`event: video_new\n`);
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      }
    } catch (e) {
      console.warn(`[SSE poll] ${u} failed`, e?.details || e?.message);
    }
  }
}
setInterval(pollOnce, 60_000);
pollOnce();

router.get('/stream-public', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  const param = String(req.query.channels || 'all');
  res.__channels = new Set(param.split(',').map(s => s.trim()));
  subscribers.add(res);
  // heartbeat
  const hb = setInterval(() => res.write(`event: hb\ndata: {}\n\n`), 25000);
  req.on('close', () => { clearInterval(hb); subscribers.delete(res); });
});

// Debug route for cache clearing and forced refresh
router.get('/debug/refresh', async (req, res) => {
  try {
    seenGlobal.clear();
    console.log('🔄 [DEBUG] Cleared global seen cache, forcing refresh...');
    await pollOnce();
    res.json({ success: true, message: 'Cache cleared and refresh triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// Enhanced RSS parser configuration
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['description', 'description'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

// Multiple RSS sources for reliability
const RSS_SOURCES = [
  {
    name: 'RSSHub Main',
    baseUrl: 'https://rsshub.app',
    path: '/tiktok/user/{username}'
  },
  {
    name: 'RSSHub Mirror 1',
    baseUrl: 'https://rss.shab.fun',
    path: '/tiktok/user/{username}'
  },
  {
    name: 'RSSHub Mirror 2',
    baseUrl: 'https://rsshub.ktachibana.party',
    path: '/tiktok/user/{username}'
  },
  {
    name: 'RSSHub Mirror 3',
    baseUrl: 'https://rsshub.pseudoyu.com',
    path: '/tiktok/user/{username}'
  },
  {
    name: 'RSSHub Mirror 4',
    baseUrl: 'https://rsshub.rssforever.com',
    path: '/tiktok/user/{username}'
  }
];

// Scraping sources as backup
const SCRAPING_SOURCES = [
  {
    name: 'TikTok Web',
    url: 'https://www.tiktok.com/@{username}',
    method: 'scrape'
  },
  {
    name: 'TikWM API',
    url: 'https://tikwm.com/api/user/info?unique_id={username}',
    method: 'api'
  }
];

// Target usernames
const TIKTOK_USERNAMES = ['peenongmuslim', 'nangfa.chudcao'];

// Cache system
let videoCache = new Map();
let lastSuccessfulFetch = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES = 3;

// SSE clients
const sseClients = new Set();

// Utility functions
function createVideoId(url) {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractTikTokData(htmlContent, username) {
  try {
    const $ = cheerio.load(htmlContent);
    const videos = [];

    // Try to find JSON data in script tags
    $('script').each((i, elem) => {
      const content = $(elem).html();
      if (content && content.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__')) {
        try {
          const match = content.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.+?});/);
          if (match) {
            const data = JSON.parse(match[1]);
            const userDetail = data?.default?.UserModule?.users?.[username];
            const videoList = data?.default?.ItemModule;

            if (videoList) {
              Object.values(videoList).forEach(video => {
                if (video.id && video.desc) {
                  videos.push({
                    id: video.id,
                    title: video.desc,
                    description: video.desc,
                    link: `https://www.tiktok.com/@${username}/video/${video.id}`,
                    thumbnail: video.video?.cover || video.video?.dynamicCover,
                    pubDate: new Date(video.createTime * 1000).toISOString(),
                    author: username,
                    duration: video.video?.duration,
                    viewCount: video.stats?.playCount
                  });
                }
              });
            }
          }
        } catch (e) {
          console.log(`Failed to parse TikTok data for ${username}:`, e.message);
        }
      }
    });

    return videos;
  } catch (error) {
    console.error(`Error extracting TikTok data for ${username}:`, error);
    return [];
  }
}

// Enhanced RSS fetching with multiple fallbacks
async function fetchFromRSS(username, retryCount = 0) {
  console.log(`🔄 Fetching RSS for ${username} (attempt ${retryCount + 1})`);

  for (const source of RSS_SOURCES) {
    try {
      const url = `${source.baseUrl}${source.path.replace('{username}', username)}`;
      console.log(`📡 Trying ${source.name}: ${url}`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml',
          'Accept-Language': 'en-US,en;q=0.9,th;q=0.8'
        }
      });

      if (response.data && (response.data.includes('<rss') || response.data.includes('<feed'))) {
        const feed = await parser.parseString(response.data);

        if (feed && feed.items && feed.items.length > 0) {
          console.log(`✅ ${source.name} returned ${feed.items.length} videos for ${username}`);

          const videos = feed.items.map(item => ({
            id: createVideoId(item.link),
            title: item.title || 'TikTok Video',
            description: item.description || item.contentSnippet || '',
            link: item.link,
            thumbnail: item.thumbnail?.url || item.media?.url || '',
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            author: username,
            source: source.name,
            embedUrl: item.link?.replace('tiktok.com', 'tiktok.com/embed')
          }));

          return videos;
        }
      }
    } catch (error) {
      console.log(`❌ ${source.name} failed for ${username}:`, error.message);
      continue;
    }
  }

  return null;
}

// Web scraping as backup
async function fetchFromScraping(username) {
  console.log(`🕷️ Attempting web scraping for ${username}`);

  for (const source of SCRAPING_SOURCES) {
    try {
      const url = source.url.replace('{username}', username);
      console.log(`🌐 Scraping ${source.name}: ${url}`);

      if (source.method === 'api') {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.data) {
          const userData = response.data.data;
          // Convert API response to our format
          const videos = [{
            id: `${username}_${Date.now()}`,
            title: `${username}'s Latest Content`,
            description: userData.signature || `Content from @${username}`,
            link: `https://www.tiktok.com/@${username}`,
            thumbnail: userData.avatar || '',
            pubDate: new Date().toISOString(),
            author: username,
            source: source.name,
            followerCount: userData.followerCount,
            followingCount: userData.followingCount,
            videoCount: userData.videoCount
          }];

          console.log(`✅ ${source.name} returned profile data for ${username}`);
          return videos;
        }
      } else {
        // Direct scraping
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (response.data) {
          const videos = extractTikTokData(response.data, username);
          if (videos.length > 0) {
            console.log(`✅ ${source.name} scraped ${videos.length} videos for ${username}`);
            return videos;
          }
        }
      }
    } catch (error) {
      console.log(`❌ ${source.name} scraping failed for ${username}:`, error.message);
      continue;
    }
  }

  return null;
}

// Generate enhanced demo data when all else fails
function generateEnhancedDemoData(username) {
  const demoVideos = [];
  const now = new Date();

  for (let i = 0; i < 5; i++) {
    const videoDate = new Date(now.getTime() - (i * 3600000)); // Each video 1 hour apart
    demoVideos.push({
      id: `demo_${username}_${Date.now()}_${i}`,
      title: `Latest from @${username} - Video ${i + 1}`,
      description: `นี่คือวิดีโอล่าสุดจาก @${username} - เนื้อหาน่าสนใจและมีประโยชน์`,
      link: `https://www.tiktok.com/@${username}/video/demo${Date.now()}${i}`,
      thumbnail: `https://via.placeholder.com/300x400/FF0050/FFFFFF?text=@${username}+Video+${i + 1}`,
      pubDate: videoDate.toISOString(),
      author: username,
      source: 'Demo Data (Real APIs Unavailable)',
      isDemo: true,
      viewCount: Math.floor(Math.random() * 100000) + 1000,
      likeCount: Math.floor(Math.random() * 10000) + 100
    });
  }

  return demoVideos;
}

// Main function to fetch user videos with all fallbacks
async function fetchUserVideos(username) {
  console.log(`\n🎯 Starting comprehensive fetch for ${username}`);

  // Check cache first
  const cached = videoCache.get(username);
  const lastFetch = lastSuccessfulFetch.get(username) || 0;

  if (cached && (Date.now() - lastFetch < CACHE_DURATION)) {
    console.log(`💾 Using cached data for ${username}`);
    return cached;
  }

  let videos = null;

  // Try RSS first (most reliable for video data)
  videos = await fetchFromRSS(username);

  // If RSS fails, try scraping
  if (!videos || videos.length === 0) {
    console.log(`📡 RSS failed for ${username}, trying scraping...`);
    videos = await fetchFromScraping(username);
  }

  // If everything fails, use enhanced demo data
  if (!videos || videos.length === 0) {
    console.log(`⚠️ All real data sources failed for ${username}, generating enhanced demo data`);
    videos = generateEnhancedDemoData(username);
  }

  // Cache the results
  if (videos && videos.length > 0) {
    videoCache.set(username, videos);
    lastSuccessfulFetch.set(username, Date.now());
    console.log(`✅ Successfully cached ${videos.length} videos for ${username}`);

    // Notify SSE clients
    notifySSEClients({
      type: 'videos_updated',
      username: username,
      count: videos.length,
      timestamp: new Date().toISOString(),
      hasRealData: !videos[0]?.isDemo
    });
  }

  return videos || [];
}

// SSE notification function
function notifySSEClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      sseClients.delete(client);
    }
  });
}

// Routes
router.get('/videos', async (req, res) => {
  try {
    console.log('\n🚀 Fetching all TikTok videos...');
    const allVideos = [];

    for (const username of TIKTOK_USERNAMES) {
      const userVideos = await fetchUserVideos(username);
      allVideos.push(...userVideos);
    }

    // Sort by date, newest first
    allVideos.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    console.log(`📊 Total videos returned: ${allVideos.length}`);

    res.json({
      success: true,
      videos: allVideos,
      totalCount: allVideos.length,
      usernames: TIKTOK_USERNAMES,
      lastUpdate: new Date().toISOString(),
      hasRealData: allVideos.some(v => !v.isDemo)
    });
  } catch (error) {
    console.error('❌ Error in /videos endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      videos: [],
      totalCount: 0
    });
  }
});

router.get('/videos/:username', async (req, res) => {
  try {
    const username = req.params.username;
    console.log(`\n🎯 Fetching videos for specific user: ${username}`);

    if (!TIKTOK_USERNAMES.includes(username)) {
      return res.status(404).json({
        success: false,
        error: `Username ${username} not in configured list`,
        availableUsernames: TIKTOK_USERNAMES
      });
    }

    const videos = await fetchUserVideos(username);

    res.json({
      success: true,
      username: username,
      videos: videos,
      count: videos.length,
      lastUpdate: new Date().toISOString(),
      hasRealData: !videos[0]?.isDemo
    });
  } catch (error) {
    console.error(`❌ Error fetching videos for ${req.params.username}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      videos: []
    });
  }
});

// SSE endpoint for real-time updates
router.get('/stream', (req, res) => {
  console.log('📡 New SSE client connected');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  sseClients.add(res);

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to TikTok real-time stream',
    timestamp: new Date().toISOString(),
    totalClients: sseClients.size
  })}\n\n`);

  req.on('close', () => {
    console.log('📡 SSE client disconnected');
    sseClients.delete(res);
  });
});

// Force refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    console.log('\n🔄 Force refreshing all TikTok data...');

    // Clear cache
    videoCache.clear();
    lastSuccessfulFetch.clear();

    const results = [];

    for (const username of TIKTOK_USERNAMES) {
      const videos = await fetchUserVideos(username);
      results.push({
        username: username,
        count: videos.length,
        hasRealData: !videos[0]?.isDemo
      });
    }

    res.json({
      success: true,
      message: 'All TikTok data refreshed successfully',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in refresh endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'TikTok Real Data Service',
    usernames: TIKTOK_USERNAMES,
    cacheStatus: {
      totalCached: videoCache.size,
      cachedUsernames: Array.from(videoCache.keys())
    },
    sseClients: sseClients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// SSE endpoint for real-time updates
router.get('/stream-public', (req, res) => {
  const { channels } = req.query;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: `Connected to TikTok stream for channels: ${channels || 'all'}`
  })}\n\n`);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    console.log('🔌 SSE client disconnected');
  });

  req.on('error', () => {
    clearInterval(heartbeat);
    console.log('❌ SSE connection error');
  });
});

// Auto-refresh every 2 minutes
setInterval(async () => {
  console.log('\n⏰ Auto-refreshing TikTok data...');
  try {
    for (const username of TIKTOK_USERNAMES) {
      await fetchUserVideos(username);
    }
  } catch (error) {
    console.error('❌ Auto-refresh error:', error);
  }
}, 2 * 60 * 1000);

// Debug route to force refresh cache
router.get('/debug/refresh', async (req, res) => {
  try {
    console.log('\n🔧 DEBUG: Force refreshing all TikTok data...');

    // Clear all caches
    videoCache.clear();
    lastSuccessfulFetch.clear();

    const results = {};

    for (const username of TIKTOK_USERNAMES) {
      console.log(`\n🔄 Force fetching for ${username}...`);
      const videos = await fetchUserVideos(username);
      results[username] = {
        videoCount: videos.length,
        hasRealData: videos.length > 0 && !videos[0]?.isDemo,
        firstVideoTitle: videos[0]?.title || 'No videos',
        source: videos[0]?.source || 'Unknown'
      };
    }

    res.json({
      success: true,
      message: 'Force refresh completed',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('🎬 TikTok Real Data Service initialized');
console.log(`👥 Monitoring usernames: ${TIKTOK_USERNAMES.join(', ')}`);

module.exports = router;
