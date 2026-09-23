<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { UpdateClassRequest } from '@/types/api'
import { useClassStore } from '@/stores/class'
import { updateClass } from '@/api/teacher'

const router = useRouter()
const classStore = useClassStore()

const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<UpdateClassRequest>({
  name: '',
  grade: '',
  semester: '',
})

// 年级选项（PRD 1.2：小学1-3年级）
const gradeOptions = [
  { label: '一年级', value: '一年级' },
  { label: '二年级', value: '二年级' },
  { label: '三年级', value: '三年级' },
]

// 学期选项
const semesterOptions = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const isFall = month >= 8 || month <= 2
  const curTerm = isFall ? `${year}秋季` : `${year}春季`
  const nextTerm = isFall ? `${year + 1}春季` : `${year}秋季`
  return [
    { label: curTerm, value: curTerm },
    { label: nextTerm, value: nextTerm },
  ]
})()

const rules: FormRules<UpdateClassRequest> = {
  name: [
    { required: true, message: '请输入班级名称', trigger: 'blur' },
    { max: 100, message: '班级名称最长100个字符', trigger: 'blur' },
  ],
  grade: [{ max: 20, message: '年级最长20个字符', trigger: 'blur' }],
  semester: [{ max: 20, message: '学期最长20个字符', trigger: 'blur' }],
}

const hasClass = ref(false)

async function init() {
  loading.value = true
  if (!classStore.currentClass) {
    try {
      await classStore.fetchCurrentClass()
    } catch {
      // 后端不可用，拦截器已提示
    }
  }
  if (classStore.currentClass) {
    hasClass.value = true
    form.name = classStore.currentClass.name
    form.grade = classStore.currentClass.grade ?? ''
    form.semester = classStore.currentClass.semester ?? ''
  }
  loading.value = false
}

onMounted(init)

async function handleSubmit() {
  if (!formRef.value || !classStore.currentClass) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    await updateClass(classStore.currentClass.id, { ...form })
    // 更新 store 中的班级信息
    classStore.currentClass.name = form.name!
    classStore.currentClass.grade = form.grade ?? null
    classStore.currentClass.semester = form.semester ?? null
    ElMessage.success('班级信息已更新')
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

async function handleReset() {
  try {
    await ElMessageBox.confirm('确定要重置表单为当前班级信息吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })
  } catch {
    return
  }
  if (classStore.currentClass) {
    form.name = classStore.currentClass.name
    form.grade = classStore.currentClass.grade ?? ''
    form.semester = classStore.currentClass.semester ?? ''
    ElMessage.info('表单已重置')
  }
}
</script>

<template>
  <div class="class-settings" v-loading="loading">
    <!-- 无班级引导 -->
    <el-empty v-if="!hasClass && !loading" description="您还没有创建班级">
      <el-button type="primary" @click="router.push('/teacher/class/create')">
        去创建班级
      </el-button>
    </el-empty>

    <template v-else-if="hasClass">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-title">
            <el-icon><Setting /></el-icon>
            <span>班级信息</span>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          style="max-width: 500px"
          @submit.prevent
        >
          <el-form-item label="班级名称" prop="name">
            <el-input
              v-model="form.name"
              placeholder="如：一年级二班"
              maxlength="100"
              clearable
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="年级" prop="grade">
            <el-select v-model="form.grade" placeholder="请选择年级" clearable style="width: 100%">
              <el-option
                v-for="opt in gradeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="学期" prop="semester">
            <el-select v-model="form.semester" placeholder="请选择学期" clearable style="width: 100%">
              <el-option
                v-for="opt in semesterOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              保存修改
            </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 班级信息预览 -->
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="card-title">
            <el-icon><InfoFilled /></el-icon>
            <span>当前班级信息</span>
          </div>
        </template>
        <div class="info-row">
          <span class="info-label">班级名称</span>
          <span class="info-value">{{ classStore.currentClass?.name }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">年级</span>
          <span class="info-value">{{ classStore.currentClass?.grade || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">学期</span>
          <span class="info-value">{{ classStore.currentClass?.semester || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">学生人数</span>
          <span class="info-value">{{ classStore.students.length }} 人</span>
        </div>
      </el-card>
    </template>

    <el-empty v-else-if="!loading" description="数据加载失败，请检查后端服务" />
  </div>
</template>

<style scoped>
.class-settings {
  width: 100%;
}

.settings-card,
.preview-card {
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

.info-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f7fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  width: 100px;
  color: #909399;
  font-size: 14px;
}

.info-value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}
</style>
