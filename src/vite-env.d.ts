/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BAIDU_TONGJI_ID?: string
}

declare module '*.gpx?raw' {
  const content: string
  export default content
}
