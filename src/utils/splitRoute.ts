/** 按累计距离均衡计算分界点（路线序列位置） */
export function computeDistanceBalancedSplits(
  numDays: number,
  routeLen: number,
  nodeCumulativeKm: number[]
): number[] {
  if (numDays <= 1 || routeLen < 2 || nodeCumulativeKm.length < routeLen) return []

  const total = nodeCumulativeKm[routeLen - 1]
  if (total <= 0) return []

  const targetPerDay = total / numDays
  const splits: number[] = []

  for (let day = 1; day < numDays; day++) {
    const targetDist = targetPerDay * day
    const minPos = day === 1 ? 1 : splits[day - 2] + 1
    const maxPos = routeLen - 1 - (numDays - day - 1)

    let bestPos = minPos
    let bestDiff = Infinity
    for (let pos = minPos; pos <= maxPos; pos++) {
      const diff = Math.abs(nodeCumulativeKm[pos] - targetDist)
      if (diff < bestDiff) {
        bestDiff = diff
        bestPos = pos
      }
    }
    splits.push(bestPos)
  }

  return splits
}
