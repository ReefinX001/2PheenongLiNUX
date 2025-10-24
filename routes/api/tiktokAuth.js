const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// TikTok OAuth Configuration
const TIKTOK_CONFIG = {
    CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY,
    CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
    REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI,
    SCOPES: 'user.info.basic,video.list' // เพิ่ม scope ตามต้องการ
};

// ตรวจสอบว่ามี environment variables ครบหรือไม่
if (!TIKTOK_CONFIG.CLIENT_KEY || !TIKTOK_CONFIG.CLIENT_SECRET || !TIKTOK_CONFIG.REDIRECT_URI) {
    console.error('❌ Missing TikTok environment variables:');
    console.error('CLIENT_KEY:', TIKTOK_CONFIG.CLIENT_KEY ? '✓' : '✗ Missing');
    console.error('CLIENT_SECRET:', TIKTOK_CONFIG.CLIENT_SECRET ? '✓' : '✗ Missing');
    console.error('REDIRECT_URI:', TIKTOK_CONFIG.REDIRECT_URI ? '✓' : '✗ Missing');
    console.error('\n📋 Please add these to your .env file:');
    console.error('TIKTOK_CLIENT_KEY=awx5wjc87wlxz3ne');
    console.error('TIKTOK_CLIENT_SECRET=j2wHlx7bnAtauQDVoAKSQ9JKDpzBVuu6');
    console.error('TIKTOK_REDIRECT_URI=https://www.2pheenong.com/callback');
    console.error('\nThen restart the server!');

    // ไม่ throw error เพื่อให้ server ยังทำงานต่อได้
    console.warn('⚠️ TikTok OAuth will not work until environment variables are set!');
}

// Temporary storage for demo (ในการใช้งานจริงควรใช้ session หรือ database)
const tokenStorage = new Map();

// Persistent token storage for multiple channels
const CHANNELS_FILE = path.join(process.cwd(), 'data', 'tiktok_channels.json');
const TOKEN_FILE = path.join(process.cwd(), 'data', 'tiktok_company_tokens.json'); // backward compatibility

