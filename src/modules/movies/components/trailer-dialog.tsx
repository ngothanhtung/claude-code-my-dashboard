"use client"

import { useState, useRef } from "react"
import { Play, Video, ChevronLeft, ChevronRight } from "lucide-react"
import type { MovieVideo } from "@/modules/movies/services/types/movies-types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface TrailerDialogProps {
  videos: MovieVideo[]
}

const THUMB_WIDTH = 160
const THUMB_GAP = 8

function getYouTubeEmbedUrl(key: string): string {
  return `https://www.youtube.com/embed/${key}?autoplay=1&rel=0&modestbranding=1`
}

export function TrailerDialog({ videos }: TrailerDialogProps) {
  if (videos.length === 0) return null

  const youtubeVideos = videos.filter((v) => v.site === "YouTube")
  if (youtubeVideos.length === 0) return null

  const officialTrailer = youtubeVideos.find(
    (v) => v.type === "Trailer" && v.official
  )
  const defaultVideo = officialTrailer ?? youtubeVideos[0]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Video className="mr-2 h-4 w-4" />
          Watch Trailer{videos.length > 1 ? ` (${videos.length})` : ""}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden">
        <div className="relative aspect-video">
          <iframe
            key={`main-${defaultVideo.key}`}
            src={getYouTubeEmbedUrl(defaultVideo.key)}
            title={defaultVideo.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        {/* Carousel Strip */}
        <div className="relative border-t bg-card">
          <CarouselStrip videos={youtubeVideos} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CarouselStrip({ videos }: { videos: MovieVideo[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  function scrollBy(dir: -1 | 1) {
    const newIndex = Math.max(0, Math.min(videos.length - 1, currentIndex + dir))
    setCurrentIndex(newIndex)
    scrollToIndex(newIndex)
  }

  function scrollToIndex(index: number) {
    if (!scrollRef.current) return
    const scrollLeft = index * (THUMB_WIDTH + THUMB_GAP)
    scrollRef.current.scrollTo({ left: scrollLeft, behavior: "smooth" })
  }

  return (
    <div className="flex items-center gap-1 p-2">
      {videos.length > 1 && (
        <button
          type="button"
          aria-label="Previous videos"
          onClick={() => scrollBy(-1)}
          disabled={currentIndex === 0}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onScroll={() => {
          if (!scrollRef.current) return
          const index = Math.round(
            scrollRef.current.scrollLeft / (THUMB_WIDTH + THUMB_GAP)
          )
          setCurrentIndex(index)
        }}
      >
        {videos.map((video, index) => (
          <CarouselThumb key={video.id} video={video} />
        ))}
      </div>

      {videos.length > 1 && (
        <button
          type="button"
          aria-label="Next videos"
          onClick={() => scrollBy(1)}
          disabled={currentIndex >= videos.length - 1}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border bg-background hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function CarouselThumb({ video }: { video: MovieVideo }) {
  return (
    <VideoDialogTrigger video={video}>
      <div className="shrink-0 cursor-pointer group rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-all">
        <div className="relative w-40 aspect-video overflow-hidden bg-black">
          <img
            src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
          </div>
          {video.type === "Trailer" && (
            <div className="absolute top-1 left-1">
              <Badge variant="default" className="text-xs h-4 px-1 py-0">
                Trailer
              </Badge>
            </div>
          )}
          {video.official && (
            <div className="absolute top-1 right-1">
              <Badge variant="secondary" className="text-xs h-4 px-1 py-0">
                Official
              </Badge>
            </div>
          )}
        </div>
        <div className="bg-muted/50 px-1.5 py-1">
          <p className="text-xs font-medium line-clamp-2 leading-tight">
            {video.name}
          </p>
          <p className="text-xs text-muted-foreground">{video.size}p</p>
        </div>
      </div>
    </VideoDialogTrigger>
  )
}

function VideoDialogTrigger({ video, children }: { video: MovieVideo; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        <div>{children}</div>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden">
        <div className="relative aspect-video overflow-hidden">
          <iframe
            key={video.key}
            src={getYouTubeEmbedUrl(video.key)}
            title={video.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
        <div className="p-3 bg-card">
          <DialogTitle className="text-sm font-medium line-clamp-2">
            {video.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {video.type}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {video.size}p
            </span>
            {video.official && (
              <Badge variant="default" className="text-xs">
                Official
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
