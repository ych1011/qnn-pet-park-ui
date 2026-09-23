import { request } from './request'
import type { LoginRequest, LoginResponse, CurrentUser } from '@/types/api'

// 登录
export function login(data: LoginRequest) {
  return request<LoginResponse>({
    url: '/auth/login',
    method: 'post',
    data,
  })
}

// 登出
export function logout() {
  return request<void>({
    url: '/auth/logout',
    method: 'post',
  })
}

// 获取当前用户信息
export function getCurrentUser() {
  return request<CurrentUser>({
    url: '/auth/me',
    method: 'get',
  })
}
