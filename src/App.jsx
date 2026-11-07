// The app shell: decides what to show from the signed-in state (auth/nextStep.js), then the routes.
//
// - Email links (/reset-password, /confirm-email) always open their screen, signed in or not.
// - Nobody signed in on this phone: Welcome, Sign in, Create account, Forgot password.
// - Signed in: first whatever step is due (own password, terms, invitations, no business, set PIN,
//   PIN lock), then the app with its bottom tabs. While the PIN is asked, /sign-in stays reachable for
//   "Forgot PIN" and after 5 wrong PINs.
// - If the server session ended, a banner on every tab offers "Sign in again"; nothing is deleted.

import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useT } from './i18n/t.js';
import { useAuth } from './auth/AuthProvider.jsx';
import { STEP } from './auth/nextStep.js';
import BottomTabs from './components/BottomTabs.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import Banner from './components/Banner.jsx';
import Splash, { useSplash } from './components/Splash.jsx';
import Button from './components/Button.jsx';
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

// "Your sign-in has ended": shown above every tab until the person signs in again.
function SessionEndedBanner() {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <div className="px-4 pt-3">
      <Banner
        tone="info"
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate('/sign-in', { state: { reason: 'sessionEnded' } })}>
            {t('session.signInAgain')}
          </Button>
        }
      >
        {t('session.ended')}
      </Banner>
    </div>
  );
}

// The frame around every tab screen: content centred at max 480px on wider screens, tabs at the bottom.
function Shell() {
  const { sessionEnded } = useAuth();
  return (
    <div className="mx-auto min-h-dvh max-w-120 bg-ground">
      {sessionEnded && <SessionEndedBanner />}
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
      <Route element={<Shell />}>
        <Route path="/sell" element={<SellScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/stock" element={<StockScreen />} />
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route path="/more/account" element={<MyAccountScreen />} />
        <Route path="*" element={<Navigate to="/sell" replace />} />
      </Route>
    </Routes>
  );
}
