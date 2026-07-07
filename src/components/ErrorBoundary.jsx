import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-soft-gradient p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-800">Algo deu errado</h2>
            <p className="text-sm text-gray-500">Ocorreu um erro inesperado. Tente recarregar a página.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#003580] hover:bg-[#002060] text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
