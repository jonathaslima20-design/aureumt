import { memo, useState } from 'react';
import { avatarColor, avatarInitial } from './utils';

type Props = {
  name: string | null;
  number: string;
  size?: number;
  imageUrl?: string | null;
};

function AvatarComp({ name, number, size = 36, imageUrl }: Props) {
  const [imgError, setImgError] = useState(false);
  const color = avatarColor(number);
  const initial = avatarInitial(name, number);
  const showImage = imageUrl && !imgError;

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold text-white select-none overflow-hidden"
      style={{
        width: size,
        height: size,
        background: showImage ? 'transparent' : `linear-gradient(135deg, ${color}, ${color}cc)`,
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        initial
      )}
    </div>
  );
}

export const Avatar = memo(AvatarComp);
