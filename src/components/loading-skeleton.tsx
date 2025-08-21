'use client'

import React from 'react'

interface SkeletonProps {
  className?: string
  height?: string
  width?: string
}

export function Skeleton({ className = "", height = "h-4", width = "w-full" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`}
    />
  )
}

export function SessionGridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton height="h-10" width="w-24" />
        <Skeleton height="h-10" width="w-32" />
        <Skeleton height="h-10" width="w-28" />
      </div>
      
      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-4">
          <div className="flex gap-4">
            <Skeleton height="h-6" width="w-20" />
            <Skeleton height="h-6" width="w-32" />
            <Skeleton height="h-6" width="w-28" />
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton height="h-16" width="w-24" />
              <Skeleton height="h-16" width="w-48" />
              <Skeleton height="h-16" width="w-48" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SessionCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <Skeleton height="h-5" width="w-3/4" />
      <Skeleton height="h-4" width="w-1/2" />
      <Skeleton height="h-4" width="w-2/3" />
      <div className="flex gap-2">
        <Skeleton height="h-6" width="w-16" />
        <Skeleton height="h-6" width="w-20" />
      </div>
    </div>
  )
}
