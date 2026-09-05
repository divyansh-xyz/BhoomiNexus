import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Purge any legacy sample data stored in browser localStorage during prototype development
try {
  const legacyKeys = [
    'bhoomi_boss_projects_v1',
    'bhoomi_mock_projects',
    'bhoomi_corridor_presets',
  ];
  legacyKeys.forEach((key) => localStorage.removeItem(key));
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith('bhoomi_boss_parcels_') ||
        key.startsWith('bhoomi_project_workflow_') ||
        key.startsWith('bhoomi_project_tasks_') ||
        key.startsWith('bhoomi_project_audit_'))
    ) {
      localStorage.removeItem(key);
    }
  }
} catch {
  // Ignore storage access restrictions
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
