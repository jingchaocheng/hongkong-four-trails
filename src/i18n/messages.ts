import * as OpenCC from "opencc-js";

const toHant = OpenCC.Converter({ from: "cn", to: "hk" });

function deepConvertStrings<T>(obj: T, converter: (s: string) => string): T {
  if (typeof obj === "string") return converter(obj) as T;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepConvertStrings(item, converter)) as T;
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepConvertStrings(value, converter);
    }
    return result as T;
  }
  return obj;
}

/** UI 文案源语言：简体中文 */
export const uiMessages = {
  locale: {
    hans: "简体",
    hant: "繁體",
    switchLabel: "语言",
  },
  common: {
    back: "返回",
    backHome: "返回首页",
    km: "公里",
    section: "段",
    day: "天",
    dayN: "第 {n} 天",
    sectionN: "第 {n} 段",
    about: "约",
    loadingTrack: "正在加载轨迹数据...",
  },
  home: {
    title: "香港四径",
    noTrack: "暂无轨迹",
    trackThumb: "{name} 轨迹缩略图",
  },
  trail: {
    notFound: "未找到该径道",
    trailInfo: "查看径道信息",
    totalLength: "总长度",
    sectionCount: "段落数",
    location: "位置",
    intro: "简介",
    collapsePlanner: "收起行程规划",
    expandPlanner: "展开行程规划",
  },
  map: {
    showAllCampsites: "显示全部露营点（42）",
    dayPaths: "每日路段",
    elevation: "海拔",
    elevationM: "{n}米",
    campsite: "露营点",
    dayCamp: "第 {n} 天宿营",
  },
  planner: {
    title: "行程规划",
    subtitle: "选择几天走完，并调整每天的起终点",
    noMarkers: "暂无标记点数据，无法规划行程。",
    startFrom: "从哪里出发？",
    originalStart: "（原起点）",
    originalEnd: "（原终点）",
    reverse: "反向走（朝相反方向）",
    loopMode: "环线模式（从起点绕一整圈回到起点）",
    howManyDays: "几天走完？",
    selectDays: "请选择天数",
    daysOption: "{n} 天走完",
    selectDaysHint: "选择天数后可规划每日路段与露营点",
    dailySegments: "每日路段",
    balanceByDistance: "按距离均衡",
    start: "起点",
    end: "终点",
    markersMeta:
      "{count} 个标记点 · 距离 ~{distance} 公里 · 爬升 {elevation} 米",
    tonightCampsite: "当晚露营点",
    nearMarker: "（{name} 附近）",
    noCampsite: "不露营 / 未选择",
    noNearbyCampsite: "附近暂无露营点数据",
    campsiteHighlighted: "已标记宿营地，地图上高亮显示",
    collapseElevation: "收起当天高度图",
    expandElevation: "查看当天高度图",
    totalSummary: "全程合计",
    totalDistance: "总距离: ~{n} 公里",
    totalElevation: "总爬升: {n} 米",
    textPlan: "文字版计划",
    copyLink: "复制分享链接",
    linkCopied: "已复制链接",
    copyPlan: "复制计划",
    planCopied: "已复制",
    planHint: "点击文本框可全选，或直接点「复制计划」保存到备忘录",
    fullElevation: "全程爬升高度图",
    routeLoop: "环线：{start} 出发绕行全程返回",
    routeLinear: "从 {start} 走到 {end}",
    defaultTrailName: "徒步路线",
  },
  elevation: {
    needTwoMarkers: "需要至少两个标记点才能显示高度图",
    min: "最低点",
    max: "最高点",
    gain: "总爬升",
    meters: "米",
  },
  campsite: {
    location: "营地地点",
    type: "营地类型",
    suitable: "适合对象",
    intro: "简介",
    facilities: "设施",
    sanitary: "卫生设施",
    water: "水源",
    attractions: "营地景点",
    access: "前往方法",
    remarks: "备注",
    sourceLink: "查看渔农自然护理署原文",
    dayCamp: "第 {n} 天宿营地",
  },
  markerGuide: {
    title: "标注点说明",
    code: "编号：",
    count: "（共 {n} 支）",
    hint: "地图与行程规划中的 M / W / H / L 标距柱即对应下列编号，可用于定位与分段规划。",
    sectionsTitle: "分段与标距柱",
    distanceKm: "约 {n} km",
  },
  plan: {
    title: "{name} · 行程计划",
    generated: "生成于 {date}",
    overview: "【概况】",
    route: "路线：{desc}",
    direction: "方向：{dir}",
    days: "天数：{n} 天",
    totalDistance: "总距离：~{n} 公里",
    totalElevation: "总爬升：{n} 米",
    dayHeader: "第 {n} 天",
    start: "起点：{label}",
    end: "终点：{label}",
    distance: "距离：~{n} 公里",
    elevation: "爬升：{n} 米",
    markers: "途经：{n} 个标记点",
    campsite: "当晚露营：{name}",
    campsiteLocation: "营地位置：{addr}",
    water: "水源：{text}",
    sanitary: "卫生设施：{text}",
    footerWish: "祝徒步愉快！",
    footerSafety: "安全第一：量力而行，注意天气与补水，结伴而行更安心。",
    footerLeaveNoTrace: "无痕山野：只留脚印，不留垃圾，尊重自然与野生动物。",
    dirLoop: "🔄 环线",
    dirReverse: "⬅️ 反向",
    dirForward: "➡️ 正向",
  },
} as const;

export type MessageTree = typeof uiMessages;

export const messagesZhHant = deepConvertStrings(uiMessages, toHant);
