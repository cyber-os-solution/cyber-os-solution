'use client';

import { useEffect, useRef } from 'react';

// Video mudo e em loop que so toca enquanto esta visivel (poupa dados no 4G) e respeita "reduzir movimento".
export function LazyVideo({ src, poster, className, label }: { src: string; poster: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.4 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} className={className} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label} />;
}
