import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Profiles } from './pages/Profiles'
import './index.css'
import { supabase } from '@/lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ color: 'red' }}>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [initError, setInitError] = React.useState<Error | null>(null);
  
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        console.log('Attempting to get session...');
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Session result:', session ? 'Has session' : 'No session');
        if (!session && !cancelled) {
          console.log('Signing in anonymously...');
          await supabase.auth.signInAnonymously()
          console.log('Anonymous sign-in complete');
        }
      } catch (e) {
        console.error('Auto anon sign-in failed', e)
        setInitError(e instanceof Error ? e : new Error(String(e)));
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (initError) {
    return (
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: 'red' }}>Initialization Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
          {initError.toString()}
          <br />
          {initError.stack}
        </pre>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-gray-100">
            <div style={{ padding: '10px', backgroundColor: '#e0e0e0', textAlign: 'center' }}>
              Debug info: App is rendering
            </div>
            <Routes>
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/" element={<Navigate to="/profiles" replace />} />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
