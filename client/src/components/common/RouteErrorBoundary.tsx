import React from 'react';

interface State {
  error: Error | null;
}

/**
 * Catches a screen that failed to load or crashed, so the shopper sees a way forward instead of a blank page.
 * The usual cause is a visit that spans a new release: the old page asks for a file that no longer exists.
 */
export class RouteErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Moving to another address clears the error without remounting a healthy screen
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error: Error) {
    console.error('[Footzi] Screen failed to render:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isStale = /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(this.state.error.message);
    return (
      <div role="alert" className="py-24 px-4 text-center max-w-md mx-auto">
        <h1 className="font-serif text-2xl font-medium text-charcoal-900">
          {isStale ? 'A newer version of Footzi is available' : 'Something went wrong'}
        </h1>
        <p className="text-xs text-charcoal-500 mt-2">
          {isStale
            ? 'Reload the page to continue. Your bag and sign-in are kept.'
            : "This page couldn't be shown. Reloading usually fixes it."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-5 py-2.5 bg-charcoal-900 text-ivory-50 text-xs uppercase tracking-widest font-semibold rounded-xs hover:bg-charcoal-800"
        >
          Reload page
        </button>
      </div>
    );
  }
}
