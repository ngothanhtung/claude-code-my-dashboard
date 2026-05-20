'use client';

import { useState } from 'react';
import { MovieCard } from '@/modules/movies/components/movie-card';
import { getPopularMovies } from '@/modules/movies/services/movies-services';
import type { PopularMoviesResponse } from '@/modules/movies/services/types/movies-types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  initialData: PopularMoviesResponse;
}

export function PopularMoviesClient({ initialData }: Props) {
  const [data, setData] = useState<PopularMoviesResponse>(initialData);
  const [page, setPage] = useState(initialData.page);
  const [loading, setLoading] = useState(false);

  async function handlePageChange(newPage: number) {
    if (newPage < 1 || newPage > data.total_pages) return;
    setLoading(true);
    try {
      const result = await getPopularMovies('en-US', newPage);
      setData(result);
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <Skeleton className='aspect-2/3 w-full rounded-lg' />
              <Skeleton className='h-3 w-3/4' />
              <Skeleton className='h-2 w-1/2' />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {data.results.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          <div className='flex items-center justify-center gap-4 pb-4'>
            <Button variant='outline' onClick={() => handlePageChange(page - 1)} disabled={page <= 1 || loading}>
              Previous
            </Button>

            <span className='text-sm text-muted-foreground'>
              Page {page} of {data.total_pages.toLocaleString()}
            </span>

            <Button variant='outline' onClick={() => handlePageChange(page + 1)} disabled={page >= data.total_pages || loading}>
              Next
            </Button>
          </div>
        </>
      )}
    </>
  );
}
