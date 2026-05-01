'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  urls: string[];
  className?: string;
  imgClassName?: string;
};

export default function PhotoCarousel({ urls, className, imgClassName }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (urls.length === 0) return null;

  const single = urls.length === 1;

  function scrollToIndex(next: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(urls.length - 1, next));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    }
    setIndex(clamped);
  }

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth;
    if (slideWidth === 0) return;
    const next = Math.round(track.scrollLeft / slideWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl ${className ?? ''}`}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="relative w-full flex-shrink-0 snap-center"
          >
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              className={`h-64 w-full object-cover ${imgClassName ?? ''}`}
            />
          </div>
        ))}
      </div>

      {!single && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToIndex(index - 1);
            }}
            disabled={index === 0}
            aria-label="Föregående foto"
            className="absolute top-1/2 left-2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToIndex(index + 1);
            }}
            disabled={index === urls.length - 1}
            aria-label="Nästa foto"
            className="absolute top-1/2 right-2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute top-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {index + 1}/{urls.length}
          </div>
        </>
      )}
    </div>
  );
}
