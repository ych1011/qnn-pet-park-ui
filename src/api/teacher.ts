import { request } from './request'
import type {
  ClassInfo,
  CreateClassRequest,
  UpdateClassRequest,
  Student,
  CreateStudentRequest,
  UpdateStudentRequest,
  PetType,
  PetLevelConfig,
  Pet,
  AssignPetRequest,
  UpdatePetRequest,
  ScoreRule,
  CreateRuleRequest,
  UpdateRuleRequest,
  AddScoreRequest,
  AddScoreResponse,
  ScoreLog,
  Page,
  DisplayStudent,
  RankingItem,
} from '@/types/api'

// ========== 班级管理 ==========
// 获取当前老师的班级
export function getCurrentClass() {
  return request<ClassInfo | null>({
    url: '/teacher/classes/current',
    method: 'get',
  })
}

// 创建班级
export function createClass(data: CreateClassRequest) {
  return request<ClassInfo>({
    url: '/teacher/classes',
    method: 'post',
    data,
  })
}

// 更新班级信息
export function updateClass(id: number, data: UpdateClassRequest) {
  return request<void>({
    url: `/teacher/classes/${id}`,
    method: 'put',
    data,
  })
}

// ========== 学生管理 ==========
// 学生列表（含宠物信息）
export function getStudentList(classId: number) {
  return request<Student[]>({
    url: '/teacher/students',
    method: 'get',
    params: { classId },
  })
}

// 新增学生
export function createStudent(data: CreateStudentRequest) {
  return request<Student>({
    url: '/teacher/students',
    method: 'post',
    data,
  })
}

// 编辑学生
export function updateStudent(id: number, data: UpdateStudentRequest) {
  return request<void>({
    url: `/teacher/students/${id}`,
    method: 'put',
    data,
  })
}

// 删除学生（级联删除宠物和积分记录）
export function deleteStudent(id: number) {
  return request<void>({
    url: `/teacher/students/${id}`,
    method: 'delete',
  })
}

// ========== 宠物系统 ==========
// 宠物类型列表（含 Lv.1 图片）
export function getPetTypeList() {
  return request<PetType[]>({
    url: '/teacher/pet-types',
    method: 'get',
  })
}

// 某宠物的全部等级配置
export function getPetLevels(petTypeId: number) {
  return request<PetLevelConfig[]>({
    url: `/teacher/pet-types/${petTypeId}/levels`,
    method: 'get',
  })
}

// 给学生分配宠物
export function assignPet(data: AssignPetRequest) {
  return request<Pet>({
    url: '/teacher/pets',
    method: 'post',
    data,
  })
}

// 更换宠物 / 修改宠物名字
export function updatePet(id: number, data: UpdatePetRequest) {
  return request<Pet>({
    url: `/teacher/pets/${id}`,
    method: 'put',
    data,
  })
}

// 获取学生的宠物信息
export function getStudentPet(studentId: number) {
  return request<Pet | null>({
    url: `/teacher/students/${studentId}/pet`,
    method: 'get',
  })
}

// ========== 积分规则 ==========
// 积分规则列表
export function getRuleList(classId: number) {
  return request<ScoreRule[]>({
    url: '/teacher/rules',
    method: 'get',
    params: { classId },
  })
}

// 新增规则
export function createRule(data: CreateRuleRequest) {
  return request<ScoreRule>({
    url: '/teacher/rules',
    method: 'post',
    data,
  })
}

// 编辑规则
export function updateRule(id: number, data: UpdateRuleRequest) {
  return request<void>({
    url: `/teacher/rules/${id}`,
    method: 'put',
    data,
  })
}

// 删除规则
export function deleteRule(id: number) {
  return request<void>({
    url: `/teacher/rules/${id}`,
    method: 'delete',
  })
}

// ========== 积分操作 ==========
// 加分 / 扣分
export function addScore(data: AddScoreRequest) {
  return request<AddScoreResponse>({
    url: '/teacher/scores',
    method: 'post',
    data,
  })
}

// 撤销最近一次操作
export function undoScore() {
  return request<void>({
    url: '/teacher/scores/undo',
    method: 'post',
  })
}

// 积分排行榜
export function getRanking(classId: number) {
  return request<RankingItem[]>({
    url: '/teacher/ranking',
    method: 'get',
    params: { classId },
  })
}

// 积分记录（分页）
export function getScoreLogs(studentId: number, current: number, size: number) {
  return request<Page<ScoreLog>>({
    url: '/teacher/score-logs',
    method: 'get',
    params: { studentId, page: current, size },
  })
}

// ========== 课堂大屏 ==========
// 全班宠物展示数据
export function getDisplayData(classId: number) {
  return request<DisplayStudent[]>({
    url: `/teacher/display/${classId}`,
    method: 'get',
  })
}
