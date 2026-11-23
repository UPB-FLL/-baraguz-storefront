import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { inject } from '@vercel/analytics';
import { App } from './App';
import './styles.css';

inject();

const root = document.getElementById('root')!;
const app = <StrictMode><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></BrowserRouter></StrictMode>;
// Prerendered pages hydrate; the fallback shell (a path that was not prerendered) renders fresh.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
