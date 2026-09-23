<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClassStore } from '@/stores/class'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const classStore = useClassStore()

// 老师端侧边栏菜单（对应 PRD 6.1 老师端路由）
const menus = [
  { index: '/teacher/dashboard', title: '工作台', icon: 'HomeFilled' },
  { index: '/teacher/classroom', title: '课堂操作', icon: 'EditPen' },
  { index: '/teacher/students', title: '学生管理', icon: 'User' },
  { index: '/teacher/rules', title: '积分规则', icon: 'Document' },
  { index: '/teacher/ranking', title: '积分排行', icon: 'Trophy' },
  { index: '/teacher/class/settings', title: '班级设置', icon: 'Setting' },
]

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await auth.logout()
    classStore.reset()
    router.push('/login')
  } catch {
    // 取消
  }
}

// 在新标签页打开课堂大屏
function openDisplay() {
  if (!classStore.currentClass) return
  const routeData = router.resolve({
    name: 'DisplayBoard',
    params: { classId: classStore.currentClass.id },
  })
  window.open(routeData.href, '_blank')
}
</script>

<template>
  <el-container class="teacher-layout">
    <el-aside width="220px" class="teacher-aside">
      <div class="logo">
        <span class="logo-text">QNN宠物乐园</span>
        <span class="logo-sub">老师端</span>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        background-color="#3a3f51"
        text-color="#cfd3dc"
        active-text-color="#fff"
      >
        <el-menu-item v-for="m in menus" :key="m.index" :index="m.index">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="teacher-header">
        <div class="header-title">{{ $route.meta.title }}</div>
        <div class="header-actions">
          <el-button type="primary" plain size="small" @click="openDisplay">
            <el-icon><Monitor /></el-icon>
            课堂大屏
          </el-button>
          <el-dropdown>
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              <span class="user-name">{{ auth.realName || '老师' }}</span>
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="teacher-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.teacher-layout {
  height: 100vh;
}

.teacher-aside {
  background-color: #3a3f51;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-bottom: 1px solid #2c2f3a;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
}

.logo-sub {
  font-size: 12px;
  color: #9ba3b5;
  margin-top: 2px;
}

.teacher-aside :deep(.el-menu) {
  border-right: none;
}

.teacher-header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
  padding: 0 24px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #333;
  outline: none;
}

.user-name {
  font-size: 14px;
}

.teacher-main {
  background-color: #f5f7fa;
  padding: 16px;
}
</style>
