<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { RankingItem, ScoreLog } from '@/types/api'
import { useClassStore } from '@/stores/class'
import { getRanking, getScoreLogs } from '@/api/teacher'
import { getPetImage, getLevelColor } from '@/utils/pet'

const router = useRouter()
const classStore = useClassStore()

// ============ 排行榜数据 ============
const ranking = ref<RankingItem[]>([])
const loading = ref(false)

const hasClass = computed(() => !!classStore.currentClass)

// 前三名 + 其余
const top3 = computed(() => ranking.value.slice(0, 3))
const restList = computed(() => ranking.value.slice(3))

// 宠物辅助函数来自 @/utils/pet

// 前三名样式
const podiumStyles = [
  { medal: '🥇', color: '#ffd700', bg: 'linear-gradient(135deg, #fff9e6, #fff3bf)' },
  { medal: '🥈', color: '#c0c0c0', bg: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)' },
  { medal: '🥉', color: '#cd7f32', bg: 'linear-gradient(135deg, #fdf0e6, #fde0c8)' },
]

// ============ 积分历史 ============
const selectedStudentId = ref<number>(0)
const logs = ref<ScoreLog[]>([])
const logTotal = ref(0)
const logPage = ref(1)
const logSize = ref(10)
const logLoading = ref(false)

// 下拉选学生（从排行榜列表）
const studentOptions = computed(() =>
  ranking.value.map((r) => ({ value: r.studentId, label: r.studentName })),
)

async function fetchLogs() {
  if (!selectedStudentId.value) {
    logs.value = []
    logTotal.value = 0
    return
  }
  logLoading.value = true
  try {
    const page = await getScoreLogs(selectedStudentId.value, logPage.value, logSize.value)
    logs.value = page.records
    logTotal.value = page.total
  } catch {
    // 拦截器已提示
  } finally {
    logLoading.value = false
  }
}

function handleStudentChange() {
  logPage.value = 1
  fetchLogs()
}

function handlePageChange(p: number) {
  logPage.value = p
  fetchLogs()
}

function scoreTagType(type: string) {
  return type === 'add' ? 'success' : 'danger'
}
function scoreSign(log: ScoreLog) {
  return log.type === 'add' ? `+${log.score}` : `-${log.score}`
}

