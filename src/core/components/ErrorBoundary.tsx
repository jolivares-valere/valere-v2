import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { trackErrorBoundary } from '../utils/telemetry';

interface Props {
  children: React.ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName || 'Module'} crashed:`, error, errorInfo);
    trackErrorBoundary(error, this.props.moduleName);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-display font-bold text-valere-blue-dark">
              Error en {this.props.moduleName || 'el módulo'}
            </h3>
            <p className="text-sm text-valere-ink/50">
              Se ha producido un error inesperado. Puedes intentar recargar el módulo.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-slate-50 p-3 rounded-lg overflow-auto max-h-24 text-red-600/70">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-valere-blue-dark text-white rounded-xl text-sm font-medium hover:bg-valere-blue-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
