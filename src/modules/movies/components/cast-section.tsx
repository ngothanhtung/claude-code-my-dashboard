'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CastMember } from '@/modules/movies/services/types/movies-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CastSectionProps {
  cast: CastMember[];
}

const ITEM_W = 96;
const ITEM_GAP = 8;

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

export function CastSection({ cast }: CastSectionProps) {
  if (cast.length === 0) return null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function scrollBy(dir: -1 | 1) {
    const newIndex = Math.max(0, Math.min(cast.length - 1, currentIndex + dir));
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  }

  function scrollToIndex(index: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * (ITEM_W + ITEM_GAP), behavior: 'smooth' });
  }

  return (
    <div className='flex items-center gap-1'>
      {cast.length > 1 && (
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
        {cast.map((member) => (
          <div key={member.id} className='shrink-0 text-center' style={{ minWidth: ITEM_W }}>
            <div className='mx-auto w-16 h-16 rounded-full overflow-hidden border bg-muted mb-2'>
              {member.profile_path ? (
                <Image
                  src={`${TMDB_IMAGE_BASE}${member.profile_path}`}
                  alt={member.name}
                  width={64}
                  height={64}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center bg-muted'>
                  <User className='h-6 w-6 text-muted-foreground' />
                </div>
              )}
            </div>
            <p className='text-xs font-semibold leading-tight line-clamp-1'>{member.name}</p>
            <p className='text-xs text-muted-foreground leading-tight line-clamp-2 mt-0.5'>
              {member.character}
            </p>
          </div>
        ))}
      </div>

      {cast.length > 1 && (
        <button
          type='button'
          aria-label='Next'
          onClick={() => scrollBy(1)}
          disabled={currentIndex >= cast.length - 1}
          className='shrink-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      )}
    </div>
  );
}