// ============ 加载排行榜 ============
async function fetchRanking() {
  if (!classStore.currentClass) {
    try {
      await classStore.fetchCurrentClass()
    } catch {
      // 拦截器已提示
    }
  }
  if (!classStore.currentClass) return
  loading.value = true
  try {
    ranking.value = await getRanking(classStore.currentClass.id)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

onMounted(fetchRanking)

// 跳转学生详情
function goDetail(studentId: number) {
  router.push(`/teacher/students/${studentId}`)
}
</script>

<template>
  <div class="ranking-page">
    <!-- 无班级引导 -->
    <el-empty v-if="!hasClass && !loading" description="请先创建班级">
      <el-button type="primary" @click="router.push('/teacher/class/create')">
        去创建班级
      </el-button>
    </el-empty>

    <template v-else-if="hasClass">
      <!-- 排行榜 -->
      <div v-loading="loading">
        <el-empty
          v-if="!loading && ranking.length === 0"
          description="还没有学生数据，去添加学生"
        >
          <el-button @click="router.push('/teacher/students')">去添加学生</el-button>
        </el-empty>

        <template v-else>
          <!-- 前三名领奖台 -->
          <div v-if="top3.length > 0" class="podium">
            <div
              v-for="(item, idx) in top3"
              :key="item.studentId"
              class="podium-card"
              :style="{ background: podiumStyles[idx].bg }"
              @click="goDetail(item.studentId)"
            >
              <div class="podium-medal">{{ podiumStyles[idx].medal }}</div>
              <div
                class="podium-avatar"
                :style="{ background: getLevelColor(item.currentLevel) }"
              >
                <img :src="getPetImage(item.petTypeCode, item.currentLevel)" class="podium-emoji pet-anim-wobble" alt="宠物" />
              </div>
              <div class="podium-name">{{ item.studentName }}</div>
              <div class="podium-pet">{{ item.customName || item.petTypeName || '宠物' }}</div>
              <div class="podium-level">
                <span class="level-tag" :style="{ background: getLevelColor(item.currentLevel) }">
                  Lv.{{ item.currentLevel }} {{ item.levelName }}
                </span>
              </div>
              <div class="podium-score" :style="{ color: podiumStyles[idx].color }">
                {{ item.currentScore }} 分
              </div>
            </div>
          </div>

          <!-- 完整排行表 -->
          <el-card shadow="never" class="ranking-table-card">
            <template #header>
              <div class="card-title">
                <el-icon><Trophy /></el-icon>
                <span>完整排行</span>
              </div>
            </template>
            <el-table :data="ranking" stripe style="width: 100%">
              <el-table-column label="排名" width="80" align="center">
                <template #default="{ row }">
                  <span class="rank-num" :class="{ 'rank-top': row.rank <= 3 }">
                    {{ row.rank }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="宠物" width="70" align="center">
                <template #default="{ row }">
                  <img :src="getPetImage(row.petTypeCode, row.currentLevel)" class="table-emoji pet-anim" alt="宠物" />
                </template>
              </el-table-column>
              <el-table-column label="学生" prop="studentName" min-width="120" />
              <el-table-column label="宠物名" min-width="120">
                <template #default="{ row }">
                  {{ row.customName || row.petTypeName || '—' }}
                </template>
              </el-table-column>
              <el-table-column label="等级" width="120">
                <template #default="{ row }">
                  <span class="level-tag" :style="{ background: getLevelColor(row.currentLevel) }">
                    Lv.{{ row.currentLevel }} {{ row.levelName }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="累计积分" width="120" align="right">
                <template #default="{ row }">
                  <span class="score-num">{{ row.currentScore }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100" fixed="right">
                <template #default="{ row }">
                  <el-button text size="small" type="primary" @click="goDetail(row.studentId)">
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </template>
      </div>

      <!-- 积分历史 -->
      <el-card shadow="never" class="history-card">
        <template #header>
          <div class="card-title">
            <el-icon><List /></el-icon>
            <span>积分历史</span>
            <el-select
              v-model="selectedStudentId"
              placeholder="选择学生查看记录"
              clearable
              filterable
              style="width: 200px; margin-left: 16px"
              @change="handleStudentChange"
            >
              <el-option
                v-for="opt in studentOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </div>
        </template>

        <el-table :data="logs" v-loading="logLoading" stripe style="width: 100%">
          <el-table-column label="时间" prop="createdAt" width="180" />
          <el-table-column label="规则" prop="ruleName" min-width="140" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">
              <el-tag :type="scoreTagType(row.type)" size="small">
                {{ row.type === 'add' ? '加分' : '扣分' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分值" width="100">
            <template #default="{ row }">
              <span :class="row.type === 'add' ? 'score-add' : 'score-sub'">
                {{ scoreSign(row) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="备注" prop="remark" min-width="160" show-overflow-tooltip />
        </el-table>

        <div class="pagination-wrap" v-if="logTotal > logSize">
          <el-pagination
            layout="prev, pager, next, total"
            :total="logTotal"
            :page-size="logSize"
            :current-page="logPage"
            @current-change="handlePageChange"
            background
          />
        </div>

        <el-empty
          v-if="!logLoading && !selectedStudentId"
          description="请先选择一名学生查看积分历史"
        />
        <el-empty
          v-else-if="!logLoading && logs.length === 0"
          description="该学生还没有积分记录"
        />
      </el-card>
    </template>

    <el-empty v-else-if="!loading" description="数据加载失败，请检查后端服务" />
  </div>
</template>

<style scoped>
.ranking-page {
  width: 100%;
}

/* 领奖台 */
.podium {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.podium-card {
  width: 220px;
  border-radius: 16px;
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
}

.podium-card:hover {
  transform: translateY(-4px);
}

.podium-medal {
  font-size: 36px;
  margin-bottom: 8px;
}

.podium-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.podium-emoji {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.podium-name {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 2px;
}

.podium-pet {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.podium-level {
  margin-bottom: 8px;
}

.podium-score {
  font-size: 22px;
  font-weight: 800;
}

.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 16px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* 排行表 */
.ranking-table-card,
.history-card {
  border-radius: 12px;
  margin-bottom: 16px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #303133;
}

.rank-num {
  font-size: 16px;
  font-weight: 700;
  color: #909399;
}

.rank-num.rank-top {
  color: #e6a23c;
  font-size: 18px;
}

.table-emoji {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.score-num {
  font-size: 16px;
  font-weight: 700;
  color: #e6a23c;
}

/* 积分历史 */
.score-add {
  color: #67c23a;
  font-weight: 600;
}

.score-sub {
  color: #f56c6c;
  font-weight: 600;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
