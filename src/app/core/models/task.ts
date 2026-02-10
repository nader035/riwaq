export interface Task {
  id?: string; // UUID من سوبابيز
  user_id?: string; // معرف المستخدم صاحب المهمة
  title: string; // عنوان المهمة
  is_completed: boolean; // حالة الإنجاز
  category: 'Work' | 'Study' | 'Personal' | 'General'; // التصنيف
  priority: 'low' | 'medium' | 'high'; // درجة الأهمية
  created_at?: string; // تاريخ الإنشاء
  due_date?: string; // موعد التسليم (اختياري)
}
