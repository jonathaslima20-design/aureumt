import { memo } from 'react';
import { avatarColor, avatarInitial } from './utils';

type Props = {
  name: string | null;
  number: string;
  size?: number;
};

function AvatarComp({ name, number, size = 36 }: Props) {
  const color = avatarColor(number);
  const initial = avatarInitial(name, number);
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export const Avatar = memo(AvatarComp);