async function loadChannels() {
    try {
        const data = await fs.readFile(CHANNELS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Try loading old single company token for backward compatibility
        const oldTokens = await loadCompanyTokens();
        if (oldTokens) {
            return {
                default: oldTokens
            };
        }
        return {};
    }
}

async function saveChannels(channels) {
    try {
        await fs.mkdir(path.dirname(CHANNELS_FILE), { recursive: true });
        await fs.writeFile(CHANNELS_FILE, JSON.stringify(channels, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving channels:', error);
    }
}

async function loadCompanyTokens() {
    try {
        const data = await fs.readFile(TOKEN_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function saveCompanyTokens(tokens) {
    try {
        // สร้างโฟลเดอร์ data ถ้ายังไม่มี
        await fs.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
        await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving company tokens:', error);
    }
}

/**
 * Health check - ตรวจสอบการตั้งค่า
 */
router.get('/health', (req, res) => {
    const status = {
        configured: !!(TIKTOK_CONFIG.CLIENT_KEY && TIKTOK_CONFIG.CLIENT_SECRET && TIKTOK_CONFIG.REDIRECT_URI),
        client_key: TIKTOK_CONFIG.CLIENT_KEY ? '✅ SET' : '❌ MISSING',
        client_secret: TIKTOK_CONFIG.CLIENT_SECRET ? '✅ SET' : '❌ MISSING',
        redirect_uri: TIKTOK_CONFIG.REDIRECT_URI || '❌ MISSING',
        message: ''
    };

    if (!status.configured) {
        status.message = '⚠️ TikTok OAuth ยังไม่พร้อมใช้งาน - กรุณาตั้งค่า environment variables และ restart server';
    } else {
        status.message = '✅ TikTok OAuth พร้อมใช้งาน';
    }

    res.json(status);
});

/**
 * Debug route - แสดง URL ที่จะส่งไป TikTok เพื่อตรวจสอบ
 */
router.get('/login-debug', (req, res) => {
    // Debug แบบละเอียดมาก
    console.log('=== TikTok Debug Check ===');
    console.log('1. Raw process.env values:');
    console.log('   TIKTOK_CLIENT_KEY:', process.env.TIKTOK_CLIENT_KEY);
    console.log('   TIKTOK_CLIENT_SECRET:', process.env.TIKTOK_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('   TIKTOK_REDIRECT_URI:', process.env.TIKTOK_REDIRECT_URI);

    console.log('2. TIKTOK_CONFIG object:');
    console.log('   CLIENT_KEY:', TIKTOK_CONFIG.CLIENT_KEY);
    console.log('   CLIENT_SECRET:', TIKTOK_CONFIG.CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('   REDIRECT_URI:', TIKTOK_CONFIG.REDIRECT_URI);

    const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
    u.searchParams.set('client_key', TIKTOK_CONFIG.CLIENT_KEY || 'NOT_SET');
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', TIKTOK_CONFIG.SCOPES);
    u.searchParams.set('redirect_uri', TIKTOK_CONFIG.REDIRECT_URI || 'NOT_SET');
    u.searchParams.set('state', 'debug');

    // แสดงค่าที่กำลังใช้
    const debugInfo = {
        status: 'DEBUG MODE',
        env_check: {
            NODE_ENV: process.env.NODE_ENV,
            has_dotenv: !!process.env.TIKTOK_CLIENT_KEY,
            client_key_length: process.env.TIKTOK_CLIENT_KEY ? process.env.TIKTOK_CLIENT_KEY.length : 0
        },
        tiktok_config: {
            CLIENT_KEY: TIKTOK_CONFIG.CLIENT_KEY ? `${TIKTOK_CONFIG.CLIENT_KEY.slice(0, 4)}...${TIKTOK_CONFIG.CLIENT_KEY.slice(-4)}` : 'NOT SET',
            CLIENT_SECRET: TIKTOK_CONFIG.CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
            REDIRECT_URI: TIKTOK_CONFIG.REDIRECT_URI || 'NOT SET',
            SCOPES: TIKTOK_CONFIG.SCOPES
        },
        generated_url: u.toString(),
        url_params: Object.fromEntries(u.searchParams),
        important_note: 'ถ้า CLIENT_KEY เป็น NOT_SET แสดงว่า environment variables ไม่โหลด - ต้อง restart server!'
    };

    res.type('json').send(JSON.stringify(debugInfo, null, 2));
});

/**
 * เริ่มต้น OAuth flow - redirect ไปหน้า TikTok authorize
 */
router.get('/login', (req, res) => {
    try {
        // สร้าง state สำหรับป้องกัน CSRF
        const state = crypto.randomBytes(16).toString('hex');

        // เก็บ state ใน cookie (httpOnly เพื่อความปลอดภัย)
        res.cookie('tiktok_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // ใช้ secure cookie ใน production
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000 // 10 นาที
        });

        // สร้าง TikTok authorization URL
        const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
        authUrl.searchParams.set('client_key', TIKTOK_CONFIG.CLIENT_KEY);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', TIKTOK_CONFIG.SCOPES);
        authUrl.searchParams.set('redirect_uri', TIKTOK_CONFIG.REDIRECT_URI);
        authUrl.searchParams.set('state', state);

        console.log('🎯 Redirecting to TikTok:', authUrl.toString());
        res.redirect(authUrl.toString());
    } catch (error) {
        console.error('❌ TikTok login error:', error);
        res.status(500).json({ error: 'Failed to initialize TikTok login' });
    }
});

/**
 * Exchange authorization code for access token
 */
router.post('/token', async (req, res) => {
    const { code, state } = req.body;

    try {
        // ตรวจสอบ state เพื่อป้องกัน CSRF
        const savedState = req.cookies.tiktok_oauth_state;
        if (!savedState || state !== savedState) {
            return res.status(400).json({ error: 'Invalid state parameter' });
        }

        // ลบ state cookie หลังใช้งาน
        res.clearCookie('tiktok_oauth_state');

        // แลก code เป็น access token
        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CONFIG.CLIENT_KEY,
                client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: TIKTOK_CONFIG.REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('❌ Token exchange failed:', tokenData);
            return res.status(400).json({ error: 'Failed to exchange token', details: tokenData });
        }

        console.log('✅ Token received:', {
            access_token: tokenData.access_token ? '***' : 'none',
            expires_in: tokenData.expires_in,
            refresh_expires_in: tokenData.refresh_expires_in,
            open_id: tokenData.open_id,
            scope: tokenData.scope
        });

        // เก็บ token (ในการใช้งานจริงควรเก็บใน database)
        const sessionId = crypto.randomBytes(16).toString('hex');
        tokenStorage.set(sessionId, {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            open_id: tokenData.open_id,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            refresh_expires_at: Date.now() + (tokenData.refresh_expires_in * 1000)
        });

        // ส่ง session ID กลับไปให้ client
        res.json({
            success: true,
            sessionId: sessionId,
            open_id: tokenData.open_id,
            scope: tokenData.scope
        });

    } catch (error) {
        console.error('❌ Token exchange error:', error);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

/**
 * ดึงข้อมูลผู้ใช้จาก TikTok
 */
router.get('/user/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = tokenStorage.get(sessionId);

    if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    // ตรวจสอบว่า token หมดอายุหรือไม่
    if (Date.now() > session.expires_at) {
        // TODO: ใช้ refresh token เพื่อขอ access token ใหม่
        return res.status(401).json({ error: 'Token expired' });
    }

    try {
        // เรียก TikTok API เพื่อดึงข้อมูลผู้ใช้
        const userUrl = new URL('https://open.tiktokapis.com/v2/user/info/');
        userUrl.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');

        const userResponse = await fetch(userUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
            console.error('❌ Failed to fetch user info:', userData);
            return res.status(400).json({ error: 'Failed to fetch user info', details: userData });
        }

        console.log('✅ User info retrieved:', userData);
        res.json(userData);

    } catch (error) {
        console.error('❌ User info error:', error);
        res.status(500).json({ error: 'Failed to fetch user info' });
    }
});

/**
 * Refresh access token
 */
router.post('/refresh/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = tokenStorage.get(sessionId);

    if (!session || !session.refresh_token) {
        return res.status(401).json({ error: 'Invalid session or no refresh token' });
    }

    try {
        const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CONFIG.CLIENT_KEY,
                client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: session.refresh_token
            })
        });

        const newTokenData = await refreshResponse.json();

        if (!refreshResponse.ok) {
            console.error('❌ Token refresh failed:', newTokenData);
            return res.status(400).json({ error: 'Failed to refresh token', details: newTokenData });
        }

        // อัพเดท session ด้วย token ใหม่
        session.access_token = newTokenData.access_token;
        session.refresh_token = newTokenData.refresh_token;
        session.expires_at = Date.now() + (newTokenData.expires_in * 1000);
        session.refresh_expires_at = Date.now() + (newTokenData.refresh_expires_in * 1000);

        console.log('✅ Token refreshed successfully');
        res.json({ success: true, expires_in: newTokenData.expires_in });

    } catch (error) {
        console.error('❌ Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

/**
 * Logout - ลบ session
 */
router.post('/logout/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    if (tokenStorage.has(sessionId)) {
        tokenStorage.delete(sessionId);
        console.log('✅ Session removed:', sessionId);
    }

    res.json({ success: true });
});

/**
 * Company Account Login - เฉพาะ admin เพื่อเชื่อมต่อช่องบริษัท
 */
router.get('/company/login', (req, res) => {
    // Debug: ตรวจสอบว่า environment variables โหลดหรือยัง
    console.log('\n=== 🔍 TikTok Company Login Request ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('CLIENT_KEY:', TIKTOK_CONFIG.CLIENT_KEY ? `${TIKTOK_CONFIG.CLIENT_KEY.slice(0, 4)}...${TIKTOK_CONFIG.CLIENT_KEY.slice(-4)}` : 'NOT SET');
    console.log('CLIENT_KEY Full:', TIKTOK_CONFIG.CLIENT_KEY); // แสดงเต็มเพื่อ debug
    console.log('CLIENT_SECRET:', TIKTOK_CONFIG.CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('REDIRECT_URI:', TIKTOK_CONFIG.REDIRECT_URI);
    console.log('Environment:', process.env.NODE_ENV || 'development');

    // ตรวจสอบว่ามีค่า client_key หรือไม่
    if (!TIKTOK_CONFIG.CLIENT_KEY) {
        console.error('❌ CLIENT_KEY is missing!');
        return res.status(500).json({
            error: 'TikTok client_key not configured',
            message: 'กรุณาตั้งค่า TIKTOK_CLIENT_KEY ใน environment variables และ restart server'
        });
    }

    // ควรเพิ่มการตรวจสอบสิทธิ์ admin ที่นี่
    // ใช้ state ที่มี prefix 'company_' เพื่อแยกประเภท
    const state = 'company_' + crypto.randomBytes(16).toString('hex');

    res.cookie('tiktok_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000
    });

    // ถ้าต้องการใช้ redirect URI แยกสำหรับ company
    const COMPANY_REDIRECT_URI = process.env.TIKTOK_COMPANY_REDIRECT_URI || TIKTOK_CONFIG.REDIRECT_URI;

    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', TIKTOK_CONFIG.CLIENT_KEY);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', TIKTOK_CONFIG.SCOPES);
    authUrl.searchParams.set('redirect_uri', COMPANY_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    console.log('🎯 Company login redirect:', authUrl.toString());
    console.log('📌 Client Key being sent:', authUrl.searchParams.get('client_key'));
    console.log('📌 Client Key type:', TIKTOK_CONFIG.CLIENT_KEY.startsWith('sb') ? 'SANDBOX' : 'PRODUCTION');
    console.log('📌 Redirect URI:', authUrl.searchParams.get('redirect_uri'));
    res.redirect(authUrl.toString());
});

/**
 * Refresh company token if needed
 */
async function refreshCompanyTokenIfNeeded() {
    const tokens = await loadCompanyTokens();
    if (!tokens || !tokens.refresh_token) return null;

    const now = Date.now();
    // ถ้ายังไม่หมดอายุ (เหลือมากกว่า 60 วินาที)
    if (tokens.expires_at && now < tokens.expires_at - 60000) {
        return tokens;
    }

    try {
        const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CONFIG.CLIENT_KEY,
                client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token
            })
        });

        const newTokenData = await refreshResponse.json();

        if (!refreshResponse.ok) {
            console.error('❌ Company token refresh failed:', newTokenData);
            return null;
        }

        // อัพเดท tokens
        tokens.access_token = newTokenData.access_token;
        if (newTokenData.refresh_token) {
            tokens.refresh_token = newTokenData.refresh_token;
        }
        tokens.expires_at = Date.now() + (newTokenData.expires_in * 1000);
        tokens.refresh_expires_at = Date.now() + (newTokenData.refresh_expires_in * 1000);

        await saveCompanyTokens(tokens);
        console.log('✅ Company token refreshed');

        return tokens;
    } catch (error) {
        console.error('❌ Company token refresh error:', error);
        return null;
    }
}

/**
 * Get company profile
 */
router.get('/company/profile', async (req, res) => {
    const tokens = await refreshCompanyTokenIfNeeded();

    if (!tokens) {
        return res.status(428).json({
            error: 'Company TikTok not linked yet',
            message: 'กรุณาให้ admin เชื่อมต่อบัญชี TikTok ของบริษัทก่อน'
        });
    }

    try {
        const url = new URL('https://open.tiktokapis.com/v2/user/info/');
        url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Failed to fetch company profile:', data);
            return res.status(400).json(data);
        }

        console.log('✅ Company profile retrieved');
        res.json(data);

    } catch (error) {
        console.error('❌ Company profile error:', error);
        res.status(500).json({ error: 'Failed to fetch company profile' });
    }
});

/**
 * Get company videos
 */
router.get('/company/videos', async (req, res) => {
    const tokens = await refreshCompanyTokenIfNeeded();

    if (!tokens) {
        return res.status(428).json({
            error: 'Company TikTok not linked yet',
            message: 'กรุณาให้ admin เชื่อมต่อบัญชี TikTok ของบริษัทก่อน'
        });
    }

    try {
        const response = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,embed_link,cover_image_url,create_time,duration,share_url,view_count,like_count,comment_count,share_count', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max_count: req.query.limit || 12 // default 12 videos
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Failed to fetch company videos:', data);
            return res.status(400).json(data);
        }

        // Format videos data
        const videos = (data?.data?.videos || []).map(v => ({
            id: v.id,
            title: v.title || 'วิดีโอจาก TikTok',
            embed_link: v.embed_link,
            cover_image_url: v.cover_image_url,
            create_time: v.create_time,
            duration: v.duration,
            share_url: v.share_url,
            view_count: v.view_count || 0,
            like_count: v.like_count || 0,
            comment_count: v.comment_count || 0,
            share_count: v.share_count || 0
        }));

        console.log(`✅ Retrieved ${videos.length} company videos`);
        res.json({
            success: true,
            count: videos.length,
            videos: videos
        });

    } catch (error) {
        console.error('❌ Company videos error:', error);
        res.status(500).json({ error: 'Failed to fetch company videos' });
    }
});

