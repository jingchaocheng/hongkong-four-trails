export interface PlannerState {
  startMarker: number
  reverse: boolean
  isLoop: boolean
  numDays: number | null
  splitIndices: number[]
  dayCampsites: Record<number, string>
}

const STORAGE_PREFIX = 'hk-four-trails-plan-'

export function emptyPlannerState(): PlannerState {
  return {
    startMarker: 0,
    reverse: false,
    isLoop: false,
    numDays: null,
    splitIndices: [],
    dayCampsites: {},
  }
}

export function isPlannerStateEmpty(state: PlannerState): boolean {
  return state.numDays === null
}

export function encodePlanToSearchParams(state: PlannerState): URLSearchParams {
  const params = new URLSearchParams()
  if (isPlannerStateEmpty(state)) return params

  params.set('s', String(state.startMarker))
  if (state.reverse) params.set('r', '1')
  if (state.isLoop) params.set('l', '1')
  params.set('d', String(state.numDays))
  if (state.splitIndices.length > 0) {
    params.set('p', state.splitIndices.join(','))
  }
  const camps = Object.entries(state.dayCampsites)
    .filter(([, id]) => id)
    .map(([day, id]) => `${day}:${id}`)
  if (camps.length > 0) {
    params.set('c', camps.join(';'))
  }
  return params
}

export function decodePlanFromSearchParams(params: URLSearchParams): PlannerState | null {
  const d = params.get('d')
  if (!d) return null

  const numDays = Number(d)
  if (!Number.isFinite(numDays) || numDays < 1) return null

  const startMarker = Number(params.get('s') ?? '0')
  const reverse = params.get('r') === '1'
  const isLoop = params.get('l') === '1'

  const splitIndices = (params.get('p') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n))

  const dayCampsites: Record<number, string> = {}
  const campsRaw = params.get('c')
  if (campsRaw) {
    for (const part of campsRaw.split(';')) {
      const [dayStr, id] = part.split(':')
      const day = Number(dayStr)
      if (Number.isFinite(day) && id) {
        dayCampsites[day] = id
      }
    }
  }

  return {
    startMarker: Number.isFinite(startMarker) ? startMarker : 0,
    reverse,
    isLoop,
    numDays,
    splitIndices,
    dayCampsites,
  }
}

export function loadPlanFromStorage(trailId: string): PlannerState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${trailId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PlannerState
    if (parsed && typeof parsed === 'object' && 'numDays' in parsed) {
      return parsed
    }
  } catch {
    // ignore
  }
  return null
}

export function savePlanToStorage(trailId: string, state: PlannerState): void {
  try {
    if (isPlannerStateEmpty(state)) {
      localStorage.removeItem(`${STORAGE_PREFIX}${trailId}`)
      return
    }
    localStorage.setItem(`${STORAGE_PREFIX}${trailId}`, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

export function resolveInitialPlan(
  trailId: string,
  searchParams: URLSearchParams
): PlannerState | null {
  return decodePlanFromSearchParams(searchParams) ?? loadPlanFromStorage(trailId)
}
