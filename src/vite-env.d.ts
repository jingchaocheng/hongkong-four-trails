/// <reference types="vite/client" />

declare module '*.gpx?raw' {
  const content: string
  export default content
}
