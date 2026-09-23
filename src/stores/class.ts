import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClassInfo, Student } from '@/types/api'
import { getCurrentClass, getStudentList } from '@/api/teacher'

// 缓存当前老师的班级 & 学生列表，供课堂操作页、大屏页等多页共享
export const useClassStore = defineStore('class', () => {
  // ============ state ============
  const currentClass = ref<ClassInfo | null>(null)
  const students = ref<Student[]>([])
  const loading = ref(false)

  // ============ actions ============
  // 拉取当前老师的班级信息
  async function fetchCurrentClass() {
    currentClass.value = await getCurrentClass()
    return currentClass.value
  }

  // 拉取学生列表（含宠物信息）
  async function fetchStudents() {
    if (!currentClass.value) {
      await fetchCurrentClass()
    }
    if (!currentClass.value) {
      students.value = []
      return students.value
    }
    loading.value = true
    try {
      students.value = await getStudentList(currentClass.value.id)
    } finally {
      loading.value = false
    }
    return students.value
  }

  // 重置（登出时调用）
  function reset() {
    currentClass.value = null
    students.value = []
    loading.value = false
  }

  return {
    currentClass,
    students,
    loading,
    fetchCurrentClass,
    fetchStudents,
    reset,
  }
})
