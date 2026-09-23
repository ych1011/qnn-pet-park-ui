// ========================================
// 统一响应格式（PRD 7.9）
// 所有 API 统一返回 { code, message, data }
// ========================================
export interface Result<T = unknown> {
  code: number
  message: string
  data: T
}

// 错误码定义（PRD 7.9）
export const enum ErrorCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  SERVER_ERROR = 500,
}

// ========================================
// 角色 & 枚举
// ========================================
export type Role = 'admin' | 'teacher'

// 加减分类型
export type ScoreType = 'add' | 'subtract'

// 积分规则分类
export type RuleCategory = 'study' | 'discipline' | 'habit' | 'morality'

// 用户状态
export type UserStatus = 0 | 1 // 0-禁用 1-正常

// 学生状态
export type StudentStatus = 0 | 1 // 0-转出 1-在读

// 规则启用状态
export type RuleStatus = 0 | 1 // 0-禁用 1-启用

// ========================================
// 实体类型（对应后端 entity，字段与 DDL 保持一致）
// ========================================
export interface SysUser {
  id: number
  username: string
  realName: string
  role: Role
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface ClassInfo {
  id: number
  teacherId: number
  name: string
  grade?: string | null
  semester?: string | null
  createdAt: string
  updatedAt: string
}

export interface PetType {
  id: number
  code: string
  name: string
  sortOrder: number
  createdAt: string
}

export interface PetLevelConfig {
  id: number
  petTypeId: number
  level: number // 1-5
  levelName: string
  requiredScore: number
  imageUrl: string
  createdAt: string
}

export interface ScoreRule {
  id: number
  classId: number
  name: string
  type: ScoreType
  score: number
  category: RuleCategory
  sortOrder: number
  status: RuleStatus
  createdAt: string
  updatedAt: string
}

export interface Student {
  id: number
  classId: number
  name: string
  avatar?: string | null
  sortOrder: number
  status: StudentStatus
  createdAt: string
  updatedAt: string
  // 关联字段（接口返回时附带）
  pet?: Pet | null
}

export interface Pet {
  id: number
  studentId: number
  petTypeId: number
  customName?: string | null
  currentLevel: number // 1-5
  currentScore: number
  createdAt: string
  updatedAt: string
  // 关联字段
  petType?: PetType | null
  levelConfig?: PetLevelConfig | null
}

export interface ScoreLog {
  id: number
  studentId: number
  classId: number
  ruleId?: number | null
  ruleName: string
  type: ScoreType
  score: number
  remark?: string | null
  createdAt: string
}

// ========================================
// 请求 / 响应 DTO
// ========================================

// --- 认证模块 ---
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  role: Role
  realName: string
  hasClass: boolean
}

// 当前用户信息（GET /api/auth/me）
export interface CurrentUser {
  id: number
  username: string
  realName: string
  role: Role
  status: UserStatus
}

// --- 管理员 - 老师管理 ---
export interface CreateTeacherRequest {
  username: string
  realName: string
}

export interface CreateTeacherResponse {
  id: number
  username: string
  realName: string
  initialPassword: string
}

export interface UpdateTeacherStatusRequest {
  status: UserStatus
}

export interface ResetPasswordResponse {
  newPassword: string
}

// --- 班级管理 ---
export interface CreateClassRequest {
  name: string
  grade?: string
  semester?: string
}

export interface UpdateClassRequest extends Partial<CreateClassRequest> {}

// --- 学生管理 ---
export interface CreateStudentRequest {
  name: string
  sortOrder?: number
}

export interface UpdateStudentRequest extends Partial<CreateStudentRequest> {
  name?: string
  sortOrder?: number
}

// --- 宠物系统 ---
export interface AssignPetRequest {
  studentId: number
  petTypeId: number
  customName?: string
}

export interface UpdatePetRequest {
  petTypeId?: number
  customName?: string
}

// --- 积分规则 ---
export interface CreateRuleRequest {
  classId: number
  name: string
  type: ScoreType
  score: number
  category: RuleCategory
  sortOrder?: number
}

export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {}

// --- 积分操作 ---
export interface AddScoreRequest {
  studentId: number
  ruleId?: number | null
  type: ScoreType
  score: number
  ruleName: string
  remark?: string
  idempotentKey: string
}

export interface AddScoreResponse {
  logId: number
  newScore: number
  newLevel: number
  leveledUp: boolean
  oldLevel?: number
}

// --- 分页响应 ---
export interface Page<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

// ========================================
// 课堂大屏展示数据（GET /api/teacher/display/{classId}）
// ========================================
export interface DisplayStudent {
  studentId: number
  studentName: string
  petId: number
  petTypeId: number
  petTypeCode: string
  petTypeName: string
  customName?: string | null
  currentLevel: number
  levelName: string
  imageUrl: string
  currentScore: number
}

// ========================================
// 排行榜条目
// ========================================
export interface RankingItem {
  rank: number
  studentId: number
  studentName: string
  petId: number
  petTypeId: number
  petTypeCode: string
  petTypeName: string
  customName?: string | null
  currentLevel: number
  levelName: string
  imageUrl: string
  currentScore: number
}
