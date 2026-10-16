import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ProjectPresentationPage from './pages/ProjectPresentationPage';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Presentation root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ProjectPresentationPage />
  </StrictMode>,
);
