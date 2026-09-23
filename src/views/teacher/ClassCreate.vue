<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { CreateClassRequest } from '@/types/api'
import { createClass } from '@/api/teacher'
import { useClassStore } from '@/stores/class'

const router = useRouter()
const classStore = useClassStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive<CreateClassRequest>({
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

// 学期选项（当前 2026 年，推算近几个学期）
const semesterOptions = (() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  // 8月-2月为秋季学期，3月-7月为春季学期
  const isFall = month >= 8 || month <= 2
  const curTerm = isFall ? `${year}秋季` : `${year}春季`
  const nextTerm = isFall ? `${year + 1}春季` : `${year}秋季`
  return [
    { label: curTerm, value: curTerm },
    { label: nextTerm, value: nextTerm },
  ]
})()

const rules: FormRules<CreateClassRequest> = {
  name: [
    { required: true, message: '请输入班级名称', trigger: 'blur' },
    { max: 100, message: '班级名称最长100个字符', trigger: 'blur' },
  ],
  grade: [{ max: 20, message: '年级最长20个字符', trigger: 'blur' }],
  semester: [{ max: 20, message: '学期最长20个字符', trigger: 'blur' }],
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
    const classInfo = await createClass({ ...form })
    // 更新 store，其他页面无需再请求
    classStore.currentClass = classInfo
    ElMessage.success('班级创建成功，已为你生成默认积分规则')
    // PRD 5.3：创建成功 → 自动跳转到学生管理页面
    router.push('/teacher/students')
  } catch {
    // 拦截器已统一提示
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="class-create">
    <div class="create-card">
      <!-- 引导头部 -->
      <div class="create-header">
        <div class="header-icon">
          <el-icon size="40" color="#fff"><School /></el-icon>
        </div>
        <h1 class="title">欢迎使用 QNN 宠物乐园</h1>
        <p class="subtitle">
          还没有创建班级，先来创建你的班级吧。创建后即可添加学生、分配宠物、开始课堂积分。
        </p>
      </div>

      <!-- 班级表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
        size="large"
        @submit.prevent
      >
        <el-form-item label="班级名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="如：一年级二班"
            maxlength="100"
            clearable
          />
        </el-form-item>

        <el-form-item label="年级" prop="grade">
          <el-select
            v-model="form.grade"
            placeholder="请选择年级"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="opt in gradeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="学期" prop="semester">
          <el-select
            v-model="form.semester"
            placeholder="请选择学期"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="opt in semesterOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 默认规则提示 -->
      <div class="info-tip">
        <el-icon><InfoFilled /></el-icon>
        <div class="tip-text">
          <div class="tip-title">创建后将自动生成 10 条默认积分规则</div>
          <div class="tip-desc">
            包含「举手回答问题 +2」「回答正确 +3」「作业优秀 +5」等常见加减分规则，你可在「积分规则」页面随时修改。
          </div>
        </div>
      </div>

      <!-- 提交按钮 -->
      <el-button
        type="primary"
        size="large"
        class="submit-btn"
        :loading="submitting"
        @click="handleSubmit"
      >
        创建班级
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.class-create {
  min-height: calc(100vh - 92px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.create-card {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 40px 48px 36px;
}

.create-header {
  text-align: center;
  margin-bottom: 32px;
}

.header-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4e8df5, #6a5acd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

.info-tip {
  display: flex;
  gap: 10px;
  margin: 8px 0 24px;
  padding: 14px 16px;
  background: #f0f9ff;
  border: 1px solid #d0e8ff;
  border-radius: 8px;
}

.info-tip .el-icon {
  color: #4e8df5;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.tip-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.submit-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 4px;
}
</style>
