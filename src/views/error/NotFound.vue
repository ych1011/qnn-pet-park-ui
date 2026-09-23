<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="error-page">
    <div class="error-code">404</div>
    <div class="error-text">抱歉，你访问的页面不存在</div>
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
  color: #f56c6c;
  line-height: 1;
}

.error-text {
  font-size: 16px;
  color: #606266;
}
</style>
