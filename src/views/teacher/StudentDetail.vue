<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type {
  Student,
  Pet,
  PetType,
  ScoreLog,
  AssignPetRequest,
} from '@/types/api'
import { useClassStore } from '@/stores/class'
import {
  getStudentList,
  updateStudent,
  getStudentPet,
  getPetTypeList,
  assignPet,
  updatePet,
  getScoreLogs,
} from '@/api/teacher'

const route = useRoute()
const router = useRouter()
const classStore = useClassStore()

// 路由参数：学生 ID
const studentId = Number(route.params.id)

// ============ 学生基本信息 ============
const student = ref<Student | null>(null)
const loading = ref(false)

// 改名弹窗
const renameVisible = ref(false)
const renameRef = ref<FormInstance>()
const renameForm = reactive({ name: '' })
const renameRules: FormRules<{ name: string }> = {
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' },
    { max: 50, message: '姓名最长50个字符', trigger: 'blur' },
  ],
}
const renaming = ref(false)

function openRename() {
  renameForm.name = student.value?.name ?? ''
  renameVisible.value = true
  setTimeout(() => renameRef.value?.clearValidate(), 0)
}

async function handleRename() {
  if (!renameRef.value) return
  try {
    await renameRef.value.validate()
  } catch {
    return
  }
  renaming.value = true
  try {
    await updateStudent(studentId, { name: renameForm.name })
    if (student.value) student.value.name = renameForm.name
    ElMessage.success('姓名已更新')
    renameVisible.value = false
  } catch {
    // 拦截器已提示
  } finally {
    renaming.value = false
  }
}

// ============ 宠物信息 ============
const pet = ref<Pet | null>(null)
const petLoading = ref(false)

// 宠物等级名称（PRD 5.5）
const levelNames = ['', '蛋', '幼崽', '成长', '成熟', '传说']
const levelColors = ['', '#909399', '#e6a23c', '#67c23a', '#409eff', '#f56c6c']

function getLevelName(level: number): string {
  return levelNames[level] ?? '未知'
}
function getLevelColor(level: number): string {
  return levelColors[level] ?? '#909399'
}

// 宠物类型 emoji 占位（PRD 5.5 六种宠物，图片素材由后端提供）
const petTypeEmojis: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  panda: '🐼',
  penguin: '🐧',
  dragon: '🐲',
}

function getPetEmoji(code?: string): string {
  return petTypeEmojis[code ?? ''] ?? '🐾'
}

// 分配 / 更换宠物弹窗
const petDialogVisible = ref(false)
const petDialogMode = ref<'assign' | 'change'>('assign')
const petTypes = ref<PetType[]>([])
const selectedPetTypeId = ref<number>(0)
const customName = ref('')
const petSubmitting = ref(false)

// 弹窗标题：有宠物显示"更换宠物"，无宠物显示"分配宠物"
const petDialogTitle = computed(() => (pet.value ? '更换宠物' : '分配宠物'))

async function openPetDialog() {
  petDialogMode.value = pet.value ? 'change' : 'assign'
  selectedPetTypeId.value = 0
  customName.value = ''
  petDialogVisible.value = true
  // 拉取宠物类型列表
  if (petTypes.value.length === 0) {
    try {
      petTypes.value = await getPetTypeList()
    } catch {
      // 拦截器已提示
    }
  }
}

