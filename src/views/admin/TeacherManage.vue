<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { SysUser, CreateTeacherRequest } from '@/types/api'
import { useAuthStore } from '@/stores/auth'
import {
  getTeacherList,
  createTeacher,
  updateTeacherStatus,
  resetTeacherPassword,
} from '@/api/admin'

const auth = useAuthStore()

// ============ 列表数据 ============
const list = ref<SysUser[]>([])
const loading = ref(false)
// 搜索关键字（按用户名或真实姓名过滤，纯前端过滤）
const keyword = ref('')

// 过滤后的列表
const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter(
    (t) =>
      t.username.toLowerCase().includes(kw) || t.realName.toLowerCase().includes(kw),
  )
})

// 拉取老师列表
async function fetchList() {
  loading.value = true
  try {
    list.value = await getTeacherList()
  } catch {
    // 拦截器已统一提示
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// ============ 添加老师 ============
const addDialogVisible = ref(false)
const addFormRef = ref<FormInstance>()
const addLoading = ref(false)
const addForm = reactive<CreateTeacherRequest>({
  username: '',
  realName: '',
})

const addRules: FormRules<CreateTeacherRequest> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      pattern: /^[A-Za-z0-9_]{3,50}$/,
      message: '3-50位，仅支持字母、数字、下划线',
      trigger: 'blur',
    },
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { max: 50, message: '姓名最长50个字符', trigger: 'blur' },
  ],
}

function openAddDialog() {
  addForm.username = ''
  addForm.realName = ''
  addDialogVisible.value = true
  // 等 DOM 渲染后清除校验状态
  setTimeout(() => addFormRef.value?.clearValidate(), 0)
}

async function handleAdd() {
  if (!addFormRef.value) return
  try {
    await addFormRef.value.validate()
  } catch {
    return
  }
  addLoading.value = true
  try {
    const res = await createTeacher({ ...addForm })
    addDialogVisible.value = false
    // 创建成功 → 展示初始密码（PRD 5.2：创建后展示给管理员）
    passwordResult.value = {
      title: '老师创建成功',
      realName: res.realName,
      username: res.username,
      password: res.initialPassword,
      isReset: false,
    }
    passwordDialogVisible.value = true
    fetchList()
  } catch {
    // 拦截器已提示（如用户名重复 409）
  } finally {
    addLoading.value = false
  }
}

// ============ 密码展示弹窗（创建/重置共用） ============
const passwordDialogVisible = ref(false)
const passwordResult = reactive({
  title: '',
  realName: '',
  username: '',
  password: '',
  isReset: false,
})

