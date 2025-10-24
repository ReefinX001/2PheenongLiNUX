const mongoose = require('mongoose');
const SeoKeyword = require('../models/SEO/SeoKeyword');
const SeoBacklink = require('../models/SEO/SeoBacklink');
const SeoAnalytics = require('../models/SEO/SeoAnalytics');
const SeoAudit = require('../models/SEO/SeoAudit');

const sampleKeywords = [
  {
    keyword: 'ระบบบัญชี',
    targetUrl: 'https://example.com/accounting',
    currentRank: 3,
    previousRank: 5,
    searchVolume: 8500,
    difficulty: 65,
    createdBy: 'seeder'
  },
  {
    keyword: 'โปรแกรมบัญชี',
    targetUrl: 'https://example.com/accounting-software',
    currentRank: 7,
    previousRank: 6,
    searchVolume: 12300,
    difficulty: 72,
    createdBy: 'seeder'
  },
  {
    keyword: 'บัญชี sme',
    targetUrl: 'https://example.com/sme-accounting',
    currentRank: 2,
    previousRank: 4,
    searchVolume: 3400,
    difficulty: 58,
    createdBy: 'seeder'
  },
  {
    keyword: 'ระบบขายหน้าร้าน',
    targetUrl: 'https://example.com/pos-system',
    currentRank: 5,
    previousRank: 5,
    searchVolume: 5600,
    difficulty: 68,
    createdBy: 'seeder'
  },
  {
    keyword: 'โปรแกรม pos',
    targetUrl: 'https://example.com/pos',
    currentRank: 12,
    previousRank: 8,
    searchVolume: 9200,
    difficulty: 75,
    createdBy: 'seeder'
  },
  {
    keyword: 'ระบบจัดการสต็อก',
    targetUrl: 'https://example.com/inventory',
    currentRank: 4,
    previousRank: 6,
    searchVolume: 4300,
    difficulty: 62,
    createdBy: 'seeder'
  },
  {
    keyword: 'บัญชีออนไลน์',
    targetUrl: 'https://example.com/online-accounting',
    currentRank: 8,
    previousRank: 9,
    searchVolume: 6700,
    difficulty: 69,
    createdBy: 'seeder'
  },
  {
    keyword: 'ระบบผ่อนชำระ',
    targetUrl: 'https://example.com/installment',
    currentRank: 6,
    previousRank: 11,
    searchVolume: 2800,
    difficulty: 55,
    createdBy: 'seeder'
  }
];

const sampleBacklinks = [
  {
    sourceUrl: 'https://techblog.co.th/accounting-software-review',
    targetUrl: 'https://example.com/accounting',
    anchorText: 'ระบบบัญชีที่ดีที่สุด',
    domainAuthority: 68,
    pageAuthority: 45,
    linkType: 'dofollow',
    status: 'active',
    sourceDomain: 'techblog.co.th',
    targetDomain: 'example.com',
    createdBy: 'seeder'
  },
  {
    sourceUrl: 'https://business.kapook.com/pos-systems-comparison',
    targetUrl: 'https://example.com/pos',
    anchorText: 'ระบบ POS สำหรับ SME',
    domainAuthority: 72,
    pageAuthority: 38,
    linkType: 'dofollow',
    status: 'active',
    sourceDomain: 'business.kapook.com',
    targetDomain: 'example.com',
    createdBy: 'seeder'
  },
  {
    sourceUrl: 'https://startupth.com/business-tools',
    targetUrl: 'https://example.com',
    anchorText: 'เครื่องมือธุรกิจ',
    domainAuthority: 45,
    pageAuthority: 32,
    linkType: 'dofollow',
    status: 'active',
    sourceDomain: 'startupth.com',
    targetDomain: 'example.com',
    createdBy: 'seeder'
  },
  {
    sourceUrl: 'https://forum.smethailand.org/accounting-discussion',
    targetUrl: 'https://example.com/accounting-software',
    anchorText: 'โปรแกรมบัญชี',
    domainAuthority: 38,
    pageAuthority: 28,
    linkType: 'nofollow',
    status: 'active',
    sourceDomain: 'forum.smethailand.org',
    targetDomain: 'example.com',
    createdBy: 'seeder'
  }
];

const sampleAnalytics = [];
const now = new Date();

// Create 30 days of sample analytics data
for (let i = 29; i >= 0; i--) {
  const date = new Date(now);
  date.setDate(date.getDate() - i);

  const baseTraffic = 1200;
  const variation = Math.sin((i / 30) * Math.PI * 2) * 200 + Math.random() * 100;
  const sessions = Math.max(800, Math.round(baseTraffic + variation));

  sampleAnalytics.push({
    domain: 'example.com',
    url: 'https://example.com',
    date: date,
    metrics: {
      organicTraffic: {
        sessions: sessions,
        users: Math.round(sessions * 0.75),
        pageviews: Math.round(sessions * 2.1),
        bounceRate: Math.round(35 + Math.random() * 20),
        avgSessionDuration: Math.round(120 + Math.random() * 60)
      },
      searchVisibility: {
        totalKeywords: 85 + Math.round(Math.random() * 10),
        top3Keywords: 12 + Math.round(Math.random() * 5),
        top10Keywords: 28 + Math.round(Math.random() * 8),
        top50Keywords: 58 + Math.round(Math.random() * 12),
        averagePosition: 24.6 + (Math.random() - 0.5) * 3,
        visibilityScore: 68 + Math.round(Math.random() * 15)
      },
      backlinks: {
        totalBacklinks: 1247 + Math.round(Math.random() * 50),
        referringDomains: 274 + Math.round(Math.random() * 10),
        newBacklinks: Math.round(Math.random() * 5),
        lostBacklinks: Math.round(Math.random() * 3),
        avgDomainAuthority: 55 + Math.round(Math.random() * 15)
      },
      technical: {
        pagespeedScore: 68 + Math.round(Math.random() * 15),
        coreWebVitals: {
          lcp: 2.1 + Math.random() * 0.8,
          fid: 85 + Math.random() * 30,
          cls: 0.1 + Math.random() * 0.05
        },
        mobileUsability: 88 + Math.round(Math.random() * 10),
        indexedPages: 145 + Math.round(Math.random() * 20),
        crawlErrors: Math.round(Math.random() * 5)
      }
    },
    createdBy: 'seeder'
  });
}

