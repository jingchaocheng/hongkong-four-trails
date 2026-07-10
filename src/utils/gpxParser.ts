export interface GPXPoint {
  lat: number
  lng: number
  elevation?: number
  time?: string
}

export interface GPXWaypoint {
  id: string
  name: string
  lat: number
  lng: number
  elevation?: number
}

export interface TrailMarker {
  id: string
  name: string
  lat: number
  lng: number
  elevation: number
}

export function waypointsToMarkers(waypoints: GPXWaypoint[]): TrailMarker[] {
  return waypoints.map((wpt) => ({
    id: wpt.id,
    name: wpt.name,
    lat: wpt.lat,
    lng: wpt.lng,
    elevation: wpt.elevation ?? 0,
  }))
}

/** 标距柱展示：编号与地名相同时只显示编号，避免 M123 - M123 */
export function formatMarkerLabel(
  marker: Pick<TrailMarker, 'id' | 'name'>,
  localize?: (text: string) => string
): string {
  const id = marker.id.trim()
  const rawName = marker.name.trim()
  const name = localize && rawName ? localize(rawName) : rawName
  if (!name || name.toUpperCase() === id.toUpperCase()) {
    return id
  }
  return `${id} - ${name}`
}

export interface GPXTrack {
  name?: string
  points: GPXPoint[]
}

export interface GPXData {
  tracks: GPXTrack[]
  waypoints: GPXWaypoint[]
}

export function parseGPX(gpxContent: string): GPXData {
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(gpxContent, 'text/xml')
  
  const tracks: GPXTrack[] = []
  const trackElements = xmlDoc.getElementsByTagName('trk')
  
  for (let i = 0; i < trackElements.length; i++) {
    const track = trackElements[i]
    const nameElement = track.getElementsByTagName('name')[0]
    const name = nameElement ? nameElement.textContent || undefined : undefined
    
    const points: GPXPoint[] = []
    const segments = track.getElementsByTagName('trkseg')
    
    for (let j = 0; j < segments.length; j++) {
      const segment = segments[j]
      const trackPoints = segment.getElementsByTagName('trkpt')
      
      for (let k = 0; k < trackPoints.length; k++) {
        const point = trackPoints[k]
        const lat = parseFloat(point.getAttribute('lat') || '0')
        const lng = parseFloat(point.getAttribute('lon') || '0')
        
        const eleElement = point.getElementsByTagName('ele')[0]
        const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : undefined
        
        const timeElement = point.getElementsByTagName('time')[0]
        const time = timeElement ? timeElement.textContent || undefined : undefined
        
        points.push({ lat, lng, elevation, time })
      }
    }
    
    if (points.length > 0) {
      tracks.push({ name, points })
    }
  }
  
  // 提取 waypoints (标注点)
  const waypoints: GPXWaypoint[] = []
  const wptElements = xmlDoc.getElementsByTagName('wpt')
  
  for (let i = 0; i < wptElements.length; i++) {
    const wpt = wptElements[i]
    const lat = parseFloat(wpt.getAttribute('lat') || '0')
    const lng = parseFloat(wpt.getAttribute('lon') || '0')
    
    const nameElement = wpt.getElementsByTagName('name')[0]
    const name = nameElement ? nameElement.textContent || '' : ''
    
    const eleElement = wpt.getElementsByTagName('ele')[0]
    const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : undefined
    
    waypoints.push({
      id: name,
      name: name,
      lat,
      lng,
      elevation,
    })
  }
  
  return { tracks, waypoints }
}

// 从轨迹点中提取关键点（用于标记点）
export function extractKeyPoints(points: GPXPoint[], maxPoints: number = 20): GPXPoint[] {
  if (points.length <= maxPoints) {
    return points
  }
  
  const keyPoints: GPXPoint[] = []
  const step = Math.floor(points.length / maxPoints)
  
  // 总是包含第一个和最后一个点
  keyPoints.push(points[0])
  
  for (let i = step; i < points.length - step; i += step) {
    keyPoints.push(points[i])
  }
  
  keyPoints.push(points[points.length - 1])
  
  return keyPoints
}

