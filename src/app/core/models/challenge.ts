export interface CatalogItem {
  id: string;
  slug: string;
  name: string;
  total_days: number;
  description: string;
  icon: string;
}

export interface UserQuest {
  id: string;
  main_goal: string;
  current_day: number;
  status: 'active' | 'completed' | 'archived';
  started_at: string;
  catalog_id: string;
  challenges_catalog?: CatalogItem;
}