async function seedSEOData() {
  try {
    console.log('🌱 Starting SEO data seeding...');

    // Clear existing data
    await SeoKeyword.deleteMany({});
    await SeoBacklink.deleteMany({});
    await SeoAnalytics.deleteMany({});
    await SeoAudit.deleteMany({});
    console.log('✅ Cleared existing SEO data');

    // Seed keywords
    console.log('📝 Seeding keywords...');
    for (const keywordData of sampleKeywords) {
      const keyword = new SeoKeyword(keywordData);

      // Add some rank history
      const historyLength = 5 + Math.round(Math.random() * 10);
      for (let i = 0; i < historyLength; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - (historyLength - i) * 7);
        keyword.rankHistory.push({
          rank: keywordData.currentRank + Math.round((Math.random() - 0.5) * 6),
          date: pastDate
        });
      }

      await keyword.save();
    }
    console.log(`✅ Created ${sampleKeywords.length} keywords`);

    // Seed backlinks
    console.log('🔗 Seeding backlinks...');
    for (const backlinkData of sampleBacklinks) {
      const backlink = new SeoBacklink(backlinkData);
      await backlink.save();
    }
    console.log(`✅ Created ${sampleBacklinks.length} backlinks`);

    // Seed analytics
    console.log('📊 Seeding analytics...');
    for (const analyticsData of sampleAnalytics) {
      const analytics = new SeoAnalytics(analyticsData);
      await analytics.save();
    }
    console.log(`✅ Created ${sampleAnalytics.length} analytics records`);

    // Create a sample audit
    console.log('🔍 Creating sample audit...');
    const sampleAudit = new SeoAudit({
      url: 'https://example.com',
      domain: 'example.com',
      auditType: 'full',
      status: 'completed',
      overallScore: 75,
      scores: {
        technical: 82,
        content: 71,
        performance: 68,
        mobile: 89,
        security: 95
      },
      issues: [
        {
          category: 'warning',
          type: 'meta-description',
          title: 'Meta Descriptions ขาดหายไป',
          description: 'พบ 18 หน้าที่ไม่มี meta descriptions ซึ่งเป็นส่วนสำคัญที่จะช่วยปรับปรุงอัตราการคลิกในผลการค้นหา',
          impact: 'medium',
          affectedUrls: ['/products', '/services', '/about'],
          recommendation: 'เพิ่ม meta descriptions ที่มีคุณภาพและน่าสนใจสำหรับทุกหน้า'
        },
        {
          category: 'error',
          type: 'alt-text',
          title: 'รูปภาพขาด Alt Text',
          description: 'พบ 37 รูปภาพที่ไม่มีข้อความทดแทน (Alt Text) ซึ่งสำคัญสำหรับการเข้าถึงและการค้นหาด้วยภาพ',
          impact: 'high',
          affectedUrls: ['/gallery', '/products'],
          recommendation: 'เพิ่ม alt text ที่มีความหมายสำหรับรูปภาพทั้งหมด'
        },
        {
          category: 'info',
          type: 'structured-data',
          title: 'เพิ่ม Structured Data',
          description: 'การเพิ่ม structured data จะช่วยให้ search engine เข้าใจเนื้อหาของเว็บไซต์ได้ดีขึ้น',
          impact: 'low',
          recommendation: 'เพิ่ม JSON-LD structured data สำหรับองค์กรและผลิตภัณฑ์'
        }
      ],
      technicalChecks: {
        hasRobotsTxt: true,
        hasSitemap: true,
        hasSSL: true,
        isResponsive: true,
        hasStructuredData: false,
        hasAnalytics: true,
        hasGoogleTagManager: true
      },
      contentAnalysis: {
        titleTags: {
          missing: 3,
          duplicate: 2,
          tooLong: 5,
          tooShort: 1
        },
        metaDescriptions: {
          missing: 18,
          duplicate: 4,
          tooLong: 7,
          tooShort: 3
        },
        headings: {
          missingH1: 2,
          multipleH1: 1,
          improperStructure: 8
        },
        images: {
          missingAlt: 37,
          tooLarge: 12,
          unoptimized: 23
        }
      },
      startedAt: new Date(Date.now() - 300000), // 5 minutes ago
      completedAt: new Date(Date.now() - 120000), // 2 minutes ago
      duration: 180000, // 3 minutes
      createdBy: 'seeder'
    });

    await sampleAudit.save();
    console.log('✅ Created sample audit');

    console.log('🎉 SEO data seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • Keywords: ${sampleKeywords.length}`);
    console.log(`   • Backlinks: ${sampleBacklinks.length}`);
    console.log(`   • Analytics: ${sampleAnalytics.length}`);
    console.log(`   • Audits: 1`);

  } catch (error) {
    console.error('❌ Error seeding SEO data:', error);
    throw error;
  }
}

// Run seeder if called directly
if (require.main === module) {
  const { connectDB } = require('../config/db');

  connectDB()
    .then(() => {
      console.log('🔌 Connected to database');
      return seedSEOData();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedSEOData };