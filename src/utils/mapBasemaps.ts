export type BasemapId = 'osm' | 'carto'

export interface BasemapLayer {
  url: string
  attribution: string
  subdomains?: string | string[]
  maxZoom?: number
}

export interface BasemapDefinition {
  id: BasemapId
  labelKey: `map.basemap${'Osm' | 'Carto'}`
  layers: BasemapLayer[]
}

export const BASEMAP_STORAGE_KEY = 'hk-four-trails-basemap'
export const FALLBACK_BASEMAP_ID: BasemapId = 'carto'
export const DEFAULT_BASEMAP_ID: BasemapId = 'osm'

/** OSM 连续瓦片失败达到此次数且尚无成功加载时，切换备用底图 */
export const OSM_TILE_ERROR_THRESHOLD = 3
/** OSM 在此时间内无任何瓦片成功加载则切换备用底图（毫秒） */
export const OSM_LOAD_TIMEOUT_MS = 8000

const BASEMAP_DEFINITIONS: BasemapDefinition[] = [
  {
    id: 'osm',
    labelKey: 'map.basemapOsm',
    layers: [
      {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: 'abc',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      },
    ],
  },
  {
    id: 'carto',
    labelKey: 'map.basemapCarto',
    layers: [
      {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        subdomains: 'abcd',
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
      },
    ],
  },
]

export function getAvailableBasemaps(): BasemapDefinition[] {
  return BASEMAP_DEFINITIONS
}

export function getBasemapById(id: BasemapId): BasemapDefinition {
  return BASEMAP_DEFINITIONS.find((b) => b.id === id) ?? BASEMAP_DEFINITIONS[0]
}

function isBasemapId(value: string): value is BasemapId {
  return value === 'osm' || value === 'carto'
}

/** 读取本地偏好；无效时默认 OpenStreetMap */
export function getStoredBasemapId(): BasemapId {
  if (typeof localStorage === 'undefined') return DEFAULT_BASEMAP_ID
  const stored = localStorage.getItem(BASEMAP_STORAGE_KEY)
  // 旧版 ArcGIS 底图已停用，自动迁移到 Carto
  if (stored === 'esri') return 'carto'
  if (stored && isBasemapId(stored)) return stored
  return DEFAULT_BASEMAP_ID
}

export function setStoredBasemapId(id: BasemapId): void {
  localStorage.setItem(BASEMAP_STORAGE_KEY, id)
}
