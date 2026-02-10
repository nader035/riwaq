//
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team.html',
})
export class TeamComponent {
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
