import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { Result } from '@/types/api'

// Token 在 localStorage 中的 key
export const TOKEN_KEY = 'qnn_pet_token'

// 获取/设置/清除 Token（与 Pinia auth store 共享）
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// 创建 Axios 实例
// baseURL 使用相对路径 /api，由 Vite 开发代理或 Nginx 反向代理转发到后端
const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// ========================================
// 请求拦截器：自动携带 JWT Token
// ========================================
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ========================================
// 响应拦截器：统一处理 Result 格式 & 错误码
// ========================================
service.interceptors.response.use(
  (response) => {
    const res = response.data as Result<unknown>

    // 非 PRD 标准格式（如直接返回二进制等），原样返回
    if (res === null || typeof res !== 'object' || typeof res.code === 'undefined') {
      return response
    }

    // 业务成功：解包 data 后返回
    if (res.code === 200) {
      return res.data as never
    }

    // 业务失败：提示 message
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    // HTTP 层错误
    const status = error?.response?.status
    if (status === 401) {
      // Token 过期或未登录：清 Token，跳登录页
      clearToken()
      ElMessage.error('登录已过期，请重新登录')
      // 避免重复跳转
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      ElMessage.error('没有访问权限')
    } else if (status === 404) {
      ElMessage.error('请求的资源不存在')
    } else {
      // 后端业务错误 message 优先
      const backendMsg = error?.response?.data?.message
      ElMessage.error(backendMsg || error.message || '网络异常，请重试')
    }
    return Promise.reject(error)
  },
)

// 业务请求方法：统一返回 Promise<T>，T 为业务 data 的类型
export function request<T = unknown>(config: Parameters<AxiosInstance['request']>[0]): Promise<T> {
  return service.request(config) as unknown as Promise<T>
}

export default service
