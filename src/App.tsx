import { useEffect, useState } from 'react';
import { TabBar, type Tab } from './components/TabBar';
import { ParseSheet } from './components/ParseSheet';
import { Today } from './screens/Today';
import { Week } from './screens/Week';
import { Insights } from './screens/Insights';
import { Manage } from './screens/Manage';
import { useStore } from './lib/store';
import { applyActions, type ParsedAction } from './lib/parse';
import { todayKey } from './lib/date';

export default function App() {
  const { state, setState, updateDay } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(todayKey());
  const [parsing, setParsing] = useState(false);

  // Each tab is its own screen, so start it at the top rather than inheriting scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const openDay = (d: string) => {
    setDate(d);
    setTab('today');
  };

  const apply = (actions: ParsedAction[]) => {
    updateDay(date, (day) => applyActions(day, actions));
    setParsing(false);
    setTab('today');
  };

  return (
    <div className="app">
      {tab === 'today' && <Today state={state} date={date} onDate={setDate} updateDay={updateDay} />}
      {tab === 'week' && <Week state={state} date={date} onPickDay={openDay} />}
      {tab === 'insights' && <Insights state={state} onPickDay={openDay} />}
      {tab === 'manage' && <Manage state={state} setState={setState} />}

      <TabBar tab={tab} onTab={setTab} onParse={() => setParsing(true)} />

      {parsing && (
        <ParseSheet state={state} date={date} onApply={apply} onClose={() => setParsing(false)} />
      )}
    </div>
  );
}
