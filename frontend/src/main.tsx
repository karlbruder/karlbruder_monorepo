import '@/integrations/sentry/instrument.client'
import { StrictMode } from 'react'
import { isInitialized, reactErrorHandler } from "@sentry/react"
import { createRoot } from 'react-dom/client'
import '@/app/global.css'
import AppRouter from '@/app/router'
import AppProvider from '@/app/provider'
import '@/app/app.css'

import { BrowserRouter } from "react-router-dom";

const onReactError = isInitialized() ? reactErrorHandler((error) => console.error(error)) : undefined

createRoot(document.getElementById('root')!, {
  onCaughtError: onReactError,
  onUncaughtError: onReactError,
  onRecoverableError: onReactError,
}).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
)
