/**
 * 宠物图片工具
 * 图片素材存放在 public/images/pets/，命名格式：{petTypeCode}-{level}.png
 * 如 cat-1.png = 小猫等级1（蛋），dragon-5.png = 小龙等级5（传说）
 */

/** 宠物类型 code → 中文名映射 */
const petTypeNames: Record<string, string> = {
  cat: '小猫',
  dog: '小狗',
  rabbit: '小兔子',
  panda: '小熊猫',
  penguin: '小企鹅',
  dragon: '小龙',
}

/** 等级名称 */
const levelNames = ['', '蛋', '幼崽', '成长', '成熟', '传说']

/** 等级颜色 */
const levelColors = ['', '#909399', '#e6a23c', '#67c23a', '#409eff', '#f56c6c']

/**
 * 获取宠物图片 URL
 * @param petTypeCode 宠物类型 code（cat/dog/rabbit/panda/penguin/dragon）
 * @param level 当前等级 1-5
 * @returns 图片路径，如 /images/pets/cat-3.png
 */
export function getPetImage(petTypeCode: string | undefined | null, level: number): string {
  const code = petTypeCode ?? 'cat'
  const lv = Math.max(1, Math.min(5, level || 1))
  return `/images/pets/${code}-${lv}.png`
}

/** 获取宠物类型中文名 */
export function getPetTypeName(code: string | undefined | null): string {
  if (!code) return '未知宠物'
  return petTypeNames[code] ?? '未知宠物'
}

/** 获取等级名称 */
export function getLevelName(level: number): string {
  return levelNames[level] ?? '未知'
}

/** 获取等级颜色 */
export function getLevelColor(level: number): string {
  return levelColors[level] ?? '#909399'
}

/** 宠物类型列表（供选择弹窗等使用） */
export const petTypeList = [
  { code: 'cat', name: '小猫', emoji: '🐱' },
  { code: 'dog', name: '小狗', emoji: '🐶' },
  { code: 'rabbit', name: '小兔子', emoji: '🐰' },
  { code: 'panda', name: '小熊猫', emoji: '🐼' },
  { code: 'penguin', name: '小企鹅', emoji: '🐧' },
  { code: 'dragon', name: '小龙', emoji: '🐲' },
]

/** emoji 后备（图片加载失败时显示） */
export function getPetEmoji(code: string | undefined | null): string {
  const item = petTypeList.find((p) => p.code === code)
  return item?.emoji ?? '🐾'
}
