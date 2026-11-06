// English dictionary: every piece of the app's own text, by key.
// tw.js must have exactly the same keys (checked by `npm run check:i18n`).
// Words in {braces} are filled in by t(), e.g. t('sync.notSentCount', { n: 2 }).
// The app's name lives ONLY in 'app.name' (docs/design.md §1): never type it anywhere else.

export default {
  'app.name': 'Ledga',

  // Bottom tabs
  'nav.main': 'Main menu',
  'nav.sell': 'Sell',
  'nav.customers': 'Customers',
  'nav.stock': 'Stock',
  'nav.today': 'Today',
  'nav.more': 'More',

  // Shared
  'common.back': 'Back',

  // Screens that arrive in later tasks: an empty state until then
  'sell.title': 'Sell',
  'sell.empty': 'No products to sell yet.',
  'customers.title': 'Customers',
  'customers.empty': 'No customers yet.',
  'stock.title': 'Stock',
  'stock.empty': 'No products in stock yet.',
  'today.title': 'Today',
  'today.empty': 'No sales today yet.',
  'more.title': 'More',

  // More → Language
  'language.title': 'Language',
  'language.en': 'English',
  'language.tw': 'Twi',

  // More → App and server
  'about.title': 'App and server',
  'about.appVersion': 'App version',
  'about.serverVersion': 'Server version',
  'about.serverStatus': 'Server',
  'about.checkAgain': 'Check again',
  'server.connecting': 'Connecting…',
  'server.ok': 'Working',
  'server.down': 'Not working right now. Your records are safe on this phone.',
  'server.unreachable': "Can't reach it right now. Your records are safe on this phone.",
  'server.offline': 'No internet. Your records are safe on this phone.',

  // Sync states (docs/app-plan.md "Sync states"); used by the header chip
  'sync.connecting': 'Connecting…',
  'sync.sending': 'Sending…',
  'sync.notSentYet': 'Not sent yet',
  'sync.notSentCount': '{n} not sent',
  'sync.allSent': 'All sent',
  'sync.needsAttention': 'Needs attention',

  // App updates (docs/app-plan.md "PWA update safety")
  'update.ready': 'A new version is ready.',
  'update.now': 'Update now',
  'update.later': 'Later',
  'update.finishFirst': 'Finish what you are entering first. The update will wait.',
  'update.offlineReady': 'Ready to work without internet.',
};
