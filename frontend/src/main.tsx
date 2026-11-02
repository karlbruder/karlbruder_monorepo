import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/app/global.css'
import AppRouter from '@/app/router'
import AppProvider from '@/app/provider'
import '@/app/app.css'

import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
