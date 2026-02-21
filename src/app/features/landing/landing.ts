import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase';
import * as AOS from 'aos';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Leader {
  name: string;
  avatar: string;
  focusHours: string;
  role: string;
  rank: number;
}

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  icon: string;
  colorClass: string; // 'primary' أو 'emerald' أو 'orange'
  socials: { icon: string; link: string }[];
}

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
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

  team: TeamMember[] = [
    {
      name: 'Nader Mohammed',
      role: 'Founder & Lead Engineer',
      bio: 'Obsessed with performance and minimalist design. Leading the vision of Sanctuary’s core architecture.',
      image: 'assets/images/team/nader.jpg',
      icon: 'fa-code',
      colorClass: 'primary', // اللون الأزرق الأساسي
      socials: [
        { icon: 'fab fa-x-twitter', link: 'https://x.com/nader0305' },
        { icon: 'fab fa-linkedin-in', link: 'https://www.linkedin.com/in/nader0305/' },
      ],
    },
    {
      name: 'Basma El-Zoghby',
      role: 'Co-Founder',
      bio: 'Bridging the gap between human psychology and digital interfaces. Strategizing the growth of Riwaq.',
      image: 'assets/images/team/basma.jpg',
      icon: 'fa-gem', // أيقونة الجوهرة للأصالة
      colorClass: 'emerald-400', // اللون الأخضر الزمردي
      socials: [{ icon: 'fab fa-x-twitter', link: 'https://x.com/basma3ady' }],
    },
    {
      name: 'Jehad Ashour',
      role: 'UI/UX Lead',
      bio: 'Crafting tranquility through pixels. Ensuring every micro-interaction feels like a breeze for the scholars.',
      image: 'assets/images/team/jehad.jpeg',
      icon: 'fa-wand-magic-sparkles', // أيقونة السحر للتصميم
      colorClass: 'violet-400', // اقترحت لك البنفسجي عشان نكسر الروتين ويبقى فيه تنوع لوني
      socials: [
        { icon: 'fab fa-linkedin-in', link: 'https://www.linkedin.com/in/jehad-ashour-680495248/' },
      ],
    },
  ];
}
