// The app shell: the routes, the bottom tabs and the update prompt.
// Each tab is its own screen; unknown addresses go to Sell, the screen traders use most.

import { Navigate, Outlet, Route, Routes } from 'react-router';
import BottomTabs from './components/BottomTabs.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import SellScreen from './features/sell/SellScreen.jsx';
import CustomersScreen from './features/customers/CustomersScreen.jsx';
import StockScreen from './features/stock/StockScreen.jsx';
import TodayScreen from './features/today/TodayScreen.jsx';
import MoreScreen from './features/settings/MoreScreen.jsx';

// The frame around every tab screen: content centred at max 480px on wider screens, tabs at the bottom.
function Shell() {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-ground">
      <Outlet />
      <UpdatePrompt />
      <BottomTabs />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/sell" element={<SellScreen />} />
        <Route path="/customers" element={<CustomersScreen />} />
        <Route path="/stock" element={<StockScreen />} />
        <Route path="/today" element={<TodayScreen />} />
        <Route path="/more" element={<MoreScreen />} />
        <Route path="*" element={<Navigate to="/sell" replace />} />
      </Route>
    </Routes>
  );
}
