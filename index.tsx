
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './styles.css';
import './mobile.css';
import { startStartupScreen } from './utils/startup';
import ApplicationErrorBoundary from './components/ApplicationErrorBoundary';

startStartupScreen();

if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      console.warn('Noosh offline cache could not be registered:', error);
    });
  }, { once: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ApplicationErrorBoundary><App /></ApplicationErrorBoundary>
  </React.StrictMode>
);
