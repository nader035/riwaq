export interface Room {
  id: string;
  name: string;
  icon: string;
  current_count: number;
  description?: string;
  created_at?: string;
  capacity?: number;
}
