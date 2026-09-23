<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function goHome() {
  if (!auth.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push(auth.isAdmin ? '/admin/teachers' : '/teacher/dashboard')
}
</script>

<template>
  <div class="error-page">
    <div class="error-code">403</div>
    <div class="error-text">抱歉，你没有访问该页面的权限</div>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<style scoped>
.error-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #f5f7fa;
}

.error-code {
  font-size: 96px;
  font-weight: 700;
  color: #e6a23c;
  line-height: 1;
}

.error-text {
  font-size: 16px;
  color: #606266;
}
</style>
