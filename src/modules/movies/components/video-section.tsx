'use client';

import { useState, useRef } from 'react';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MovieVideo } from '@/modules/movies/services/types/movies-types';
import { Badge } from '@/components/ui/badge';

interface VideoSectionProps {
  videos: MovieVideo[];
}

const ITEM_W = 160;
const ITEM_GAP = 8;

export function VideoSection({ videos }: VideoSectionProps) {
  if (videos.length === 0) return null;

  const youtubeVideos = videos.filter((v) => v.site === 'YouTube');
  if (youtubeVideos.length === 0) return null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function scrollBy(dir: -1 | 1) {
    const newIndex = Math.max(0, Math.min(youtubeVideos.length - 1, currentIndex + dir));
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }

  function scrollToIndex(index: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * (ITEM_W + ITEM_GAP), behavior: 'smooth' });
  }

  return (
    <div className='flex items-center gap-1'>
      {youtubeVideos.length > 1 && (
        <button
          type='button'
          aria-label='Previous'
          onClick={() => scrollBy(-1)}
          disabled={currentIndex === 0}
          className='shrink-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
      )}

      <div
        ref={scrollRef}
        className='flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1'
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={() => {
          if (!scrollRef.current) return;
          const idx = Math.round(scrollRef.current.scrollLeft / (ITEM_W + ITEM_GAP));
          setCurrentIndex(idx);
        }}
      >
        {youtubeVideos.map((video) => (
          <a
            key={video.id}
            href={`https://www.youtube.com/watch?v=${video.key}`}
            target='_blank'
            rel='noopener noreferrer'
            className='shrink-0 cursor-pointer group text-center rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-all'
            style={{ minWidth: ITEM_W }}
          >
            <div className='relative w-full aspect-video overflow-hidden bg-black'>
              <img
                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
                alt={video.name}
                className='w-full h-full object-cover transition-transform duration-200 group-hover:scale-105'
              />
              <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-black/70'>
                  <ExternalLink className='h-5 w-5 text-white' />
                </div>
              </div>
              {video.type === 'Trailer' && (
                <div className='absolute top-1 left-1'>
                  <Badge variant='default' className='text-xs h-4 px-1 py-0'>
                    Trailer
                  </Badge>
                </div>
              )}
              {video.official && (
                <div className='absolute top-1 right-1'>
                  <Badge variant='secondary' className='text-xs h-4 px-1 py-0'>
                    Official
                  </Badge>
                </div>
              )}
            </div>
            <div className='bg-muted/50 px-1.5 py-1'>
              <p className='text-xs font-medium line-clamp-2 leading-tight'>{video.name}</p>
              <p className='text-xs text-muted-foreground'>{video.size}p</p>
            </div>
          </a>
        ))}
      </div>

      {youtubeVideos.length > 1 && (
        <button
          type='button'
          aria-label='Next'
          onClick={() => scrollBy(1)}
          disabled={currentIndex >= youtubeVideos.length - 1}
          className='shrink-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
