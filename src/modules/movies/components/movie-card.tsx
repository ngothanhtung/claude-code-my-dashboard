"use client"

import Image from "next/image"
import Link from "next/link"
import { Star } from "lucide-react"
import type { Movie } from "@/modules/movies/services/types/movies-types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

interface MovieCardProps {
  movie: Movie
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

function getVoteColor(vote: number): string {
  if (vote >= 7.5) return "text-green-500"
  if (vote >= 6.0) return "text-yellow-500"
  return "text-red-500"
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Unknown"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function MovieCard({ movie }: MovieCardProps) {
  const posterSrc = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : null

  return (
    <Link href={`/movies/details/${movie.id}`} className="block">
      <Card className="group overflow-hidden h-full">
        <div className="relative aspect-2/3 w-full overflow-hidden bg-muted">
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

          <Badge
            variant="secondary"
            className={`absolute right-2 top-2 font-mono ${getVoteColor(movie.vote_average)}`}
          >
            <Star className="mr-1 h-3 w-3 fill-current" />
            {movie.vote_average.toFixed(1)}
          </Badge>
        </div>

        <CardHeader className="p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
            {movie.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatDate(movie.release_date)}
          </p>
        </CardHeader>

        <CardContent className="p-3 pt-0">
          <p className="line-clamp-3 text-xs text-muted-foreground leading-relaxed">
            {movie.overview || "No overview available."}
          </p>
        </CardContent>

        <CardFooter className="p-3 pt-0">
          <p className="text-xs text-muted-foreground">
            {movie.vote_count.toLocaleString()} votes
          </p>
        </CardFooter>
      </Card>
    </Link>
  )
}
