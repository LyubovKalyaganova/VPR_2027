import { AppProviders } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <AppProviders>
      <div className="appCanvas">
        <AppRouter />
      </div>
    </AppProviders>
  );
}
