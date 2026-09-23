import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Role, LoginRequest } from '@/types/api'
import { login as loginApi, logout as logoutApi, getCurrentUser } from '@/api/auth'
import { getToken, setToken, clearToken, TOKEN_KEY } from '@/api/request'

// 用户信息 key（与 token 一同持久化，刷新页面后仍可恢复会话）
const USER_KEY = 'qnn_pet_user'

interface UserInfo {
  id: number
  username: string
  realName: string
  role: Role
}

export const useAuthStore = defineStore('auth', () => {
  // ============ state ============
  const token = ref<string | null>(getToken())
  const user = ref<UserInfo | null>(loadUser())

  // ============ getters ============
  const isLoggedIn = computed(() => !!token.value)
  const role = computed<Role | null>(() => user.value?.role ?? null)
  const isAdmin = computed(() => role.value === 'admin')
  const isTeacher = computed(() => role.value === 'teacher')
  const realName = computed(() => user.value?.realName ?? '')

  // ============ actions ============
  function setUser(u: UserInfo | null) {
    user.value = u
    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  function loadUser(): UserInfo | null {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as UserInfo) : null
    } catch {
      return null
    }
  }

  // 登录：调接口 → 存 token 和用户信息
  async function login(payload: LoginRequest) {
    const res = await loginApi(payload)
    token.value = res.token
    setToken(res.token)

    // 登录返回里带了 realName / role，先用它初始化 user
    setUser({
      id: 0, // 登录响应不含 id，后续通过 /auth/me 补全
      username: payload.username,
      realName: res.realName,
      role: res.role,
    })

    // 补全当前用户详情（拿到 id 等）
    try {
      const me = await getCurrentUser()
      setUser({
        id: me.id,
        username: me.username,
        realName: me.realName,
        role: me.role,
      })
    } catch {
      // 补全失败不影响登录主流程，token 已具备
    }

    return res
  }

  // 登出：调接口（无论成功与否）→ 清本地状态
  async function logout() {
    try {
      await logoutApi()
    } catch {
      // 忽略登出接口失败
    }
    token.value = null
    setUser(null)
    clearToken()
  }

  // 主动清除（用于 401 拦截器）
  function clear() {
    token.value = null
    setUser(null)
    clearToken()
  }

  return {
    token,
    user,
    isLoggedIn,
    role,
    isAdmin,
    isTeacher,
    realName,
    login,
    logout,
    clear,
    setUser,
  }
})

// 导出常量供路由守卫等使用
export { TOKEN_KEY }
