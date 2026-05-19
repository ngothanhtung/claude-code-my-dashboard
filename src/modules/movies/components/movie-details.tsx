"use client"

import Image from "next/image"
import {
  ExternalLink,
  Star,
  Clock,
  Calendar,
  Globe,
  Building2,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Languages,
} from "lucide-react"
import Link from "next/link"
import type { CastMember, MovieDetails, MovieVideo } from "@/modules/movies/services/types/movies-types"
import { TrailerDialog } from "./trailer-dialog"
import { CastSection } from "./cast-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const TMDB_IMAGE_BASE_W500 = "https://image.tmdb.org/t/p/w500"
const TMDB_IMAGE_BASE_W1280 = "https://image.tmdb.org/t/p/w1280"

interface MovieDetailsProps {
  movie: MovieDetails
  videos?: MovieVideo[]
  cast?: CastMember[]
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toLocaleString()}`
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "N/A"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getVoteColor(vote: number): string {
  if (vote >= 7.5) return "text-green-500"
  if (vote >= 6.0) return "text-yellow-500"
  return "text-red-500"
}

export function MovieDetails({ movie, videos = [], cast = [] }: MovieDetailsProps) {
  const backdropSrc = movie.backdrop_path
    ? `${TMDB_IMAGE_BASE_W1280}${movie.backdrop_path}`
    : null
  const posterSrc = movie.poster_path
    ? `${TMDB_IMAGE_BASE_W500}${movie.poster_path}`
    : null

  return (
    <div className="flex flex-col">
      {/* Backdrop Hero */}
      <div className="relative w-full" style={{ height: "clamp(200px, 35vw, 480px)" }}>
        {backdropSrc ? (
          <Image
            src={backdropSrc}
            alt={movie.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="absolute inset-0 flex items-end px-4 pb-4 lg:px-8">
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-8 -mt-24 relative z-10 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {posterSrc && (
            <div className="shrink-0">
              <Image
                src={posterSrc}
                alt={movie.title}
                width={160}
                height={240}
                className="rounded-lg border shadow-lg"
              />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{movie.title}</h1>
                {movie.tagline && (
                  <p className="text-muted-foreground italic">&ldquo;{movie.tagline}&rdquo;</p>
                )}
              </div>
              <div className={`flex items-center gap-1 rounded-md border px-3 py-1.5 font-mono text-lg font-bold ${getVoteColor(movie.vote_average)}`}>
                <Star className="h-4 w-4 fill-current" />
                {movie.vote_average.toFixed(1)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {movie.genres.map((genre) => (
                <Badge key={genre.id} variant="outline">
                  {genre.name}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(movie.release_date)}
              </span>
              {movie.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                {movie.original_language.toUpperCase()}
              </span>
              <span>{movie.vote_count.toLocaleString()} votes</span>
              {movie.status && (
                <Badge variant="secondary" className="text-xs">
                  {movie.status}
                </Badge>
              )}
            </div>

            {movie.origin_country.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Country:</span>
                {movie.origin_country.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Details Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Overview + Links */}
          <div className="space-y-6 lg:col-span-2">
            {movie.overview && (
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {movie.overview}
                  </p>
                </CardContent>
              </Card>
            )}

            {cast.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Billed Cast</CardTitle>
                </CardHeader>
                <CardContent>
                  <CastSection cast={cast} />
                </CardContent>
              </Card>
            )}

            {movie.belongs_to_collection && (
              <Card>
                <CardHeader>
                  <CardTitle>Collection</CardTitle>
                  <CardDescription>{movie.belongs_to_collection.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {movie.belongs_to_collection.poster_path && (
                      <Image
                        src={`${TMDB_IMAGE_BASE_W500}${movie.belongs_to_collection.poster_path}`}
                        alt={movie.belongs_to_collection.name}
                        width={80}
                        height={120}
                        className="rounded-md"
                      />
                    )}
                    {movie.belongs_to_collection.backdrop_path && (
                      <Image
                        src={`${TMDB_IMAGE_BASE_W500}${movie.belongs_to_collection.backdrop_path}`}
                        alt={movie.belongs_to_collection.name}
                        width={160}
                        height={90}
                        className="rounded-md"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* External Links */}
            <div className="flex flex-wrap gap-2">
              <TrailerDialog videos={videos} />
              {movie.homepage && (
                <Button variant="outline" size="sm" asChild>
                  <a href={movie.homepage} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Homepage
                  </a>
                </Button>
              )}
              {movie.imdb_id && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    IMDB
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Right: Stats + Companies */}
          <div className="space-y-6">
            {/* Financials */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-3.5 w-3.5" />
                    Budget
                  </span>
                  <span className="font-medium">
                    {movie.budget > 0 ? formatCurrency(movie.budget) : "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Revenue
                  </span>
                  <span className="font-medium">
                    {movie.revenue > 0 ? formatCurrency(movie.revenue) : "N/A"}
                  </span>
                </div>
                {movie.revenue > 0 && movie.budget > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ROI</span>
                      <span className="font-medium text-green-500">
                        {((movie.revenue / movie.budget - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Production Companies */}
            {movie.production_companies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Production</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {movie.production_companies
                    .filter((c) => c.logo_path)
                    .slice(0, 6)
                    .map((company) => (
                      <div key={company.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                          {company.logo_path ? (
                            <Image
                              src={`${TMDB_IMAGE_BASE_W500}${company.logo_path}`}
                              alt={company.name}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{company.name}</p>
                          {company.origin_country && (
                            <p className="text-xs text-muted-foreground">
                              {company.origin_country}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Languages */}
            {movie.spoken_languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Languages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.spoken_languages.map((lang) => (
                      <Badge key={lang.iso_639_1} variant="outline" className="text-xs">
                        {lang.english_name || lang.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="pb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/movies/popular">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Popular Movies
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
