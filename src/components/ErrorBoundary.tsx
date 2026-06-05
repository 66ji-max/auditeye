// @ts-nocheck
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<any, any> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="p-4 border border-red-500 bg-red-900/20 rounded-md text-red-400 m-4">
          <h2 className="text-lg font-bold mb-2">组件渲染发生错误</h2>
          <p className="text-sm opacity-80">{this.state.error?.message}</p>
          <button 
            className="mt-4 px-3 py-1 bg-red-800 text-brand-primary rounded text-sm hover:bg-red-700"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            尝试恢复
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