/**
 * Get all connected channels
 */
router.get('/channels', async (req, res) => {
    try {
        const channels = await loadChannels();
        const channelList = [];

        for (const [username, tokens] of Object.entries(channels)) {
            if (tokens && tokens.access_token) {
                // Get profile info for each channel
                const profileData = await getChannelProfile(tokens);
                if (profileData) {
                    channelList.push({
                        username: profileData.display_name || username,
                        avatar_url: profileData.avatar_url,
                        open_id: profileData.open_id || tokens.open_id
                    });
                }
            }
        }

        res.json({
            success: true,
            channels: channelList
        });
    } catch (error) {
        console.error('Error loading channels:', error);
        res.status(500).json({ error: 'Failed to load channels' });
    }
});

/**
 * Get videos from specific channel or all channels
 */
router.get('/videos', async (req, res) => {
    const { channel, limit = 8 } = req.query;

    try {
        const channels = await loadChannels();
        let targetTokens = null;

        if (channel) {
            // Find specific channel
            for (const [username, tokens] of Object.entries(channels)) {
                const profile = await getChannelProfile(tokens);
                if (profile && (profile.display_name === channel || username === channel)) {
                    targetTokens = tokens;
                    break;
                }
            }
        } else {
            // Use first available channel
            const firstChannel = Object.values(channels)[0];
            targetTokens = firstChannel;
        }

        if (!targetTokens) {
            return res.status(404).json({ error: 'Channel not found' });
        }

        // Refresh token if needed
        const refreshedTokens = await refreshTokenIfNeeded(targetTokens);
        if (!refreshedTokens) {
            return res.status(401).json({ error: 'Failed to refresh token' });
        }

        // Get videos
        const response = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,embed_link,cover_image_url,create_time,duration,share_url,view_count,like_count,comment_count,share_count', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshedTokens.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max_count: parseInt(limit)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to fetch videos:', data);
            return res.status(400).json(data);
        }

        // Format videos data
        const videos = (data?.data?.videos || []).map(v => ({
            id: v.id,
            title: v.title || 'วิดีโอจาก TikTok',
            embed_link: v.embed_link,
            cover_image_url: v.cover_image_url,
            create_time: v.create_time,
            duration: v.duration,
            share_url: v.share_url,
            view_count: v.view_count || 0,
            like_count: v.like_count || 0,
            comment_count: v.comment_count || 0,
            share_count: v.share_count || 0
        }));

        res.json({
            success: true,
            count: videos.length,
            videos: videos
        });

    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// Helper function to get channel profile
async function getChannelProfile(tokens) {
    if (!tokens || !tokens.access_token) return null;

    try {
        const url = new URL('https://open.tiktokapis.com/v2/user/info/');
        url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name');

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data?.data?.user;
        }
    } catch (error) {
        console.error('Error getting channel profile:', error);
    }
    return null;
}

