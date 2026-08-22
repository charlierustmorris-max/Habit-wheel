import { IconInsights, IconManage, IconMic, IconToday, IconWeek } from './Icons';

export type Tab = 'today' | 'week' | 'insights' | 'manage';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  onParse: () => void;
}

export function TabBar({ tab, onTab, onParse }: Props) {
  return (
    <nav className="tabbar">
      <button className={`tab${tab === 'today' ? ' active' : ''}`} onClick={() => onTab('today')}>
        <IconToday />
        Today
      </button>
      <button className={`tab${tab === 'week' ? ' active' : ''}`} onClick={() => onTab('week')}>
        <IconWeek />
        Week
      </button>
      <button className="tab-mic" onClick={onParse} aria-label="Log by voice or text">
        <IconMic />
      </button>
      <button className={`tab${tab === 'insights' ? ' active' : ''}`} onClick={() => onTab('insights')}>
        <IconInsights />
        Insights
      </button>
      <button className={`tab${tab === 'manage' ? ' active' : ''}`} onClick={() => onTab('manage')}>
        <IconManage />
        Manage
      </button>
    </nav>
  );
}
