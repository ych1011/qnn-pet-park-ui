<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { DisplayStudent } from '@/types/api'
import { getDisplayData } from '@/api/teacher'
import { getPetImage, getLevelName, getLevelColor } from '@/utils/pet'

const route = useRoute()
const classId = Number(route.params.classId)

// ============ 数据 ============
const students = ref<DisplayStudent[]>([])
const loading = ref(false)
const lastRefresh = ref<Date | null>(null)
const error = ref(false)

// 升级动画学生集合
const levelUpSet = ref<Set<number>>(new Set())

// 上一轮等级快照（用于检测升级）
const levelSnapshot = ref<Map<number, number>>(new Map())

// ============ 数据加载 ============
async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const data = await getDisplayData(classId)
    // 检测升级
    const newSnapshot = new Map<number, number>()
    for (const s of data) {
      const oldLevel = levelSnapshot.value.get(s.studentId)
      if (oldLevel !== undefined && s.currentLevel > oldLevel) {
        levelUpSet.value.add(s.studentId)
        // 2秒后移除动画标记
        setTimeout(() => {
          levelUpSet.value.delete(s.studentId)
        }, 2000)
      }
      newSnapshot.set(s.studentId, s.currentLevel)
    }
    levelSnapshot.value = newSnapshot
    students.value = data
    lastRefresh.value = new Date()
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// 格式化刷新时间
const refreshTimeText = computed(() => {
  if (!lastRefresh.value) return ''
  const h = String(lastRefresh.value.getHours()).padStart(2, '0')
  const m = String(lastRefresh.value.getMinutes()).padStart(2, '0')
  const s = String(lastRefresh.value.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})

// ============ 自动刷新（PRD 5.9 每30秒轮询） ============
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  fetchData()
  refreshTimer = setInterval(fetchData, 30000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

// 手动刷新
function handleManualRefresh() {
  fetchData()
}

// 全屏切换
const isFullscreen = ref(false)
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
    isFullscreen.value = true
  } else {
    document.exitFullscreen().catch(() => {})
    isFullscreen.value = false
  }
}
</script>

<template>
  <div class="display-page">
    <!-- 顶部栏 -->
    <div class="display-header">
      <h1 class="display-title">🐾 QNN宠物乐园</h1>
      <div class="header-right">
        <span v-if="refreshTimeText" class="refresh-time">
          更新于 {{ refreshTimeText }}
        </span>
        <el-button text @click="handleManualRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button text @click="toggleFullscreen">
          <el-icon><FullScreen /></el-icon>
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-if="error && students.length === 0" class="display-error">
      <el-empty description="数据加载失败，30秒后自动重试">
        <el-button @click="handleManualRefresh">立即重试</el-button>
      </el-empty>
    </div>

    <!-- 宠物卡片网格 -->
    <div v-else class="display-grid" v-loading="loading && students.length === 0">
      <div
        v-for="s in students"
        :key="s.studentId"
        class="pet-card"
        :class="{ 'level-up': levelUpSet.has(s.studentId) }"
        :style="{ '--card-color': getLevelColor(s.currentLevel) }"
      >
        <!-- 宠物形象 -->
        <div class="card-avatar" :style="{ background: getLevelColor(s.currentLevel) }">
          <img :src="getPetImage(s.petTypeCode, s.currentLevel)" class="card-emoji pet-anim-large" alt="宠物" />
        </div>

        <!-- 学生姓名 -->
        <div class="card-student-name">{{ s.studentName }}</div>

        <!-- 宠物名 -->
        <div class="card-pet-name">
          {{ s.customName || s.petTypeName || '宠物' }}
        </div>

        <!-- 等级标签 -->
        <div class="card-level">
          <span class="level-badge" :style="{ background: getLevelColor(s.currentLevel) }">
            Lv.{{ s.currentLevel }} {{ getLevelName(s.currentLevel) }}
          </span>
        </div>

        <!-- 积分 -->
        <div class="card-score">{{ s.currentScore }} 分</div>

        <!-- 升级特效 -->
        <div v-if="levelUpSet.has(s.studentId)" class="level-up-flash">
          <span class="flash-text">升级！</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && students.length === 0" class="empty-state">
        <el-empty description="暂无学生数据" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.display-page {
  height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #e0f7fa, #e8f5e9);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部栏 */
.display-header {
  padding: 20px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.display-title {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  color: #2c3e50;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.refresh-time {
  font-size: 15px;
  color: #7f8c8d;
}

/* 网格布局 */
.display-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 0 40px 40px;
  overflow-y: auto;
  align-content: start;
}

/* 宠物卡片 */
.pet-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px 16px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s;
  border: 3px solid var(--card-color, #ebeef5);
}

.pet-card:hover {
  transform: translateY(-4px);
}

/* 宠物头像 */
.card-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-emoji {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

/* 学生名 */
.card-student-name {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

/* 宠物名 */
.card-pet-name {
  font-size: 16px;
  color: #606266;
  margin-bottom: 8px;
}

/* 等级标签 */
.card-level {
  margin-bottom: 8px;
}

.level-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

/* 积分 */
.card-score {
  font-size: 22px;
  font-weight: 800;
  color: #e6a23c;
}

/* 升级动画 */
.pet-card.level-up {
  animation: levelUpPulse 2s ease;
}

@keyframes levelUpPulse {
  0% { transform: scale(1); }
  20% { transform: scale(1.15); box-shadow: 0 0 40px rgba(245, 108, 108, 0.8); }
  40% { transform: scale(1.05); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.level-up-flash {
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

.flash-text {
  font-size: 42px;
  font-weight: 800;
  color: #f56c6c;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(245, 108, 108, 0.6);
  animation: flashAnim 2s ease;
}

@keyframes flashAnim {
  0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
  20% { opacity: 1; transform: scale(1.3) rotate(5deg); }
  80% { opacity: 1; transform: scale(1) rotate(0); }
  100% { opacity: 0; transform: scale(1); }
}

/* 空状态 */
.display-error,
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
</style>
