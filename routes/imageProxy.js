const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Image proxy endpoint
router.get('/', async (req, res) => {
  try {
    const { url } = req.query;

    console.log('🔍 Image proxy request - Raw URL:', url);

    if (!url) {
      console.log('❌ No URL provided');
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ URL ของรูปภาพ'
      });
    }

    // Check for data URLs - should not be proxied
    if (url.startsWith('data:')) {
      console.log('🚫 Data URLs should not be proxied');
      return res.status(400).json({ success: false, message: 'Data URLs ไม่ต้องผ่าน proxy' });
    }

    // Decode URL if it's encoded
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
      console.log('🔍 Decoded URL:', decodedUrl);

      // Check if decoded URL is a data URL
      if (decodedUrl.startsWith('data:')) {
        console.log('🚫 Decoded data URL should not be proxied');
        return res.status(400).json({ success: false, message: 'Data URLs ไม่ต้องผ่าน proxy' });
      }

      // Check for video files
      if (decodedUrl.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
        console.log('🚫 Video files should not be proxied');
        return res.status(400).json({ success: false, message: 'ไฟล์วิดีโอไม่รองรับ' });
      }
    } catch (error) {
      decodedUrl = url;
      console.log('🔍 URL decode failed, using original:', url);
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(decodedUrl);
      console.log('🔍 Parsed URL - hostname:', targetUrl.hostname, 'pathname:', targetUrl.pathname);
    } catch (error) {
      console.log('❌ URL validation failed for:', decodedUrl, 'Error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'URL ไม่ถูกต้อง'
      });
    }

    // Only allow certain domains for security
    const allowedDomains = [
      'drive.google.com',
      'script.google.com', // For Apps Script endpoints
      'lh3.googleusercontent.com',
      'images.unsplash.com',
      'via.placeholder.com',
      'googleusercontent.com' // Allow any subdomain of googleusercontent.com
    ];

    // Check if domain is allowed (including subdomains)
    const isAllowed = allowedDomains.some(domain =>
      targetUrl.hostname === domain || targetUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      console.log('🚫 Domain not allowed:', targetUrl.hostname);
      return res.status(403).json({
        success: false,
        message: 'ไม่อนุญาตให้เข้าถึง domain นี้'
      });
    }

    console.log('✅ Domain allowed:', targetUrl.hostname);

    // Convert Google Drive URLs to direct download format
    let finalUrl = decodedUrl;

    // Extract file ID from various Google Drive URL formats
    function extractDriveId(url) {
      const patterns = [
        /[?&]id=([^&]+)/,           // ?id=FILE_ID
        /\/d\/([^/]+)\//,           // /d/FILE_ID/
        /\/file\/d\/([^/]+)\//      // /file/d/FILE_ID/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    }

    if (targetUrl.hostname === 'drive.google.com') {
      const fileId = extractDriveId(decodedUrl);
      if (fileId) {
        // Use the direct download format that works more reliably
        finalUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        console.log(`🔄 Converted Drive URL for file ID: ${fileId}`);
      }
    }

    console.log('🖼️ Proxying image:', finalUrl);

    // Use fetch with proper headers for better compatibility
    const fetchResponse = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
      }
    });

    if (!fetchResponse.ok) {
      console.log(`❌ Fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
      throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
    }

    const contentType = fetchResponse.headers.get('content-type') || '';
    console.log('📄 Content-Type:', contentType);

    // Check if response might be an image (be more lenient)
    if (contentType &&
        !contentType.startsWith('image/') &&
        !contentType.includes('octet-stream') &&
        !contentType.includes('binary') &&
        contentType !== 'text/html' && // Some proxies return HTML initially
        contentType !== 'application/json') {
      console.log('⚠️ Unexpected content-type:', contentType);
      // Still try to process it as it might be an image
    }

    // Set appropriate headers
    res.set({
      'Content-Type': contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // 24 hours cache
      'Access-Control-Allow-Origin': '*'
    });

    // Stream the response
    return fetchResponse.body.pipe(res);

  } catch (error) {
    console.error('❌ Image proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการโหลดรูปภาพ',
      error: error.message
    });
  }
});

module.exports = router;
