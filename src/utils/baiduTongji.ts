const BAIDU_TONGJI_ID = import.meta.env.VITE_BAIDU_TONGJI_ID

declare global {
  interface Window {
    _hmt?: unknown[][]
  }
}

export function initBaiduTongji() {
  if (!BAIDU_TONGJI_ID) return

  window._hmt = window._hmt || []
  const script = document.createElement('script')
  script.async = true
  script.src = `https://hm.baidu.com/hm.js?${BAIDU_TONGJI_ID}`
  document.head.appendChild(script)
}

export function trackBaiduPageview(path: string) {
  if (!BAIDU_TONGJI_ID || !window._hmt) return
  window._hmt.push(['_trackPageview', path])
}
