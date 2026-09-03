import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import QueryProvider from './app/providers/QueryProvider';
import AuthProvider from './app/providers/AuthProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
};

export default App;
