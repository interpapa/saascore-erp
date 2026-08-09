const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../src');

const targetPages = [
  { name: '/caja', file: 'app/(erp)/caja/page.tsx' },
  { name: '/clientes', file: 'app/(erp)/clientes/page.tsx' },
  { name: '/catalogo', file: 'app/(erp)/catalogo/page.tsx' },
  { name: '/compras', file: 'app/(erp)/compras/page.tsx' },
  { name: '/equipo', file: 'app/(erp)/equipo/page.tsx' },
  { name: '/contabilidad', file: 'app/(erp)/contabilidad/page.tsx' },
  { name: '/calendario', file: 'app/(erp)/calendario/page.tsx' },
  { name: '/whatsapp', file: 'app/(erp)/whatsapp/page.tsx' },
  { name: '/integraciones', file: 'app/(erp)/integraciones/page.tsx' },
  { name: '/configuracion', file: 'app/(erp)/configuracion/page.tsx' },
  { name: '/admin', file: 'app/(saascore)/admin/page.tsx' }
];

console.log('====================================================');
console.log('DETAILED VERIFICATION OF ALL 11 TARGET MODULE VIEWS');
console.log('====================================================\n');

let allPassed = true;

targetPages.forEach(({ name, file }) => {
  const fullPath = path.join(srcDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ [FAIL] Missing file for ${name}: ${file}`);
    allPassed = false;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // R1 Check: Outer container match 'w-full max-w-6xl mx-auto px-4 sm:px-6 py-6'
  const hasR1Class = content.includes('w-full max-w-6xl mx-auto px-4 sm:px-6 py-6');

  // Height scroll hacks check
  const heightHackMatches = content.match(/h-full\s+overflow-y-auto|h-\[calc\(100vh-[^\]]+\)\]|h-\[calc\(|overflow-y-auto\s+h-full/g);
  const hasHeightHack = heightHackMatches !== null;

  // EmptyState check
  const usesEmptyState = content.includes('EmptyState') || content.includes('LegoEngine') || content.includes('ListFeed');

  // Native alert/confirm check
  const nativeAlerts = content.match(/\balert\(|\bconfirm\(/g);
  const hasNativeAlert = nativeAlerts !== null;

  // Primary action buttons: btn-haptic & bg-primary
  const primaryButtons = content.match(/<button[^>]*class(?:Name)?="([^"]*)"/g) || [];
  let btnHapticMissing = false;
  primaryButtons.forEach(btn => {
    if ((btn.includes('bg-primary') || btn.includes('primary')) && !btn.includes('btn-haptic') && !btn.includes('text-primary') && !btn.includes('hover:text-primary') && !btn.includes('border-primary')) {
      console.log(`   ⚠️ Button missing btn-haptic in ${name}: ${btn}`);
      btnHapticMissing = true;
    }
  });

  const pageOk = hasR1Class && !hasHeightHack && !hasNativeAlert;
  if (!pageOk) allPassed = false;

  console.log(`Module: ${name} (${file})`);
  console.log(`  - R1 Container Class (w-full max-w-6xl mx-auto px-4 sm:px-6 py-6): ${hasR1Class ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - Height Scroll Hacks (h-full overflow-y-auto, h-[calc...]): ${!hasHeightHack ? '✅ PASS (None)' : `❌ FAIL (${heightHackMatches.join(', ')})`}`);
  console.log(`  - R3 EmptyState / Data Feed Integration: ${usesEmptyState ? '✅ PASS' : '⚠️ WARNING (No direct EmptyState/LegoEngine component)'}`);
  console.log(`  - R3 Native alert()/confirm(): ${!hasNativeAlert ? '✅ PASS (None)' : '❌ FAIL (Found)'}`);
  console.log(`  - Primary Action Button Styling (btn-haptic bg-primary): ${!btnHapticMissing ? '✅ PASS' : '⚠️ WARN'}`);
  console.log('----------------------------------------------------');
});

console.log(`\nOVERALL MODULE VIEW VERIFICATION: ${allPassed ? '✅ ALL PASS' : '❌ FAILURES DETECTED'}`);
