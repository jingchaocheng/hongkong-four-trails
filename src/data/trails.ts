export interface Trail {
  id: string
  name: string
  nameEn: string
  length: number
  sections: number
  location: string
  description: string
  color: string
}

export const trails: Trail[] = [
  {
    id: 'maclehose',
    name: '麦理浩径',
    nameEn: 'MacLehose Trail',
    length: 100,
    sections: 10,
    location: '新界',
    description: '香港最长的远足径，全长100公里，横跨新界东西，途经多个郊野公园和水库。',
    color: '#10b981',
  },
  {
    id: 'wilson',
    name: '卫奕信径',
    nameEn: 'Wilson Trail',
    length: 78,
    sections: 10,
    location: '新界及港岛',
    description: '全长78公里，从南到北贯穿香港，连接港岛和九龙，途经多个历史遗迹。',
    color: '#3b82f6',
  },
  {
    id: 'hongkong',
    name: '港岛径',
    nameEn: 'Hong Kong Trail',
    length: 50,
    sections: 8,
    location: '香港岛',
    description: '全长50公里，环绕港岛，途经多个山峰和海岸线，是欣赏港岛自然风光的绝佳路线。',
    color: '#f59e0b',
  },
  {
    id: 'lantau',
    name: '凤凰径',
    nameEn: 'Lantau Trail',
    length: 70,
    sections: 12,
    location: '大屿山',
    description: '全长70公里，环绕大屿山，途经多个著名景点如大澳、昂坪和大东山，是体验大屿山自然与文化的理想路线。',
    color: '#8b5cf6',
  },
]

export function getTrailById(id: string): Trail | undefined {
  return trails.find((trail) => trail.id === id)
}
