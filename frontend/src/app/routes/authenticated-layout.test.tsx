import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AuthenticatedLayout } from '@/app/routes/authenticated-layout'
import { AuthSessionContext } from '@/features/auth/hooks/use-auth-session'
import { LanguageContext } from '@/hooks/use-language'

const session = { user: { id: 'athlete-uuid' } } as Session

function SignInDestination() {
  const location = useLocation()
  return <output aria-label="Sign-in destination">{location.pathname}{location.search}</output>
}

function ProtectedRoutes({ entry, expired = false }: { entry: string; expired?: boolean }) {
  return (
    <LanguageContext value={{ language: 'pt', changeLanguage: vi.fn() }}>
      <AuthSessionContext value={{
        session: expired ? null : session,
        authReady: true,
        authLoading: false,
        authError: null,
        sessionLapsed: expired,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
        clearSessionLapsedNotice: vi.fn(),
      }}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route element={<AuthenticatedLayout />}>
              <Route path="/" element={<p>Protected home</p>} />
              <Route path="/account/password" element={<p>Protected password form</p>} />
            </Route>
            <Route path="/account/sign-in" element={<SignInDestination />} />
          </Routes>
        </MemoryRouter>
      </AuthSessionContext>
    </LanguageContext>
  )
}

afterEach(cleanup)

describe('Authenticated layout', () => {
  it('resets protected form state when the signed-in account changes', () => {
    function ProtectedForm({ accountId }: { accountId: string }) {
      return <LanguageContext value={{ language: 'pt', changeLanguage: vi.fn() }}>
        <AuthSessionContext value={{ session: { user: { id: accountId } } as Session, authReady: true, authLoading: false, authError: null, sessionLapsed: false, signInWithGoogle: vi.fn(), signOut: vi.fn(), clearSessionLapsedNotice: vi.fn() }}>
          <MemoryRouter initialEntries={['/']}><Routes><Route element={<AuthenticatedLayout />}><Route path="/" element={<input aria-label="Draft" />} /></Route></Routes></MemoryRouter>
        </AuthSessionContext>
      </LanguageContext>
    }
    const view = render(<ProtectedForm accountId="account-a" />)
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'private draft' } })
    view.rerender(<ProtectedForm accountId="account-b" />)
    expect(screen.getByLabelText('Draft')).toHaveValue('')
  })

  it.each([
    ['/?lang=en', 'Protected home'],
    ['/account/password?source=home', 'Protected password form'],
  ])('removes the protected screen and preserves %s when the session expires', async (entry, content) => {
    const view = render(<ProtectedRoutes entry={entry} />)
    expect(screen.getByText(content)).toBeInTheDocument()

    view.rerender(<ProtectedRoutes entry={entry} expired />)

    expect(screen.queryByText(content)).not.toBeInTheDocument()
    const destination = await screen.findByLabelText('Sign-in destination')
    expect(destination).toHaveTextContent(`/account/sign-in?${new URLSearchParams({
      returnTo: entry,
      sessionExpired: '1',
    })}`)
  })
})
