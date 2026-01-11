import { spawn } from 'node:child_process'

export interface FreezeDetectOptions {
  /**
   * freezedetect noise tolerance.
   * Higher = more tolerant (detects "near-identical" frames).
   */
  noise: number
  /**
   * Minimum length of a freeze segment (in frames).
   */
  minFrames: number
  /**
   * Maximum length of a freeze segment (in frames). Longer freezes are ignored.
   */
  maxFrames: number
  /**
   * Hard cap to avoid generating too many repair segments.
   */
  maxSegments?: number
}

export function parseFps(value: string | undefined): number | null {
  if (!value)
    return null

  const trimmed = value.trim()
  const parts = trimmed.split('/')
  if (parts.length === 2) {
    const num = Number.parseFloat(parts[0])
    const den = Number.parseFloat(parts[1])
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0)
      return null
    return num / den
  }

  const fps = Number.parseFloat(trimmed)
  return Number.isFinite(fps) ? fps : null
}

function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  const sorted = ranges
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && s <= e)
    .sort((a, b) => a[0] - b[0])

  const merged: Array<[number, number]> = []
  for (const [start, end] of sorted) {
    const last = merged.at(-1)
    if (!last) {
      merged.push([start, end])
      continue
    }
    if (start <= last[1] + 1) {
      last[1] = Math.max(last[1], end)
      continue
    }
    merged.push([start, end])
  }
  return merged
}

export async function detectFreezeRanges(params: {
  ffmpegPath: string
  videoPath: string
  fps: number
  options: FreezeDetectOptions
  onLine?: (line: string) => void
}): Promise<Array<[number, number]>> {
  const { ffmpegPath, videoPath, fps, options, onLine } = params

  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 0
  if (!safeFps)
    return []

  const minFrames = Math.max(1, Math.floor(options.minFrames))
  const maxFrames = Math.max(minFrames, Math.floor(options.maxFrames))
  const maxSegments = options.maxSegments && options.maxSegments > 0 ? Math.floor(options.maxSegments) : undefined

  // freezedetect expects seconds. A freeze of N frames roughly spans N/fps seconds (CFR assumption).
  const minDurationSec = minFrames / safeFps

  const filter = `freezedetect=n=${options.noise}:d=${minDurationSec.toFixed(6)}`
  const args = [
    '-hide_banner',
    '-nostats',
    '-loglevel',
    'info',
    '-i',
    videoPath,
    '-an',
    '-vf',
    filter,
    '-f',
    'null',
    '-',
  ]

  return await new Promise<Array<[number, number]>>((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true })

    const rangesByTime: Array<{ start: number, end: number }> = []
    let currentStart: number | null = null

    let buffer = ''
    proc.stderr.on('data', (chunk) => {
      buffer += chunk.toString()
      while (true) {
        const idx = buffer.indexOf('\n')
        if (idx === -1)
          break
        const line = buffer.slice(0, idx).trimEnd()
        buffer = buffer.slice(idx + 1)
        onLine?.(line)

        const startMatch = line.match(/freeze_start:\s*([0-9.]+)/)
        if (startMatch) {
          currentStart = Number.parseFloat(startMatch[1])
          continue
        }

        const endMatch = line.match(/freeze_end:\s*([0-9.]+)/)
        if (endMatch && currentStart !== null) {
          const end = Number.parseFloat(endMatch[1])
          if (Number.isFinite(end) && end >= currentStart) {
            rangesByTime.push({ start: currentStart, end })
          }
          currentStart = null
        }
      }
    })

    proc.on('error', err => reject(err))

    proc.on('close', (code) => {
      if (code !== 0 && rangesByTime.length === 0) {
        reject(new Error(`ffmpeg freezedetect exited with code ${code}`))
        return
      }

      const rawRanges: Array<[number, number]> = []
      for (const { start, end } of rangesByTime) {
        // Treat freeze interval as [start, end) in time; convert to [startFrame, endFrame] (inclusive).
        const startFrame = Math.max(0, Math.round(start * safeFps))
        const endExclusive = Math.max(0, Math.round(end * safeFps))
        let s = Math.max(1, startFrame) // needs a previous frame (s-1)
        let e = endExclusive - 1 // needs a next frame (e+1)
        if (e < s)
          continue

        const len = e - s + 1
        if (len < minFrames)
          continue
        if (len > maxFrames)
          continue

        rawRanges.push([s, e])
      }

      let merged = mergeRanges(rawRanges)
      if (maxSegments && merged.length > maxSegments) {
        merged = merged.slice(0, maxSegments)
      }
      resolve(merged)
    })
  })
}

