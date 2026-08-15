import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';
import { BirthProvider } from '@/lib/birthContext';
import type { ModuleId } from '@/lib/modules';
import { MODULES } from '@/lib/modules';

function getInitialModule(): ModuleId {
  const hash = window.location.hash.replace('#', '');
  if (MODULES.some((module) => module.id === hash)) return hash as ModuleId;
  return 'home';
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>(() => getInitialModule());

  const selectModule = useMemo(
    () => (id: ModuleId) => {
      setActiveModule(id);
      window.history.replaceState(null, '', `#${id}`);
    },
    [],
  );

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace('#', '');
      if (MODULES.some((module) => module.id === hash)) setActiveModule(hash as ModuleId);
    }

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  return (
    <BirthProvider>
      <AppShell activeModule={activeModule} onSelectModule={selectModule} />
    </BirthProvider>
  );
}
