import { request } from './request'
import type {
  SysUser,
  CreateTeacherRequest,
  CreateTeacherResponse,
  UpdateTeacherStatusRequest,
  ResetPasswordResponse,
} from '@/types/api'

// 老师列表（admin）
export function getTeacherList() {
  return request<SysUser[]>({
    url: '/admin/teachers',
    method: 'get',
  })
}

// 新增老师（admin）
export function createTeacher(data: CreateTeacherRequest) {
  return request<CreateTeacherResponse>({
    url: '/admin/teachers',
    method: 'post',
    data,
  })
}

// 禁用/启用老师（admin）
export function updateTeacherStatus(id: number, data: UpdateTeacherStatusRequest) {
  return request<void>({
    url: `/admin/teachers/${id}/status`,
    method: 'put',
    data,
  })
}

// 重置老师密码（admin）
export function resetTeacherPassword(id: number) {
  return request<ResetPasswordResponse>({
    url: `/admin/teachers/${id}/reset-password`,
    method: 'post',
  })
}
