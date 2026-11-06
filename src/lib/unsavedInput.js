// Tracks whether any screen has unsaved input (a sale in progress, a half-typed form).
//
// The app-update prompt checks this before reloading: the app must never reload itself while a person
// is entering something (docs/app-plan.md "PWA update safety"). Screens call markUnsaved('sale') when
// input starts and clearUnsaved('sale') when it's saved or abandoned. No React here, so it's easy to test.

const reasons = new Set();

// Records that `reason` (e.g. 'sale') has unsaved input.
export function markUnsaved(reason) {
  reasons.add(reason);
}

// Records that `reason` has nothing unsaved any more.
export function clearUnsaved(reason) {
  reasons.delete(reason);
}

// True while any screen has unsaved input.
export function hasUnsavedInput() {
  return reasons.size > 0;
}
