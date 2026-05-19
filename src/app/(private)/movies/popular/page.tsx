import { PopularMoviesClient } from "./popular-movies-client"
import { getPopularMovies } from "@/modules/movies/services/movies-services"

export default async function PopularMoviesPage() {
  const initialData = await getPopularMovies("en-US", 1)

  return (
    <div className="px-4 lg:px-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Popular Movies</h1>
        <p className="text-muted-foreground">
          Discover the most popular movies right now
        </p>
      </div>

      <PopularMoviesClient initialData={initialData} />
    </div>
  )
}
