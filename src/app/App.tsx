import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import { AppProviders } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <div className="appCanvas">
          <AppRouter />
        </div>
      </AppProviders>
    </AppErrorBoundary>
  );
}
