import {
  creditsResponseSchema,
  movieDetailsSchema,
  popularMoviesResponseSchema,
  videosResponseSchema,
  type CreditsResponse,
  type MovieDetails,
  type PopularMoviesResponse,
  type VideosResponse,
} from "./types/movies-types"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

export async function getPopularMovies(
  language = "en-US",
  page = 1
): Promise<PopularMoviesResponse> {
  const token = process.env.NEXT_PUBLIC_THE_MOVIE_DB_TOKEN

  if (!token) {
    throw new Error("NEXT_PUBLIC_THE_MOVIE_DB_TOKEN is not set")
  }

  const url = `${TMDB_BASE_URL}/movie/popular?language=${language}&page=${page}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch popular movies: ${response.statusText}`)
  }

  const data = await response.json()
  return popularMoviesResponseSchema.parse(data)
}

export async function getMovieDetails(
  movieId: number,
  language = "en-US"
): Promise<MovieDetails> {
  const token = process.env.NEXT_PUBLIC_THE_MOVIE_DB_TOKEN

  if (!token) {
    throw new Error("NEXT_PUBLIC_THE_MOVIE_DB_TOKEN is not set")
  }

  const url = `${TMDB_BASE_URL}/movie/${movieId}?language=${language}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch movie details: ${response.statusText}`)
  }

  const data = await response.json()
  return movieDetailsSchema.parse(data)
}

export async function getMovieVideos(movieId: number): Promise<VideosResponse> {
  const token = process.env.NEXT_PUBLIC_THE_MOVIE_DB_TOKEN

  if (!token) {
    throw new Error("NEXT_PUBLIC_THE_MOVIE_DB_TOKEN is not set")
  }

  const url = `${TMDB_BASE_URL}/movie/${movieId}/videos?language=en-US`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch movie videos: ${response.statusText}`)
  }

  const data = await response.json()
  return videosResponseSchema.parse(data)
}

export async function getMovieCredits(movieId: number): Promise<CreditsResponse> {
  const token = process.env.NEXT_PUBLIC_THE_MOVIE_DB_TOKEN

  if (!token) {
    throw new Error("NEXT_PUBLIC_THE_MOVIE_DB_TOKEN is not set")
  }

  const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?language=en-US`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch movie credits: ${response.statusText}`)
  }

  const data = await response.json()
  return creditsResponseSchema.parse(data)
}
