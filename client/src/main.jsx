import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import SmoothScrollProvider from './components/SmoothScrollProvider';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <SmoothScrollProvider>
                <App />
            </SmoothScrollProvider>
        </BrowserRouter>
    </React.StrictMode>
);
