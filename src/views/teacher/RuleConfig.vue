<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { ScoreRule, ScoreType, RuleCategory, CreateRuleRequest } from '@/types/api'
import { useClassStore } from '@/stores/class'
import { getRuleList, createRule, updateRule, deleteRule } from '@/api/teacher'

const router = useRouter()
const classStore = useClassStore()

// ============ 数据 ============
const list = ref<ScoreRule[]>([])
const loading = ref(false)
const filterCategory = ref<RuleCategory | ''>('')

const filteredList = computed(() => {
  if (!filterCategory.value) return list.value
  return list.value.filter((r) => r.category === filterCategory.value)
})

const hasClass = computed(() => !!classStore.currentClass)

// 分类标签
const categoryMap: Record<RuleCategory, { label: string; color: string }> = {
  study: { label: '学习', color: '#409eff' },
  discipline: { label: '纪律', color: '#e6a23c' },
  habit: { label: '习惯', color: '#67c23a' },
  morality: { label: '品德', color: '#f56c6c' },
}
const categoryOptions = Object.entries(categoryMap).map(([value, { label }]) => ({
  value: value as RuleCategory,
  label,
}))

function getCategoryTag(cat: RuleCategory) {
  return categoryMap[cat] ?? { label: '未知', color: '#909399' }
}

// 加分/扣分规则分组
const addList = computed(() => filteredList.value.filter((r) => r.type === 'add'))
const subList = computed(() => filteredList.value.filter((r) => r.type === 'subtract'))

// ============ 加载 ============
async function fetchList() {
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
    list.value = await getRuleList(classStore.currentClass.id)
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

// ============ 添加 / 编辑 ============
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const submitting = ref(false)
const editingId = ref(0)

const form = reactive<CreateRuleRequest>({
  classId: 0,
  name: '',
  type: 'add',
  score: 1,
  category: 'study',
  sortOrder: 0,
})

const formRules: FormRules<CreateRuleRequest> = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' },
    { max: 50, message: '名称最长50个字符', trigger: 'blur' },
  ],
  score: [
    { required: true, message: '请输入分值', trigger: 'blur' },
    { type: 'number', min: 1, max: 99, message: '分值范围 1-99', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

const dialogTitle = computed(() => (dialogMode.value === 'add' ? '添加规则' : '编辑规则'))

function openAddDialog() {
  dialogMode.value = 'add'
  form.name = ''
  form.type = 'add'
  form.score = 1
  form.category = 'study'
  form.sortOrder = list.value.length + 1
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate(), 0)
}

function openEditDialog(row: ScoreRule) {
  dialogMode.value = 'edit'
  editingId.value = row.id
  form.name = row.name
  form.type = row.type
  form.score = row.score
  form.category = row.category
  form.sortOrder = row.sortOrder
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate(), 0)
}

async function handleSubmit() {
  if (!formRef.value || !classStore.currentClass) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (dialogMode.value === 'add') {
      form.classId = classStore.currentClass.id
      await createRule({ ...form })
      ElMessage.success('规则添加成功')
    } else {
      await updateRule(editingId.value, { ...form })
      ElMessage.success('规则已更新')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 拦截器已提示
  } finally {
    submitting.value = false
  }
}

// ============ 启用/禁用 ============
async function handleToggleStatus(row: ScoreRule) {
  const newStatus = row.status === 1 ? 0 : 1
  try {
    await updateRule(row.id, {
      name: row.name,
      type: row.type,
      score: row.score,
      category: row.category,
      status: newStatus,
      sortOrder: row.sortOrder,
    })
    row.status = newStatus
    ElMessage.success(newStatus === 1 ? '已启用' : '已禁用')
  } catch {
    // 拦截器已提示
  }
}

// ============ 删除 ============
async function handleDelete(row: ScoreRule) {
  try {
    await ElMessageBox.confirm(
      `删除规则「${row.name}」后，已有的积分记录将保留。确定删除吗？`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }
  try {
    await deleteRule(row.id)
    ElMessage.success('已删除')
    fetchList()
  } catch {
    // 拦截器已提示
  }
}
</script>

<template>
  <div class="rule-config">
    <!-- 无班级引导 -->
    <el-empty v-if="!hasClass && !loading" description="请先创建班级才能配置规则">
      <el-button type="primary" @click="router.push('/teacher/class/create')">
        去创建班级
      </el-button>
    </el-empty>

    <template v-else>
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select
            v-model="filterCategory"
            placeholder="全部分类"
            clearable
            style="width: 140px"
          >
            <el-option
              v-for="opt in categoryOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <span class="rule-count">共 {{ filteredList.length }} 条规则</span>
        </div>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          添加规则
        </el-button>
      </div>

      <!-- 加分规则表 -->
      <div class="section-title add-title">
        <el-icon><CirclePlus /></el-icon>
        加分规则（{{ addList.length }}）
      </div>
      <el-table :data="addList" v-loading="loading" stripe style="width: 100%" empty-text="暂无加分规则">
        <el-table-column label="名称" prop="name" min-width="160" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag :color="getCategoryTag(row.category).color" effect="dark" size="small">
              {{ getCategoryTag(row.category).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分值" width="100">
          <template #default="{ row }">
            <span class="score-add">+{{ row.score }}</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sortOrder" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="handleToggleStatus(row)"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 扣分规则表 -->
      <div class="section-title sub-title">
        <el-icon><Remove /></el-icon>
        扣分规则（{{ subList.length }}）
      </div>
      <el-table :data="subList" v-loading="loading" stripe style="width: 100%" empty-text="暂无扣分规则">
        <el-table-column label="名称" prop="name" min-width="160" />
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag :color="getCategoryTag(row.category).color" effect="dark" size="small">
              {{ getCategoryTag(row.category).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分值" width="100">
          <template #default="{ row }">
            <span class="score-sub">-{{ row.score }}</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sortOrder" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              @change="handleToggleStatus(row)"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- 添加 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
        @submit.prevent
      >
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="如：举手回答问题"
            maxlength="50"
            clearable
            @keydown.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio-button value="add">加分</el-radio-button>
            <el-radio-button value="subtract">扣分</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分值" prop="score">
          <el-input-number
            v-model="form.score"
            :min="1"
            :max="99"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="opt in categoryOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
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
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.rule-config {
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

.rule-count {
  color: #909399;
  font-size: 13px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0 12px;
}

.add-title {
  color: #67c23a;
}

.sub-title {
  color: #f56c6c;
}

.score-add {
  color: #67c23a;
  font-weight: 600;
  font-size: 15px;
}

.score-sub {
  color: #f56c6c;
  font-weight: 600;
  font-size: 15px;
}
</style>