async function handlePetSubmit() {
  if (!selectedPetTypeId.value) {
    ElMessage.warning('请先选择一种宠物')
    return
  }
  // 更换宠物需二次确认（PRD 5.5 异常处理）
  if (pet.value) {
    try {
      await ElMessageBox.confirm(
        '更换后当前积分保留，但宠物形态会变回新宠物的蛋。确定更换吗？',
        '更换宠物确认',
        {
          confirmButtonText: '确定更换',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } catch {
      return // 取消
    }
  }
  petSubmitting.value = true
  try {
    if (pet.value) {
      // 更换宠物：调 updatePet
      const updated = await updatePet(pet.value.id, {
        petTypeId: selectedPetTypeId.value,
        customName: customName.value || undefined,
      })
      pet.value = updated
      ElMessage.success('宠物已更换')
    } else {
      // 分配宠物：调 assignPet
      const payload: AssignPetRequest = {
        studentId,
        petTypeId: selectedPetTypeId.value,
        customName: customName.value || undefined,
      }
      pet.value = await assignPet(payload)
      ElMessage.success('宠物分配成功')
    }
    petDialogVisible.value = false
  } catch {
    // 拦截器已提示
  } finally {
    petSubmitting.value = false
  }
}

// 给宠物改名（单独入口，不换类型）
const petRenameVisible = ref(false)
const petRenameForm = ref('')
const petRenaming = ref(false)

function openPetRename() {
  petRenameForm.value = pet.value?.customName ?? ''
  petRenameVisible.value = true
}

async function handlePetRename() {
  if (!pet.value) return
  petRenaming.value = true
  try {
    const updated = await updatePet(pet.value.id, { customName: petRenameForm.value || undefined })
    pet.value = updated
    ElMessage.success('宠物名字已更新')
    petRenameVisible.value = false
  } catch {
    // 拦截器已提示
  } finally {
    petRenaming.value = false
  }
}

// ============ 积分历史 ============
const logs = ref<ScoreLog[]>([])
const logTotal = ref(0)
const logPage = ref(1)
const logSize = ref(10)
const logLoading = ref(false)

async function fetchLogs() {
  logLoading.value = true
  try {
    const page = await getScoreLogs(studentId, logPage.value, logSize.value)
    logs.value = page.records
    logTotal.value = page.total
  } catch {
    // 拦截器已提示
  } finally {
    logLoading.value = false
  }
}

function handlePageChange(p: number) {
  logPage.value = p
  fetchLogs()
}

// 积分类型颜色 / 符号
function scoreTagType(type: string) {
  return type === 'add' ? 'success' : 'danger'
}
function scoreSign(log: ScoreLog) {
  return log.type === 'add' ? `+${log.score}` : `-${log.score}`
}

// ============ 初始化加载 ============
async function loadStudent() {
  // 先尝试从 classStore.students 找，没有则拉取班级学生列表
  let found: Student | undefined = classStore.students.find((s) => s.id === studentId)
  if (!found) {
    // 确保有班级
    if (!classStore.currentClass) {
      try {
        await classStore.fetchCurrentClass()
      } catch {
        // 后端不可用，拦截器已提示
      }
    }
    if (classStore.currentClass) {
      try {
        const list = await getStudentList(classStore.currentClass.id)
        classStore.students = list
        found = list.find((s) => s.id === studentId)
      } catch {
        // 拦截器已提示
      }
    }
  }
  student.value = found ?? null
}

async function loadPet() {
  petLoading.value = true
  try {
    pet.value = await getStudentPet(studentId)
  } catch {
    // 拦截器已提示
  } finally {
    petLoading.value = false
  }
}

async function init() {
  loading.value = true
  try {
    await Promise.all([loadStudent(), loadPet()])
  } finally {
    loading.value = false
  }
  // 积分历史单独加载，不阻塞页面
  fetchLogs()
}

onMounted(init)
</script>

<template>
  <div class="student-detail" v-loading="loading">
    <!-- 顶部：返回 + 学生信息 -->
    <div class="page-header">
      <el-button text @click="router.push('/teacher/students')">
        <el-icon><ArrowLeft /></el-icon>
        返回学生列表
      </el-button>
    </div>

    <template v-if="student">
      <!-- 学生信息卡 -->
      <el-card class="info-card" shadow="never">
        <div class="student-header">
          <div class="student-avatar">{{ student.name.charAt(0) }}</div>
          <div class="student-meta">
            <h2 class="student-name">{{ student.name }}</h2>
            <span class="student-sub">排序号 {{ student.sortOrder }}</span>
          </div>
          <el-button plain @click="openRename">
            <el-icon><Edit /></el-icon>
            改名
          </el-button>
        </div>
      </el-card>

      <!-- 宠物信息卡 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-title">
            <el-icon><Star /></el-icon>
            <span>我的宠物</span>
          </div>
        </template>

        <div v-loading="petLoading" class="pet-section">
          <template v-if="pet">
            <div class="pet-display">
              <div class="pet-avatar-large" :style="{ background: getLevelColor(pet.currentLevel) }">
                <span class="pet-emoji-large">{{ getPetEmoji(pet.petType?.code) }}</span>
              </div>
              <div class="pet-detail">
                <div class="pet-custom-name">
                  {{ pet.customName || pet.petType?.name || '宠物' }}
                </div>
                <div class="pet-type-name">品种：{{ pet.petType?.name ?? '未知' }}</div>
                <div class="pet-badges">
                  <el-tag :color="getLevelColor(pet.currentLevel)" effect="dark" round>
                    Lv.{{ pet.currentLevel }} {{ getLevelName(pet.currentLevel) }}
                  </el-tag>
                  <span class="pet-score-num">{{ pet.currentScore }} 分</span>
                </div>
                <!-- 等级进度条 -->
                <div class="level-progress">
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      :style="{
                        width: `${Math.min(100, (pet.currentScore / 600) * 100)}%`,
                        background: getLevelColor(pet.currentLevel),
                      }"
                    ></div>
                  </div>
                  <span class="progress-hint">距下一级还需积分成长</span>
                </div>
              </div>
            </div>
            <div class="pet-actions">
              <el-button @click="openPetRename">
                <el-icon><EditPen /></el-icon>
                改宠物名
              </el-button>
              <el-button type="warning" plain @click="openPetDialog">
                <el-icon><Refresh /></el-icon>
                更换宠物
              </el-button>
            </div>
          </template>

          <template v-else-if="!petLoading">
            <el-empty description="该学生还没有宠物">
              <el-button type="primary" @click="openPetDialog">
                <el-icon><Plus /></el-icon>
                分配宠物
              </el-button>
            </el-empty>
          </template>
        </div>
      </el-card>

      <!-- 积分历史 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-title">
            <el-icon><List /></el-icon>
            <span>积分历史</span>
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
          v-if="!logLoading && logs.length === 0"
          description="还没有积分记录"
        />
      </el-card>
    </template>

    <!-- 学生未找到 -->
    <el-empty v-else-if="!loading" description="学生不存在或加载失败">
      <el-button @click="router.push('/teacher/students')">返回学生列表</el-button>
    </el-empty>

    <!-- 改名弹窗 -->
    <el-dialog
      v-model="renameVisible"
      title="修改学生姓名"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="renameRef"
        :model="renameForm"
        :rules="renameRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="renameForm.name"
            placeholder="请输入学生姓名"
            maxlength="50"
            clearable
            @keydown.enter="handleRename"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" :loading="renaming" @click="handleRename">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配 / 更换 宠物弹窗 -->
    <el-dialog
      v-model="petDialogVisible"
      :title="petDialogTitle"
      width="560px"
      :close-on-click-modal="false"
    >
      <div class="pet-picker">
        <div class="pet-picker-hint">选择一种宠物{{ pet ? '（更换后形态会变回蛋）' : '' }}</div>
        <div class="pet-type-grid">
          <div
            v-for="t in petTypes"
            :key="t.id"
            class="pet-type-card"
            :class="{ active: selectedPetTypeId === t.id }"
            @click="selectedPetTypeId = t.id"
          >
            <div class="pet-type-emoji">{{ getPetEmoji(t.code) }}</div>
            <div class="pet-type-name-text">{{ t.name }}</div>
          </div>
        </div>
        <el-form label-width="100px" class="pet-name-form" @submit.prevent>
          <el-form-item label="宠物名字">
            <el-input
              v-model="customName"
              placeholder="可选，给宠物起个名字"
              maxlength="30"
              clearable
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="petDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="petSubmitting"
          :disabled="!selectedPetTypeId"
          @click="handlePetSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 宠物改名弹窗 -->
    <el-dialog
      v-model="petRenameVisible"
      title="修改宠物名字"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px" @submit.prevent>
        <el-form-item label="宠物名字">
          <el-input
            v-model="petRenameForm"
            placeholder="输入新的宠物名字"
            maxlength="30"
            clearable
            @keydown.enter="handlePetRename"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="petRenameVisible = false">取消</el-button>
        <el-button type="primary" :loading="petRenaming" @click="handlePetRename">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-detail {
  width: 100%;
}

.page-header {
  margin-bottom: 12px;
}

.info-card {
  margin-bottom: 16px;
  border-radius: 12px;
}

/* 学生信息卡 */
.student-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.student-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.student-meta {
  flex: 1;
}

.student-name {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.student-sub {
  color: #909399;
  font-size: 13px;
}

/* 卡片标题 */
.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #303133;
}

/* 宠物展示 */
.pet-section {
  min-height: 120px;
}

.pet-display {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 16px;
}

.pet-avatar-large {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pet-emoji-large {
  font-size: 48px;
}

.pet-detail {
  flex: 1;
}

.pet-custom-name {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.pet-type-name {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.pet-badges {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.pet-score-num {
  font-size: 16px;
  font-weight: 600;
  color: #e6a23c;
}

.level-progress {
  max-width: 320px;
}

.progress-track {
  height: 8px;
  background: #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}

.progress-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #c0c4cc;
}

.pet-actions {
  display: flex;
  gap: 12px;
}

/* 积分历史表格 */
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

/* 宠物选择器 */
.pet-picker-hint {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.pet-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.pet-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  border: 2px solid #ebeef5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.pet-type-card:hover {
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.pet-type-card.active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.pet-type-emoji {
  font-size: 36px;
}

.pet-type-name-text {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.pet-name-form {
  margin-top: 8px;
}
</style>
