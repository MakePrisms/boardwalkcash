import { useCallback, useState } from 'react';

type Options = {
  name: 'shake' | 'slam';
  durationMs?: number;
};

type Result = {
  animationClass: string;
  start: () => void;
};

const useAnimation = ({ name, durationMs = 200 }: Options): Result => {
  const [animationClass, setAnimationClass] = useState('');

  const start = useCallback(() => {
    setAnimationClass(`animate-${name}`);
    setTimeout(() => setAnimationClass(''), durationMs);
  }, [name, durationMs]);

  return { animationClass, start };
};

export default useAnimation;
