import { getInitial } from '../../data/demo/avatars';
import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = 48 }: AvatarProps) {
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
      aria-hidden
    >
      {getInitial(name)}
    </div>
  );
}
