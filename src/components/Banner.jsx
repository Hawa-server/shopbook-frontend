// A message box for a whole screen or form: an icon and words on a soft background.
// 'danger' (something failed) is announced at once to screen readers (role="alert");
// 'info' and 'success' are announced politely (role="status").

import Icon from './Icon.jsx';

const TONES = {
  danger: ['bg-danger-soft text-danger', 'warning', 'alert'],
  info: ['bg-pending-soft text-pending', 'info', 'status'],
  success: ['bg-paid-soft text-paid', 'check', 'status'],
};

export default function Banner({ tone = 'info', children, action }) {
  const [colours, icon, role] = TONES[tone];
  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-card px-4 py-3 ${colours}`}>
      <Icon name={icon} size={22} className="mt-0.5" />
      <div className="flex-1 font-semibold">
        <p>{children}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
