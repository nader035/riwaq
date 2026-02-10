import { Component } from '@angular/core';
import { Features } from './components/features/features';
import { Story } from './components/story/story';
import { Cta } from './components/cta/cta';
import { TeamComponent } from './components/team/team';
import { LeaderboardComponent } from './components/leaderboard/leaderboard';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  imports: [Features, Story, TeamComponent, Cta, LeaderboardComponent, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {}
