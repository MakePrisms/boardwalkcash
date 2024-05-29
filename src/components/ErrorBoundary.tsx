import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
   children: ReactNode;
   fallback: ReactNode;
}

interface ErrorBoundaryState {
   hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
   constructor(props: ErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false };
   }

   static getDerivedStateFromError(): ErrorBoundaryState {
      // Update state to indicate an error occurred
      return { hasError: true };
   }

   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      // Log the error to an error reporting service if needed
      console.error('ErrorBoundary caught an error', error, errorInfo);
   }

   render() {
      if (this.state.hasError) {
         // Render the fallback UI
         return this.props.fallback;
      }

      // Render children if no error
      return this.props.children;
   }
}

export default ErrorBoundary;
