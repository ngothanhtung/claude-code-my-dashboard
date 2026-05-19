"use client"

import Image from "next/image"
import { User } from "lucide-react"
import type { CastMember } from "@/modules/movies/services/types/movies-types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CastSectionProps {
  cast: CastMember[]
}

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185"
const CAST_ITEM_WIDTH = 96

export function CastSection({ cast }: CastSectionProps) {
  if (cast.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {cast.map((member) => (
          <div
            key={member.id}
            className="shrink-0 w-24 text-center"
            style={{ minWidth: CAST_ITEM_WIDTH }}
          >
            <div className="mx-auto w-16 h-16 rounded-full overflow-hidden border bg-muted mb-2">
              {member.profile_path ? (
                <Image
                  src={`${TMDB_IMAGE_BASE}${member.profile_path}`}
                  alt={member.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs font-semibold leading-tight line-clamp-1">
              {member.name}
            </p>
            <p className="text-xs text-muted-foreground leading-tight line-clamp-2 mt-0.5">
              {member.character}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
