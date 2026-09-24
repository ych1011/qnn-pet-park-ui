<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { Student, ScoreRule, ScoreType, AddScoreResponse } from '@/types/api'
import { useClassStore } from '@/stores/class'
import { getRuleList, addScore, undoScore } from '@/api/teacher'
import { getPetImage, getLevelName, getLevelColor } from '@/utils/pet'

const router = useRouter()
const classStore = useClassStore()

// ============ 数据 ============
const students = ref<Student[]>([])
const rules = ref<ScoreRule[]>([])
const loading = ref(false)

// 加分规则 / 扣分规则
const addRules = computed(() =>
  rules.value.filter((r) => r.type === 'add' && r.status === 1).sort((a, b) => a.sortOrder - b.sortOrder),
)
const subRules = computed(() =>
  rules.value.filter((r) => r.type === 'subtract' && r.status === 1).sort((a, b) => a.sortOrder - b.sortOrder),
)

// 当前选中的规则
const selectedRule = ref<ScoreRule | null>(null)

function selectRule(rule: ScoreRule) {
  if (selectedRule.value?.id === rule.id) {
    selectedRule.value = null // 再次点击取消选择
  } else {
    selectedRule.value = rule
  }
}

const hasClass = computed(() => !!classStore.currentClass)

// ============ 加减分操作 ============
const scoring = ref(false)
const levelUpStudentId = ref<number>(0)
const scoreFlashStudentId = ref<number>(0)

// 生成幂等键（PRD 5.7 幂等性设计）
function genIdempotentKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function handleScoreClick(student: Student) {
  if (!selectedRule.value) {
    ElMessage.warning('请先选择一条加分或扣分规则')
    return
  }
  if (scoring.value) return
  scoring.value = true
  const rule = selectedRule.value
  try {
    const res: AddScoreResponse = await addScore({
      studentId: student.id,
      ruleId: rule.id,
      type: rule.type,
      score: rule.score,
      ruleName: rule.name,
      idempotentKey: genIdempotentKey(),
    })
    // 更新本地宠物数据
    if (student.pet) {
      const oldLevel = student.pet.currentLevel
      student.pet.currentScore = res.newScore
      student.pet.currentLevel = res.newLevel
      // 升级动画
      if (res.leveledUp && res.newLevel > oldLevel) {
        levelUpStudentId.value = student.id
        setTimeout(() => {
          levelUpStudentId.value = 0
        }, 2000)
        ElMessage.success(`${student.name} 的宠物升级到 Lv.${res.newLevel} ${getLevelName(res.newLevel)}！`)
      } else {
        // 积分变化闪烁
        scoreFlashStudentId.value = student.id
        setTimeout(() => {
          scoreFlashStudentId.value = 0
        }, 600)
      }
    }
    // 显示撤销栏
    showUndoBar()
  } catch {
    // 拦截器已提示
  } finally {
    scoring.value = false
  }
}

// ============ 撤销 ============
const undoVisible = ref(false)
const undoCountdown = ref(10)
let undoTimer: ReturnType<typeof setInterval> | null = null

function showUndoBar() {
  undoVisible.value = true
  undoCountdown.value = 10
  if (undoTimer) clearInterval(undoTimer)
  undoTimer = setInterval(() => {
    undoCountdown.value--
    if (undoCountdown.value <= 0) {
      hideUndoBar()
    }
  }, 1000)
}

function hideUndoBar() {
  undoVisible.value = false
  if (undoTimer) {
    clearInterval(undoTimer)
    undoTimer = null
  }
}

async function handleUndo() {
  try {
    await undoScore()
    ElMessage.success('已撤销最近一次操作')
    hideUndoBar()
    // 重新拉取数据刷新状态
    await fetchData()
  } catch {
    // 拦截器已提示
  }
}

// ============ 随机点名（PRD 5.8 纯前端动画） ============
const randomStudentId = ref<number>(0)
const isRolling = ref(false)
let rollTimer: ReturnType<typeof setInterval> | null = null

function startRandomRoll() {
  if (students.value.length === 0 || isRolling.value) return
  isRolling.value = true
  randomStudentId.value = 0
  const pool = students.value
  let speed = 80 // 滚动速度（ms）
  let elapsed = 0
  const totalDuration = 2500 // 总时长 2.5 秒

  rollTimer = setInterval(() => {
    const randomIdx = Math.floor(Math.random() * pool.length)
    randomStudentId.value = pool[randomIdx].id
    elapsed += speed
    // 后半段减速
    if (elapsed > totalDuration / 2) {
      speed = Math.min(speed + 15, 200)
      clearInterval(rollTimer!)
      rollTimer = setInterval(rollStep, speed)
    }
    if (elapsed >= totalDuration) {
      stopRandomRoll()
    }
  }, speed)

  function rollStep() {
    const randomIdx = Math.floor(Math.random() * pool.length)
    randomStudentId.value = pool[randomIdx].id
    elapsed += speed
    if (elapsed >= totalDuration) {
      stopRandomRoll()
    }
  }
}

