// _worker.js — Cloudflare Pages Worker
// Automatically runs for all requests on wordnworship.com
// Only intercepts ?song=N for OG tags — everything else passes through normally

const SONGS_JSON_URL = 'https://raw.githubusercontent.com/joshbabu/brethren-songs/main/songs.json';

// Simple in-memory cache
let _cache = null;
let _cacheTs = 0;

async function getSong(no) {
  const now = Date.now();
  if (!_cache || (now - _cacheTs) > 3600000) {
    try {
      const res = await fetch(SONGS_JSON_URL);
      if (res.ok) {
        const json = await res.json();
        const arr = json.songs || json;
        _cache = {};
        arr.forEach(s => { _cache[s.no] = s; });
        _cacheTs = now;
      }
    } catch(e) {}
  }
  return _cache ? _cache[no] : null;
}

// Bot user agents that need OG tags
const BOT_UA = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Googlebot|bingbot|DuckDuckBot|Discordbot|Applebot|vkShare|W3C_Validator/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const songParam = url.searchParams.get('song');
    const ua = request.headers.get('user-agent') || '';

    // Only intercept GET requests with ?song=N
    // AND only for bots OR direct browser requests (for View Source testing)
    if (request.method === 'GET' && songParam && url.pathname === '/') {
      const songNo = parseInt(songParam);

      if (!isNaN(songNo) && songNo > 0) {
        try {
          const song = await getSong(songNo);
          const siteUrl = 'https://wordnworship.com';
          const songUrl = `${siteUrl}/?song=${songNo}`;
          const imageUrl = `${siteUrl}/preview.png`;

          let ogTitle, ogDesc, titleTe;

          if (song) {
            ogTitle = `${song.te} — Song #${songNo} | Word & Worship`;
            titleTe = song.te;
            const enPart = song.en ? ` (${song.en})` : '';
            ogDesc = `Telugu Brethren Song #${songNo}${enPart} · Bilingual lyrics on Word & Worship — wordnworship.com`;
          } else {
            ogTitle = `Telugu Song #${songNo} | Word & Worship`;
            titleTe = `పాట #${songNo}`;
            ogDesc = `Telugu Brethren Song #${songNo} · Read bilingual lyrics on Word & Worship — wordnworship.com`;
          }

          const html = `<!DOCTYPE html>
<html lang="te">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ogTitle}</title>
<meta name="description" content="${ogDesc}">
<meta property="og:type" content="website">
<meta property="og:url" content="${songUrl}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Word &amp; Worship — Telugu Christian Songbook">
<meta property="og:site_name" content="Word &amp; Worship">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
<meta name="twitter:image" content="${imageUrl}">
<script>
  // Redirect real browsers to the app immediately
  // Bots don't run JS so they read the OG tags above
  window.location.replace('/?song=${songNo}#loaded');
</script>
</head>
<body style="margin:0;background:#06061a;color:#e0e7ff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:2rem">
    <div style="font-size:13px;color:#6366f1;margin-bottom:8px">wordnworship.com</div>
    <div style="font-size:22px;font-weight:800;margin-bottom:6px">${titleTe}</div>
    <div style="font-size:13px;color:#818cf8;margin-bottom:20px">Song #${songNo}</div>
    <a href="/?song=${songNo}" style="background:#4338ca;color:#fff;padding:12px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px">Open Song →</a>
  </div>
</body>
</html>`;

          return new Response(html, {
            headers: {
              'Content-Type': 'text/html;charset=UTF-8',
              'Cache-Control': 'public, max-age=3600',
            }
          });

        } catch(e) {
          // On any error, fall through to normal Pages serving
          console.error('OG error:', e.message);
        }
      }
    }

    // Everything else — pass through to Cloudflare Pages normally
    return env.ASSETS.fetch(request);
  }
};
