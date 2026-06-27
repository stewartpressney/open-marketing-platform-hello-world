import React from 'react';
import { createRoot } from 'react-dom/client';
import '@knadh/oat/oat.min.css';
import '@knadh/oat/oat.min.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