function stopRandomRoll() {
  if (rollTimer) {
    clearInterval(rollTimer)
    rollTimer = null
  }
  isRolling.value = false
  // 最终选中的学生保持高亮
  const pool = students.value
  if (pool.length > 0) {
    const finalIdx = Math.floor(Math.random() * pool.length)
    randomStudentId.value = pool[finalIdx].id
    ElMessage.info(`抽中：${pool[finalIdx].name}`)
  }
}

function clearRandomHighlight() {
  randomStudentId.value = 0
}

// ============ 数据加载 ============
async function fetchData() {
  // 确保有班级
  if (!classStore.currentClass) {
    try {
      await classStore.fetchCurrentClass()
    } catch {
      // 后端不可用，拦截器已提示
    }
  }
  if (!classStore.currentClass) return

  loading.value = true
  try {
    const [studentList, ruleList] = await Promise.all([
      getStudentListSafe(classStore.currentClass.id),
      getRuleListSafe(classStore.currentClass.id),
    ])
    students.value = studentList
    rules.value = ruleList
  } finally {
    loading.value = false
  }
}

// 包装一层 catch，避免 Promise.all 全部失败
async function getStudentListSafe(classId: number): Promise<Student[]> {
  try {
    return await classStore.fetchStudents()
  } catch {
    return []
  }
}
async function getRuleListSafe(classId: number): Promise<ScoreRule[]> {
  try {
    return await getRuleList(classId)
  } catch {
    return []
  }
}

onMounted(fetchData)

// 清理定时器
onUnmounted(() => {
  if (undoTimer) clearInterval(undoTimer)
  if (rollTimer) clearInterval(rollTimer)
})
</script>

<template>
  <div class="classroom">
    <!-- 无班级引导 -->
    <el-empty v-if="!hasClass && !loading" description="请先创建班级才能进行课堂操作">
      <el-button type="primary" @click="router.push('/teacher/class/create')">
        去创建班级
      </el-button>
    </el-empty>

    <template v-else>
      <!-- 规则选择栏 -->
      <div class="rules-bar" v-loading="loading">
        <div class="rules-section">
          <span class="rules-label add-label">加分规则</span>
          <div class="rules-buttons">
            <el-button
              v-for="r in addRules"
              :key="r.id"
              :type="selectedRule?.id === r.id ? 'success' : 'default'"
              size="small"
              round
              @click="selectRule(r)"
            >
              {{ r.name }} +{{ r.score }}
            </el-button>
            <span v-if="addRules.length === 0" class="no-rules">暂无加分规则</span>
          </div>
        </div>

        <div class="rules-section">
          <span class="rules-label sub-label">扣分规则</span>
          <div class="rules-buttons">
            <el-button
              v-for="r in subRules"
              :key="r.id"
              :type="selectedRule?.id === r.id ? 'danger' : 'default'"
              size="small"
              round
              @click="selectRule(r)"
            >
              {{ r.name }} -{{ r.score }}
            </el-button>
            <span v-if="subRules.length === 0" class="no-rules">暂无扣分规则</span>
          </div>
        </div>
      </div>

      <!-- 操作提示 + 随机点名 -->
      <div class="action-bar">
        <div class="action-hint">
          <template v-if="selectedRule">
            已选规则：<el-tag :type="selectedRule.type === 'add' ? 'success' : 'danger'" size="small">
              {{ selectedRule.name }} {{ selectedRule.type === 'add' ? '+' : '-' }}{{ selectedRule.score }}
            </el-tag>
            <span class="hint-text">→ 点击学生卡片完成操作</span>
            <el-button text size="small" @click="selectedRule = null">取消选择</el-button>
          </template>
          <template v-else>
            <span class="hint-text">请先选择一条规则，再点击学生</span>
          </template>
        </div>
        <el-button
          type="warning"
          plain
          :icon="isRolling ? '' : ''"
          :loading="isRolling"
          @click="startRandomRoll"
          :disabled="students.length === 0"
        >
          <el-icon v-if="!isRolling"><Aim /></el-icon>
          随机点名
        </el-button>
      </div>

      <!-- 学生卡片网格 -->
      <div class="student-grid" v-loading="loading">
        <el-empty
          v-if="!loading && students.length === 0"
          description="还没有学生，去学生管理添加"
        >
          <el-button @click="router.push('/teacher/students')">去添加学生</el-button>
        </el-empty>

        <div
          v-for="s in students"
          :key="s.id"
          class="student-card"
          :class="{
            active: selectedRule && !scoring,
            'level-up': levelUpStudentId === s.id,
            'score-flash': scoreFlashStudentId === s.id,
            'random-hit': randomStudentId === s.id && !isRolling,
            'random-rolling': isRolling && randomStudentId === s.id,
          }"
          @click="handleScoreClick(s)"
        >
          <!-- 宠物头像 -->
          <div
            class="card-pet-avatar"
            :style="{ background: getLevelColor(s.pet?.currentLevel ?? 1) }"
          >
            <template v-if="s.pet">
              <img :src="getPetImage(s.pet.petType?.code, s.pet.currentLevel)" class="pet-emoji pet-anim-wobble" alt="宠物" />
            </template>
            <template v-else>
              <span class="pet-emoji unassigned">🐾</span>
            </template>
          </div>

          <!-- 学生姓名 -->
          <div class="card-name">{{ s.name }}</div>

          <!-- 宠物信息 -->
          <div class="card-pet-info">
            <template v-if="s.pet">
              <div class="card-pet-name">{{ s.pet.customName || s.pet.petType?.name || '宠物' }}</div>
              <el-tag
                size="small"
                :color="getLevelColor(s.pet.currentLevel)"
                effect="dark"
                round
              >
                Lv.{{ s.pet.currentLevel }} {{ getLevelName(s.pet.currentLevel) }}
              </el-tag>
              <div class="card-score">{{ s.pet.currentScore }} 分</div>
            </template>
            <template v-else>
              <div class="card-pet-name unassigned">未分配宠物</div>
              <el-button
                text
                size="small"
                type="primary"
                @click.stop="router.push(`/teacher/students/${s.id}`)"
              >
                去分配 →
              </el-button>
            </template>
          </div>

          <!-- 升级特效 -->
          <div v-if="levelUpStudentId === s.id" class="level-up-effect">
            <span class="level-up-text">升级！</span>
          </div>
        </div>
      </div>

      <!-- 撤销栏 -->
      <transition name="slide-up">
        <div v-if="undoVisible" class="undo-bar">
          <span class="undo-hint">
            最近一次操作可在 <strong>{{ undoCountdown }}</strong> 秒内撤销
          </span>
          <el-button type="danger" plain size="small" @click="handleUndo">
            <el-icon><RefreshLeft /></el-icon>
            撤销
          </el-button>
        </div>
      </transition>
    </template>
  </div>
