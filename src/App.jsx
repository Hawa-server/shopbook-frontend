// The app shell: decides what to show from the signed-in state (auth/nextStep.js), then the routes.
//
// - Email links (/reset-password, /confirm-email) always open their screen, signed in or not.
// - Nobody signed in on this phone: Welcome, Sign in, Create account, Forgot password.
// - Signed in: first whatever step is due (own password, terms, invitations, no business, set PIN,
//   PIN lock), then the app with its bottom tabs. While the PIN is asked, /sign-in stays reachable for
//   "Forgot PIN" and after 5 wrong PINs.
// - Notices (session ended, register this phone, data removed, update the app) show under each tab
//   screen's header (components/AppNotices.jsx); nothing is deleted by them.

import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import { useAuth } from './auth/AuthProvider.jsx';
import { STEP } from './auth/nextStep.js';
import BottomTabs from './components/BottomTabs.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import Splash, { useSplash } from './components/Splash.jsx';
import SellScreen from './features/sell/SellScreen.jsx';
import CustomersScreen from './features/customers/CustomersScreen.jsx';
import StockScreen from './features/stock/StockScreen.jsx';
import TodayScreen from './features/today/TodayScreen.jsx';
import MoreScreen from './features/settings/MoreScreen.jsx';
import MyAccountScreen from './features/settings/MyAccountScreen.jsx';
import ChangeAccountScreen from './features/settings/ChangeAccountScreen.jsx';
import WelcomeScreen from './features/onboarding/WelcomeScreen.jsx';
import SignInScreen from './features/onboarding/SignInScreen.jsx';
import SignUpScreen from './features/onboarding/SignUpScreen.jsx';
import ForgotPasswordScreen from './features/onboarding/ForgotPasswordScreen.jsx';
import ResetPasswordScreen from './features/onboarding/ResetPasswordScreen.jsx';
import ConfirmEmailScreen from './features/onboarding/ConfirmEmailScreen.jsx';
import ChooseOwnPasswordScreen from './features/onboarding/ChooseOwnPasswordScreen.jsx';
import TermsScreen from './features/onboarding/TermsScreen.jsx';
import InvitationsScreen from './features/onboarding/InvitationsScreen.jsx';
import NoBusinessScreen from './features/onboarding/NoBusinessScreen.jsx';
import SetPinScreen from './features/onboarding/SetPinScreen.jsx';
import PinLockScreen from './features/onboarding/PinLockScreen.jsx';
import RegisterPhoneScreen from './features/onboarding/RegisterPhoneScreen.jsx';
import SyncStatusScreen from './features/needsAttention/SyncStatusScreen.jsx';

// DEVELOPMENT ONLY (FE3/FE3.5 sync test screen). In a production build `import.meta.env.DEV` is the
// constant `false`, so Vite drops this import and the screen's code from the build entirely.
const DevSyncScreen = import.meta.env.DEV ? lazy(() => import('./features/dev/DevSyncScreen.jsx')) : null;

// The frame around every tab screen: content centred at max 480px on wider screens, tabs at the bottom.
function Shell() {
  return (
    <div className="mx-auto min-h-dvh max-w-120 bg-ground">
      <Outlet />
      <UpdatePrompt place="aboveTabs" />
      <BottomTabs />
    </div>
  );
}

// The screen for a step that must happen before the app (null when the app itself can show).
const STEP_SCREENS = {
  [STEP.CHANGE_PASSWORD]: ChooseOwnPasswordScreen,
  [STEP.TERMS]: TermsScreen,
  [STEP.INVITATIONS]: InvitationsScreen,
  [STEP.NO_BUSINESS]: NoBusinessScreen,
  [STEP.SET_PIN]: SetPinScreen,
  [STEP.PIN]: PinLockScreen,
  [STEP.PIN_LOCKED_OUT]: PinLockScreen,
};

export default function App() {
  const { loading, step } = useAuth();
  const { pathname } = useLocation();
  const showSplash = useSplash(!loading);

  // The opening splash, while the phone's database opens (and for at least a moment, see Splash.jsx).
  if (showSplash) return <Splash />;

  // Email links work in every state.
  if (pathname === '/reset-password') return <ResetPasswordScreen />;
  if (pathname === '/confirm-email') return <ConfirmEmailScreen />;

  if (step === STEP.SIGNED_OUT) {
    return (
      <>
        <Routes>
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/sign-in" element={<SignInScreen />} />
          <Route path="/sign-up" element={<SignUpScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
        <UpdatePrompt />
      </>
    );
  }

  // While the PIN is asked, "Forgot PIN" and the locked-out state lead to a password sign-in.
  const pinStep = step === STEP.PIN || step === STEP.PIN_LOCKED_OUT;
  if (pinStep && (pathname === '/sign-in' || pathname === '/forgot-password')) {
    return pathname === '/sign-in' ? <SignInScreen /> : <ForgotPasswordScreen />;
  }

  const StepScreen = STEP_SCREENS[step];
  if (StepScreen) return <StepScreen />;

  return (
    <Routes>
      <Route path="/sign-in" element={<SignInScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/more/account/password" element={<ChangeAccountScreen key="password" what="password" />} />
      <Route path="/more/account/phone" element={<ChangeAccountScreen key="phone" what="phone" />} />
      <Route path="/more/account/email" element={<ChangeAccountScreen key="email" what="email" />} />
      <Route path="/register-phone" element={<RegisterPhoneScreen />} />
      {DevSyncScreen && (
        <Route
          path="/dev/sync"
          element={
            <Suspense fallback={null}>
              <DevSyncScreen />
            </Suspense>
          }
        />
      )}
      <Route element={<Shell />}>
        <Route path="/sell" element={<SellScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/stock" element={<StockScreen />} />
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route path="/more/account" element={<MyAccountScreen />} />
        <Route path="/more/sync" element={<SyncStatusScreen />} />
        <Route path="*" element={<Navigate to="/sell" replace />} />
      </Route>
    </Routes>
  );
}
