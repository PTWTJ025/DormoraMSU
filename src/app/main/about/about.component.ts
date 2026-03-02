import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, WebsiteStats, DormCountResponse } from '../../services/stats.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  stats: WebsiteStats = { visitor_count: 0, submission_count: 0 };
  isLoadingStats = true;
  onlineCount = 0;
  dormCount = 0;

  constructor(private statsService: StatsService) { }

  ngOnInit() {
    this.loadStats();
    this.generateOnlineCount();
    this.loadDormCount();
  }

  generateOnlineCount() {
    this.onlineCount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
  }

  loadStats() {
    this.statsService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: () => {
        this.isLoadingStats = false;
      },
    });
  }

  loadDormCount() {
    this.statsService.getDormCount().subscribe({
      next: (data) => {
        this.dormCount = data.dorm_count;
      },
      error: () => {
        this.dormCount = 0;
      },
    });
  }

  // Popup states
  showFacebookPopup = false;
  showLinePopup = false;
  showYoutubePopup = false;

  openFacebookPopup() {
    this.closeAllPopups();
    this.showFacebookPopup = true;
  }

  openLinePopup() {
    this.closeAllPopups();
    this.showLinePopup = true;
  }

  openYoutubePopup() {
    this.closeAllPopups();
    this.showYoutubePopup = true;
  }

  closeAllPopups() {
    this.showFacebookPopup = false;
    this.showLinePopup = false;
    this.showYoutubePopup = false;
  }

  openSocialLink(url: string) {
    window.open(url, '_blank');
  }
}