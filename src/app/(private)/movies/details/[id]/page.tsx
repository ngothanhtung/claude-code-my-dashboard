import { notFound } from "next/navigation"
import { getMovieDetails, getMovieVideos, getMovieCredits } from "@/modules/movies/services/movies-services"
import { MovieDetails } from "@/modules/movies/components/movie-details"

interface MovieDetailsPageProps {
  params: Promise<{ id: string }>
}

export default async function MovieDetailsPage({ params }: MovieDetailsPageProps) {
  const { id } = await params
  const movieId = Number(id)

  if (isNaN(movieId)) {
    notFound()
  }

  const [movie, videosResponse, creditsResponse] = await Promise.all([
    getMovieDetails(movieId, "en-US"),
    getMovieVideos(movieId),
    getMovieCredits(movieId),
  ])

  return (
    <div className="pb-8">
      <MovieDetails
        movie={movie}
        videos={videosResponse.results}
        cast={creditsResponse.cast}
      />
    </div>
  )
}
