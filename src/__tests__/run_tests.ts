import fs from 'fs';
import path from 'path';

// Load .env.local into process.env before executing test suite
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  envLines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

console.log('Loaded env: NEXT_PUBLIC_SUPABASE_URL =', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Await dynamic import of test suite
async function start() {
  try {
    await import('./empirical_m1_test');
  } catch (err) {
    console.error('Error importing empirical_m1_test:', err);
    process.exit(1);
  }
}

start();
