import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrouserRouter } from 'react-router-dom'
import App from './App'

createRoot(document.getElementById('root')).render(
 
    <BrouserRouter>
      <App />
    </BrouserRouter>
  
)