// 复制密码到剪贴板
async function copyPassword() {
  try {
    await navigator.clipboard.writeText(passwordResult.password)
    ElMessage.success('密码已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
  }
}

// ============ 禁用 / 启用 ============
async function handleToggleStatus(row: SysUser) {
  // PRD 5.2：不能禁用自己的账号
  if (row.status === 1 && row.id === auth.user?.id) {
    ElMessage.warning('不能禁用自己的账号')
    return
  }
  const action = row.status === 1 ? '禁用' : '启用'
  const tip =
    row.status === 1
      ? '禁用后该老师将无法登录，但班级和学生数据会保留。'
      : '启用后该老师可正常登录。'
  try {
    await ElMessageBox.confirm(`${tip}确定${action}「${row.realName}」吗？`, `${action}确认`, {
      confirmButtonText: `确定${action}`,
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return // 取消
  }
  try {
    await updateTeacherStatus(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(`${action}成功`)
    fetchList()
  } catch {
    // 拦截器已提示
  }
}

// ============ 重置密码 ============
async function handleResetPassword(row: SysUser) {
  try {
    await ElMessageBox.confirm(
      `重置后「${row.realName}」的密码将更换为新的随机密码，原密码立即失效。确定重置吗？`,
      '重置密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return // 取消
  }
  try {
    const res = await resetTeacherPassword(row.id)
    passwordResult.value = {
      title: '密码重置成功',
      realName: row.realName,
      username: row.username,
      password: res.newPassword,
      isReset: true,
    }
    passwordDialogVisible.value = true
  } catch {
    // 拦截器已提示
  }
}

// 格式化时间
function formatTime(t: string): string {
  if (!t) return '-'
  // 后端返回 ISO 或 'YYYY-MM-DD HH:mm:ss'，统一截取到分钟
  return t.replace('T', ' ').slice(0, 16)
}
</script>

<template>
  <div class="teacher-manage">
    <el-card shadow="never">
      <!-- 顶部工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="keyword"
            placeholder="搜索用户名 / 姓名"
            clearable
            style="width: 240px"
            :prefix-icon="''"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="toolbar-right">
          <el-button :icon="''" @click="fetchList" :loading="loading">
            <template #icon>
              <el-icon><Refresh /></el-icon>
            </template>
            刷新
          </el-button>
          <el-button type="primary" @click="openAddDialog">
            <el-icon><Plus /></el-icon>
            添加老师
          </el-button>
        </div>
      </div>

      <!-- 老师列表表格 -->
      <el-table
        v-loading="loading"
        :data="filteredList"
        border
        stripe
        empty-text="暂无老师数据"
        style="width: 100%"
      >
        <el-table-column type="index" label="#" width="60" align="center" />
        <el-table-column prop="realName" label="姓名" min-width="120" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" effect="light">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              :type="row.status === 1 ? 'warning' : 'success'"
              plain
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="info" plain @click="handleResetPassword(row)">
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        共 {{ filteredList.length }} 位老师
      </div>
    </el-card>

    <!-- 添加老师弹窗 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加老师"
      width="460px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="addForm.username"
            placeholder="3-50位，字母/数字/下划线"
            maxlength="50"
            clearable
          />
        </el-form-item>
        <el-form-item label="真实姓名" prop="realName">
          <el-input
            v-model="addForm.realName"
            placeholder="请输入真实姓名"
            maxlength="50"
            clearable
          />
        </el-form-item>
      </el-form>
      <div class="form-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>初始密码由系统随机生成6位，创建后展示给你</span>
      </div>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addLoading" @click="handleAdd">
          确定添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 密码展示弹窗（创建成功 / 重置成功共用） -->
    <el-dialog
      v-model="passwordDialogVisible"
      :title="passwordResult.title"
      width="440px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="password-result">
        <el-icon class="success-icon" size="48" color="#67c23a">
          <CircleCheckFilled />
        </el-icon>
        <div class="result-text">
          <span class="result-name">{{ passwordResult.realName }}</span>
          <span class="result-username">（{{ passwordResult.username }}）</span>
        </div>
        <div class="result-label">
          {{ passwordResult.isReset ? '新密码' : '初始密码' }}
        </div>
        <div class="password-box">
          <span class="password-value">{{ passwordResult.password }}</span>
          <el-button text type="primary" @click="copyPassword">
            <el-icon><CopyDocument /></el-icon>
            复制
          </el-button>
        </div>
        <div class="result-warning">
          <el-icon><WarningFilled /></el-icon>
          <span>请妥善保存此密码，关闭后将无法再次查看</span>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="passwordDialogVisible = false">
          我已记录
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.teacher-manage {
  width: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.table-footer {
  margin-top: 12px;
  text-align: right;
  color: #909399;
  font-size: 13px;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: -8px;
  padding: 8px 12px;
  background: #f4f4f5;
  border-radius: 4px;
  color: #909399;
  font-size: 12px;
}

.password-result {
  text-align: center;
  padding: 8px 0;
}

.success-icon {
  margin-bottom: 12px;
}

.result-text {
  font-size: 16px;
  margin-bottom: 20px;
}

.result-name {
  font-weight: 600;
  color: #303133;
}

.result-username {
  color: #909399;
  font-size: 14px;
}

.result-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.password-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px dashed #4e8df5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.password-value {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #303133;
  font-family: 'Courier New', monospace;
}

.result-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #e6a23c;
  font-size: 12px;
}
</style>