</template>

<style scoped>
.classroom {
  width: 100%;
  padding-bottom: 60px;
}

/* 规则选择栏 */
.rules-bar {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.rules-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.rules-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  min-width: 70px;
}

.add-label {
  color: #67c23a;
}

.sub-label {
  color: #f56c6c;
}

.rules-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.no-rules {
  color: #c0c4cc;
  font-size: 13px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}

.action-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.hint-text {
  color: #909399;
}

/* 学生卡片网格 */
.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  min-height: 200px;
}

.student-card {
  background: #fff;
  border: 2px solid #ebeef5;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.student-card.active {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.2);
}

.student-card.active:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.3);
}

.student-card:not(.active):hover {
  border-color: #c6e2ff;
}

/* 宠物头像 */
.card-pet-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pet-emoji {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.pet-emoji.unassigned {
  filter: grayscale(1);
  opacity: 0.5;
}

/* 姓名 */
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

/* 宠物信息 */
.card-pet-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.card-pet-name {
  font-size: 12px;
  color: #606266;
}

.card-pet-name.unassigned {
  color: #c0c4cc;
}

.card-score {
  font-size: 14px;
  font-weight: 600;
  color: #e6a23c;
  margin-top: 2px;
}

/* 积分变化闪烁 */
.student-card.score-flash {
  animation: scoreFlash 0.6s ease;
}

@keyframes scoreFlash {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(103, 194, 58, 0.5); }
}

/* 升级动画 */
.student-card.level-up {
  animation: levelUpPulse 2s ease;
  border-color: #f56c6c !important;
  box-shadow: 0 0 24px rgba(245, 108, 108, 0.6) !important;
}

@keyframes levelUpPulse {
  0% { transform: scale(1); }
  20% { transform: scale(1.15); box-shadow: 0 0 30px rgba(245, 108, 108, 0.8); }
  40% { transform: scale(1.05); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.level-up-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.level-up-text {
  font-size: 28px;
  font-weight: 800;
  color: #f56c6c;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(245, 108, 108, 0.6);
  animation: levelUpText 2s ease;
}

@keyframes levelUpText {
  0% { opacity: 0; transform: scale(0.5); }
  20% { opacity: 1; transform: scale(1.2); }
  80% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
}

/* 随机点名高亮 */
.student-card.random-hit {
  border-color: #e6a23c !important;
  box-shadow: 0 0 20px rgba(230, 162, 60, 0.6) !important;
  transform: scale(1.08);
}

.student-card.random-rolling {
  border-color: #e6a23c !important;
  transition: all 0.05s;
}

/* 撤销栏 */
.undo-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #303133;
  color: #fff;
  padding: 10px 20px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.undo-hint {
  font-size: 14px;
}

.undo-hint strong {
  color: #f56c6c;
  font-size: 16px;
}

/* 撤销栏滑入动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 30px);
}
</style>
