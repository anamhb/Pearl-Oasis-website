import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SmoothScroll } from './components/ui/SmoothScroll.jsx';
import 'lenis/dist/lenis.css';
import './index.css';

createRoot(document.getElementById('root')).render(
  <SmoothScroll>
    <App />
  </SmoothScroll>,
);
