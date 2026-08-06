import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RealmProvider } from './contexts/RealmContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RealmProvider>
      <App />
    </RealmProvider>
  </StrictMode>,
)
