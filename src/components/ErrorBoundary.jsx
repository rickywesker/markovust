import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto mt-20 text-center">
          <div className="text-4xl mb-4">:(</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Something went wrong</h2>
          <p className="text-slate-400 mb-6 text-sm">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
