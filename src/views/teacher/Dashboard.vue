<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClassStore } from '@/stores/class'
import { getRuleList } from '@/api/teacher'
import type { ScoreRule } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const classStore = useClassStore()

const loading = ref(false)
const rules = ref<ScoreRule[]>([])
const today = new Date()

// 日期格式化
const dateText = computed(() => {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const week = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()]
  return `${y}年${m}月${d}日 星期${week}`
})

const hasClass = computed(() => !!classStore.currentClass)

// 统计数据
const studentCount = computed(() => classStore.students.length)
const petCount = computed(() => classStore.students.filter((s) => s.pet).length)
const addRuleCount = computed(() => rules.value.filter((r) => r.type === 'add' && r.status === 1).length)
const subRuleCount = computed(() => rules.value.filter((r) => r.type === 'subtract' && r.status === 1).length)

// 快捷入口
const shortcuts = [
  { title: '课堂操作', desc: '加减分 · 随机点名', icon: 'EditPen', route: '/teacher/classroom', color: '#409eff' },
  { title: '学生管理', desc: '添加 · 编辑 · 宠物', icon: 'User', route: '/teacher/students', color: '#67c23a' },
  { title: '积分规则', desc: '配置加减分规则', icon: 'Document', route: '/teacher/rules', color: '#e6a23c' },
  { title: '积分排行', desc: '排行榜 · 积分历史', icon: 'Trophy', route: '/teacher/ranking', color: '#f56c6c' },
  { title: '班级设置', desc: '编辑班级信息', icon: 'Setting', route: '/teacher/class/settings', color: '#909399' },
  { title: '课堂大屏', desc: '全屏宠物展示', icon: 'Monitor', route: '', color: '#9b59b6', isDisplay: true },
]

function goShortcut(s: typeof shortcuts[0]) {
  if (s.isDisplay) {
    if (!classStore.currentClass) return
    const routeData = router.resolve({ name: 'DisplayBoard', params: { classId: classStore.currentClass.id } })
    window.open(routeData.href, '_blank')
  } else {
    router.push(s.route)
  }
}

// 加载数据
async function init() {
  loading.value = true
  // 确保有班级信息
  if (!classStore.currentClass) {
    try {
      await classStore.fetchCurrentClass()
    } catch {
      // 后端不可用，拦截器已提示
    }
  }
  // 有班级则拉取学生和规则
  if (classStore.currentClass) {
    try {
      await classStore.fetchStudents()
    } catch {
      // 拦截器已提示
    }
    try {
      rules.value = await getRuleList(classStore.currentClass.id)
    } catch {
      // 拦截器已提示
    }
  }
  loading.value = false
}

onMounted(init)
</script>

<template>
  <div class="dashboard" v-loading="loading">
    <!-- 欢迎头部 -->
    <div class="welcome-card">
      <div class="welcome-left">
        <h2 class="welcome-title">{{ auth.realName || '老师' }}，你好！</h2>
        <p class="welcome-date">{{ dateText }}</p>
      </div>
      <div class="welcome-emoji">🐾</div>
    </div>

    <!-- 无班级引导 -->
    <el-card v-if="!hasClass && !loading" shadow="never" class="guide-card">
      <el-empty description="您还没有创建班级，先创建班级开始使用吧">
        <el-button type="primary" size="large" @click="router.push('/teacher/class/create')">
          <el-icon><Plus /></el-icon>
          创建班级
        </el-button>
      </el-empty>
    </el-card>

    <template v-else-if="hasClass">
      <!-- 班级信息卡 -->
      <el-card shadow="never" class="info-card">
        <div class="class-info">
          <div class="class-icon">🏫</div>
          <div class="class-meta">
            <h3 class="class-name">{{ classStore.currentClass?.name }}</h3>
            <div class="class-tags">
              <el-tag v-if="classStore.currentClass?.grade" size="small">
                {{ classStore.currentClass.grade }}
              </el-tag>
              <el-tag v-if="classStore.currentClass?.semester" size="small" type="info">
                {{ classStore.currentClass.semester }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card stat-students">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-num">{{ studentCount }}</div>
            <div class="stat-label">学生总数</div>
          </div>
        </div>
        <div class="stat-card stat-pets">
          <div class="stat-icon">🐾</div>
          <div class="stat-content">
            <div class="stat-num">{{ petCount }}</div>
            <div class="stat-label">已分配宠物</div>
          </div>
        </div>
        <div class="stat-card stat-add">
          <div class="stat-icon">➕</div>
          <div class="stat-content">
            <div class="stat-num">{{ addRuleCount }}</div>
            <div class="stat-label">加分规则</div>
          </div>
        </div>
        <div class="stat-card stat-sub">
          <div class="stat-icon">➖</div>
          <div class="stat-content">
            <div class="stat-num">{{ subRuleCount }}</div>
            <div class="stat-label">扣分规则</div>
          </div>
        </div>
      </div>

      <!-- 快捷入口 -->
      <div class="section-title">快捷入口</div>
      <div class="shortcut-grid">
        <div
          v-for="s in shortcuts"
          :key="s.title"
          class="shortcut-card"
          @click="goShortcut(s)"
        >
          <div class="shortcut-icon" :style="{ background: s.color }">
            <el-icon size="24"><component :is="s.icon" /></el-icon>
          </div>
          <div class="shortcut-text">
            <div class="shortcut-title">{{ s.title }}</div>
            <div class="shortcut-desc">{{ s.desc }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 无班级且加载中 -->
    <el-empty v-else-if="!loading" description="数据加载失败，请检查后端服务" />
  </div>
</template>

<style scoped>
.dashboard {
  width: 100%;
}

/* 欢迎卡 */
.welcome-card {
  background: linear-gradient(135deg, #409eff, #67c23a);
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
}

.welcome-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.welcome-date {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.welcome-emoji {
  font-size: 48px;
}

/* 引导卡 */
.guide-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

/* 班级信息卡 */
.info-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.class-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.class-icon {
  font-size: 40px;
}

.class-meta {
  flex: 1;
}

.class-name {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.class-tags {
  display: flex;
  gap: 8px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 32px;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.stat-students .stat-icon { background: #ecf5ff; }
.stat-pets .stat-icon { background: #f0f9eb; }
.stat-add .stat-icon { background: #fef0f0; }
.stat-sub .stat-icon { background: #fdf6ec; }

.stat-num {
  font-size: 28px;
  font-weight: 800;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

/* 快捷入口 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.shortcut-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.shortcut-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.shortcut-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.shortcut-desc {
  font-size: 12px;
  color: #909399;
}
</style>
