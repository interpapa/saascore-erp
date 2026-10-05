import type { NextConfig } from "next";

const DEFAULT_SUPABASE_URL = "https://nurbajgedeltcvgljsmg.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2MjUzNjgsImV4cCI6MjEwNDIwMTM2OH0.znxIyz6E3EoPCd_XBVW2FF_Ym0sR355itlJzWbyxIOM";
const DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51cmJhamdlZGVsdGN2Z2xqc21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODYyNTM2OCwiZXhwIjoyMTA0MjAxMzY4fQ.PSleumsr59zY6GSsnRKy0ha0yqdYn11GkYV5vBnunCc";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY;

const resolvedUrl = (!rawUrl || rawUrl.includes('acyvim') || rawUrl.includes('your-project') || !rawUrl.startsWith('https://'))
  ? DEFAULT_SUPABASE_URL
  : rawUrl;

const resolvedAnon = (!rawAnon || rawAnon.includes('acyvim') || rawAnon.includes('your-anon'))
  ? DEFAULT_ANON_KEY
  : rawAnon;

const resolvedService = (!rawService || rawService.includes('acyvim') || rawService.includes('your-service'))
  ? DEFAULT_SERVICE_KEY
  : rawService;

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvedUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedAnon,
    SUPABASE_SERVICE_ROLE_KEY: resolvedService,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
        ],
      },
    ];
  }
};

export default nextConfig;
