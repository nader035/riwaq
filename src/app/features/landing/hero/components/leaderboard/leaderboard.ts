//
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../../../core/services/supabase';
import * as AOS from 'aos';

interface Leader {
  name: string;
  avatar: string;
  focusHours: string;
  role: string;
  rank: number;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
})
export class LeaderboardComponent implements OnInit {
  private supabase = inject(SupabaseService).supabase;

  // حالة التحميل والبيانات
  loading = signal(true);
  topScholars = signal<Leader[]>([]);

  ngOnInit() {
    this.fetchTopScholars();
  }

  async fetchTopScholars() {
    this.loading.set(true);

    const { data, error } = await this.supabase
      .from('profiles')
      .select('name, avatar, total_focus_seconds')
      .order('total_focus_seconds', { ascending: false })
      .limit(3);

    if (data && data.length > 0) {
      const mapped: Leader[] = data.map((user, index) => ({
        name: user.name,
        avatar: user.avatar,
        focusHours: (user.total_focus_seconds / 3600).toFixed(1),
        role: this.getRoleTitle(index + 1),
        rank: index + 1,
      }));

      /** * 👈 ترتيب المنصة (Podium Order):
       * بنرتب المصفوفة بحيث يكون الترتيب البصري: [المركز الثاني، المركز الأول، المركز الثالث]
       */
      const podiumOrder = [mapped[1], mapped[0], mapped[2]].filter((u) => u !== undefined);
      this.topScholars.set(podiumOrder);
    }

    // إغلاق حالة التحميل وتحديث AOS
    setTimeout(() => {
      this.loading.set(false);
      AOS.refresh();
    }, 600);
  }

  private getRoleTitle(rank: number): string {
    if (rank === 1) return 'RIWAQ LEGEND';
    if (rank === 2) return 'RIWAQ ELITE';
    return 'RIWAQ SCHOLAR';
  }
}
