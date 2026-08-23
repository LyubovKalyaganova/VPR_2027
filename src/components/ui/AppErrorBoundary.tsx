import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="appCanvas" style={{ display: 'grid', placeContent: 'center', padding: 24, gap: 16 }}>
          <Card>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Что-то пошло не так</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Приложение столкнулось с ошибкой. Попробуй обновить страницу — твой прогресс сохранён локально.
            </p>
          </Card>
          <Button fullWidth onClick={this.handleReload}>
            Обновить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
