<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { Student, CreateStudentRequest } from '@/types/api'
import { useClassStore } from '@/stores/class'
import { getStudentList, createStudent, updateStudent, deleteStudent } from '@/api/teacher'

const router = useRouter()
const classStore = useClassStore()

// ============ 列表数据 ============
const list = ref<Student[]>([])
const loading = ref(false)
const keyword = ref('')

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter((s) => s.name.toLowerCase().includes(kw))
})

const hasClass = computed(() => !!classStore.currentClass)

// 拉取学生列表
async function fetchList() {
  // 先确保拿到班级信息，单独 try/catch，避免后端不可用时 mounted hook 抛未处理错误
  if (!classStore.currentClass) {
    try {
      await classStore.fetchCurrentClass()
    } catch {
      // 拦截器已提示，保持 currentClass 为 null，模板将进入“去创建班级”分支
    }
  }
  if (!classStore.currentClass) return
  loading.value = true
  try {
    list.value = await getStudentList(classStore.currentClass.id)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// ============ 添加 / 编辑 学生 ============
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const editingId = ref<number>(0)

const form = reactive<CreateStudentRequest>({
  name: '',
  sortOrder: 0,
})

const formRules: FormRules<CreateStudentRequest> = {
  name: [
    { required: true, message: '请输入学生姓名', trigger: 'blur' },
    { max: 50, message: '姓名最长50个字符', trigger: 'blur' },
  ],
}

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '添加学生' : '编辑学生'))

function openAddDialog() {
  dialogMode.value = 'add'
  form.name = ''
  form.sortOrder = list.value.length + 1
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate(), 0)
}

function openEditDialog(row: Student) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.name = row.name
  form.sortOrder = row.sortOrder
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate(), 0)
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'add') {
      await createStudent({ ...form })
      ElMessage.success('学生添加成功')
    } else {
      await updateStudent(editingId.value, { ...form })
      ElMessage.success('学生信息已更新')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

// ============ 删除学生 ============
async function handleDelete(row: Student) {
  const hasPet = !!row.pet
  const tip = hasPet
    ? '该学生已有宠物，删除将同时删除宠物和积分记录，且无法恢复。'
    : '删除后无法恢复，确定删除吗？'
  try {
    await ElMessageBox.confirm(`${tip}确定删除「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return // 取消
  }
  try {
    await deleteStudent(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    // 拦截器已提示
  }
}

// ============ 跳转学生详情 ============
function goDetail(row: Student) {
  router.push({ name: 'StudentDetail', params: { id: row.id } })
}

// ============ 宠物等级名称（PRD 5.5） ============
const levelNames = ['', '蛋', '幼崽', '成长', '成熟', '传说']
const levelColors = ['', '#909399', '#e6a23c', '#67c23a', '#409eff', '#f56c6c']

function getLevelName(level: number): string {
  return levelNames[level] ?? '未知'
}

function getLevelColor(level: number): string {
  return levelColors[level] ?? '#909399'
}
</script>

<template>
  <div class="student-list">
    <!-- 无班级引导 -->
    <el-empty v-if="!hasClass && !loading" description="请先创建班级">
      <el-button type="primary" @click="router.push('/teacher/class/create')">
        去创建班级
      </el-button>
    </el-empty>

    <template v-else>
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="keyword"
            placeholder="搜索学生姓名"
            clearable
            style="width: 220px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <span class="student-count">共 {{ filteredList.length }} 名学生</span>
        </div>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          添加学生
        </el-button>
      </div>

      <!-- 学生卡片网格 -->
      <div v-loading="loading" class="card-grid">
        <el-empty
          v-if="!loading && filteredList.length === 0"
          description="还没有学生，点击右上角添加"
        />

        <div
          v-for="student in filteredList"
          :key="student.id"
          class="student-card"
          @click="goDetail(student)"
        >
          <!-- 卡片头部：姓名 + 操作 -->
          <div class="card-header">
            <span class="student-name">{{ student.name }}</span>
            <div class="card-actions" @click.stop>
              <el-button text size="small" @click="openEditDialog(student)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text size="small" type="danger" @click="handleDelete(student)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 宠物信息区 -->
          <div class="card-body">
            <template v-if="student.pet">
              <div class="pet-avatar" :style="{ background: getLevelColor(student.pet.currentLevel) }">
                <span class="pet-emoji">🐾</span>
              </div>
              <div class="pet-info">
                <div class="pet-name">
                  {{ student.pet.customName || student.pet.petType?.name || '宠物' }}
                </div>
                <div class="pet-stats">
                  <el-tag size="small" :color="getLevelColor(student.pet.currentLevel)" effect="dark" round>
                    Lv.{{ student.pet.currentLevel }} {{ getLevelName(student.pet.currentLevel) }}
                  </el-tag>
                  <span class="pet-score">{{ student.pet.currentScore }} 分</span>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="pet-avatar unassigned">
                <el-icon size="24" color="#c0c4cc"><QuestionFilled /></el-icon>
              </div>
              <div class="pet-info">
                <div class="pet-name unassigned-text">未分配宠物</div>
                <el-button
                  text
                  size="small"
                  type="primary"
                  @click.stop="goDetail(student)"
                >
                  去分配 →
                </el-button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 添加 / 编辑 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="420px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入学生姓名"
            maxlength="50"
            clearable
            @keydown.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item label="排序号" prop="sortOrder">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="999"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-list {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-count {
  color: #909399;
  font-size: 13px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.student-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.student-card:hover {
  border-color: #4e8df5;
  box-shadow: 0 4px 16px rgba(78, 141, 245, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f7fa;
}

.student-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-actions {
  display: flex;
  gap: 2px;
}

.card-body {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pet-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #4e8df5;
}

.pet-avatar.unassigned {
  background: #f5f7fa;
  border: 2px dashed #dcdfe6;
}

.pet-emoji {
  font-size: 24px;
}

.pet-info {
  flex: 1;
  min-width: 0;
}

.pet-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.pet-name.unassigned-text {
  color: #c0c4cc;
  font-weight: normal;
}

.pet-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pet-score {
  font-size: 13px;
  color: #606266;
  font-weight: 600;
}
</style>
