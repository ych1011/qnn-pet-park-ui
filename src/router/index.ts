import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/Forbidden.vue'),
    meta: { title: '无权限', public: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/NotFound.vue'),
    meta: { title: '页面不存在', public: true },
  },

  // ========== 管理后台 ==========
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { title: '管理后台', roles: ['admin'] },
    redirect: '/admin/teachers',
    children: [
      {
        path: 'teachers',
        name: 'AdminTeachers',
        component: () => import('@/views/admin/TeacherManage.vue'),
        meta: { title: '老师管理', roles: ['admin'] },
      },
    ],
  },

  // ========== 老师端 ==========
  {
    path: '/teacher',
    component: () => import('@/layouts/TeacherLayout.vue'),
    meta: { title: '老师端', roles: ['teacher'] },
    redirect: '/teacher/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'TeacherDashboard',
        component: () => import('@/views/teacher/Dashboard.vue'),
        meta: { title: '工作台', roles: ['teacher'] },
      },
      {
        path: 'class/create',
        name: 'ClassCreate',
        component: () => import('@/views/teacher/ClassCreate.vue'),
        meta: { title: '创建班级', roles: ['teacher'] },
      },
      {
        path: 'class/settings',
        name: 'ClassSettings',
        component: () => import('@/views/teacher/ClassSettings.vue'),
        meta: { title: '班级设置', roles: ['teacher'] },
      },
      {
        path: 'students',
        name: 'StudentList',
        component: () => import('@/views/teacher/StudentList.vue'),
        meta: { title: '学生管理', roles: ['teacher'] },
      },
      {
        path: 'students/:id',
        name: 'StudentDetail',
        component: () => import('@/views/teacher/StudentDetail.vue'),
        meta: { title: '学生详情', roles: ['teacher'] },
      },
      {
        path: 'rules',
        name: 'RuleConfig',
        component: () => import('@/views/teacher/RuleConfig.vue'),
        meta: { title: '积分规则', roles: ['teacher'] },
      },
      {
        path: 'classroom',
        name: 'Classroom',
        component: () => import('@/views/teacher/Classroom.vue'),
        meta: { title: '课堂操作', roles: ['teacher'] },
      },
      {
        path: 'ranking',
        name: 'Ranking',
        component: () => import('@/views/teacher/Ranking.vue'),
        meta: { title: '积分排行', roles: ['teacher'] },
      },
    ],
  },

  // ========== 课堂大屏（独立全屏页） ==========
  {
    path: '/display/:classId',
    name: 'DisplayBoard',
    component: () => import('@/views/display/DisplayBoard.vue'),
    meta: { title: '课堂大屏', roles: ['teacher'] },
  },

  // 根路径：按角色跳转
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      if (!auth.isLoggedIn) return '/login'
      return auth.isAdmin ? '/admin/teachers' : '/teacher/dashboard'
    },
  },

  // 兜底 404
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局前置守卫：未登录拦截 + 角色越权拦截
router.beforeEach((to, _from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - QNN宠物乐园`
  }

  const auth = useAuthStore()

  // 公开页面（登录、403、404）直接放行
  if (to.meta.public) {
    // 已登录用户访问登录页：跳到首页
    if (to.name === 'Login' && auth.isLoggedIn) {
      return next(auth.isAdmin ? '/admin/teachers' : '/teacher/dashboard')
    }
    return next()
  }

  // 未登录：跳登录页
  if (!auth.isLoggedIn) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 角色校验：路由 meta.roles 与当前角色不匹配 → 跳 403
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(auth.role ?? '')) {
    return next('/403')
  }

  next()
})

export default router
