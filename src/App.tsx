import { useEffect, useState } from 'react';
import { testFirestoreConnection } from './lib/firebase';
import { DashboardView } from './components/DashboardView';
import { SurveyView } from './components/SurveyView';

type AppView = 'dashboard' | 'survey';

function readViewFromUrl(): AppView {
  if (typeof window === 'undefined') return 'dashboard';
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'survey' ? 'survey' : 'dashboard';
}

export default function App() {
  const [view, setView] = useState<AppView>(() => readViewFromUrl());

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(readViewFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (nextView: AppView) => {
    setView(nextView);
    const url = new URL(window.location.href);
    url.searchParams.set('view', nextView);
    url.hash = '';
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (view === 'survey') {
    return <SurveyView onOpenDashboard={() => navigateTo('dashboard')} />;
  }

  return <DashboardView onOpenSurvey={() => navigateTo('survey')} />;
}