// Helper function to refresh token if needed
async function refreshTokenIfNeeded(tokens) {
    if (!tokens || !tokens.refresh_token) return null;

    const now = Date.now();
    // ถ้ายังไม่หมดอายุ (เหลือมากกว่า 60 วินาที)
    if (tokens.expires_at && now < tokens.expires_at - 60000) {
        return tokens;
    }

    try {
        const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CONFIG.CLIENT_KEY,
                client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: tokens.refresh_token
            })
        });

        const newTokenData = await refreshResponse.json();

        if (!refreshResponse.ok) {
            console.error('Token refresh failed:', newTokenData);
            return null;
        }

        // Update tokens
        tokens.access_token = newTokenData.access_token;
        if (newTokenData.refresh_token) {
            tokens.refresh_token = newTokenData.refresh_token;
        }
        tokens.expires_at = Date.now() + (newTokenData.expires_in * 1000);
        tokens.refresh_expires_at = Date.now() + (newTokenData.refresh_expires_in * 1000);

        return tokens;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

/**
 * Handle company callback specially
 */
router.get('/company/callback', async (req, res) => {
    const { code, state } = req.query;
    const savedState = req.cookies.tiktok_state;

    if (!code || !savedState || state !== savedState) {
        console.error('❌ Invalid callback:', {
            hasCode: !!code,
            state,
            savedState,
            cookieExists: !!savedState
        });
        return res.status(400).send('Invalid state or code');
    }

    res.clearCookie('tiktok_state');

    try {
        const COMPANY_REDIRECT_URI = process.env.TIKTOK_COMPANY_REDIRECT_URI || TIKTOK_CONFIG.REDIRECT_URI;

        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            },
            body: new URLSearchParams({
                client_key: TIKTOK_CONFIG.CLIENT_KEY,
                client_secret: TIKTOK_CONFIG.CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: COMPANY_REDIRECT_URI
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('❌ Company token exchange failed:', tokenData);
            return res.status(400).send('Failed to exchange token');
        }

        // บันทึก company tokens
        const companyTokens = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            open_id: tokenData.open_id,
            expires_at: Date.now() + (tokenData.expires_in * 1000),
            refresh_expires_at: Date.now() + (tokenData.refresh_expires_in * 1000),
            linked_at: new Date().toISOString()
        };

        // Get user profile to get username
        const userProfile = await getChannelProfile(companyTokens);
        const username = userProfile?.display_name || userProfile?.open_id || 'default';

        // Save to multi-channel storage
        const channels = await loadChannels();
        channels[username] = companyTokens;
        await saveChannels(channels);

        // Also save to old format for backward compatibility
        await saveCompanyTokens(companyTokens);
        console.log(`✅ Company TikTok account linked successfully: ${username}`);

        // แสดงหน้า success
        res.send(`
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>เชื่อมต่อสำเร็จ | 2 พี่น้อง โมบาย</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; }
                    .success { background: #d1fae5; color: #065f46; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 500px; }
                    a { color: #3b82f6; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="success">
                    <h2>✅ เชื่อมต่อบัญชี TikTok ของบริษัทเรียบร้อยแล้ว</h2>
                    <p>ตอนนี้วิดีโอจากช่อง TikTok จะแสดงบนหน้าแรกของเว็บไซต์โดยอัตโนมัติ</p>
                    <p style="margin-top: 20px;">
                        <a href="/">กลับไปหน้าแรก</a>
                    </p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('❌ Company callback error:', error);
        res.status(500).send('Internal server error');
    }
});

/**
 * Delete/disconnect a channel
 */
router.delete('/channels/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const channels = await loadChannels();
        let deleted = false;

        // Find and delete channel by username
        for (const [key, tokens] of Object.entries(channels)) {
            const profile = await getChannelProfile(tokens);
            if (profile && (profile.display_name === username || key === username)) {
                delete channels[key];
                deleted = true;
                break;
            }
        }

        if (deleted) {
            await saveChannels(channels);
            console.log(`✅ Channel ${username} disconnected successfully`);
            res.json({ success: true, message: 'Channel disconnected' });
        } else {
            res.status(404).json({ error: 'Channel not found' });
        }
    } catch (error) {
        console.error('Error disconnecting channel:', error);
        res.status(500).json({ error: 'Failed to disconnect channel' });
    }
});

module.exports = router;
