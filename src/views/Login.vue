<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { LoginRequest } from '@/types/api'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<LoginRequest>({
  username: '',
  password: '',
})

const rules: FormRules<LoginRequest> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const res = await auth.login(form)
    ElMessage.success(`欢迎回来，${res.realName}`)

    // 优先跳到 redirect 参数；老师角色按 hasClass 引导
    const redirect = (route.query.redirect as string) || ''
    if (redirect && redirect !== '/login') {
      router.push(redirect)
      return
    }
    if (auth.isAdmin) {
      router.push('/admin/teachers')
    } else {
      // 老师首次登录且没班级 → 引导创建班级
      router.push(res.hasClass ? '/teacher/dashboard' : '/teacher/class/create')
    }
  } catch (e) {
    // 拦截器已统一提示
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 回车提交
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    handleSubmit()
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bubble bubble-1" />
      <div class="bubble bubble-2" />
      <div class="bubble bubble-3" />
    </div>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">
          <el-icon size="40" color="#fff"><Cpu /></el-icon>
        </div>
        <h1 class="title">QNN 宠物乐园</h1>
        <p class="subtitle">小学课堂积分激励工具</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        @keydown="handleKeydown"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            :prefix-icon="''"
            clearable
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            clearable
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleSubmit"
        >
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #4e8df5 0%, #6a5acd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.bubble-1 {
  width: 220px;
  height: 220px;
  top: -60px;
  left: -60px;
}

.bubble-2 {
  width: 320px;
  height: 320px;
  bottom: -120px;
  right: -80px;
}

.bubble-3 {
  width: 140px;
  height: 140px;
  top: 40%;
  right: 15%;
  background: rgba(255, 255, 255, 0.08);
}

.login-card {
  position: relative;
  width: 380px;
  padding: 40px 36px 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4e8df5, #6a5acd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}

.login-btn {
  width: 100%;
  margin-top: 4px;
  font-weight: 600;
  letter-spacing: 4px;
}
</style>
