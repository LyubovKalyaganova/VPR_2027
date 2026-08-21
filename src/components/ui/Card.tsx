import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'sm' | 'md';
}

export function Card({ children, className, padding = 'md', ...rest }: CardProps) {
  const classes = [styles.card, styles[padding], className ?? ''].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
