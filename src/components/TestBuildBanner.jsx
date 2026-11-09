// The "TEST BUILD" bar on every screen of a temporary test build (VITE_SYNC_TEST_SCREEN=1), so nobody mistakes
// it for the real app. main.jsx only includes it when `__TEST_BUILD_BANNER__` is true, so a normal build
// leaves it out. Gold with ink text (9.4:1, design.md §2); bold words, never colour alone.

import { useT } from '../i18n/t.js';

export default function TestBuildBanner() {
  const { t } = useT();
  return (
    <div role="status" data-test-build-banner className="mx-auto max-w-120 bg-gold px-3 py-2 text-center text-body font-bold text-ink">
      {t('testBuild.banner')}
    </div>
  );
}
