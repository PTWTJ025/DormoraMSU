import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, WebsiteStats } from '../../services/stats.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit {
  showImagePopup = false;
  popupImageUrl = '';
  showYouTubePopup = false;

  stats: WebsiteStats = { visitor_count: 0, submission_count: 0 };
  isLoadingStats = true;
  onlineCount = 0;

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.loadStats();
    this.generateOnlineCount();
  }

  generateOnlineCount() {
    // Simulate real-time online users for visual effect as requested
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

  openImagePopup(imageUrl: string) {
    this.popupImageUrl = imageUrl;
    this.showImagePopup = true;
  }

  closeImagePopup() {
    this.showImagePopup = false;
    this.popupImageUrl = '';
  }

  openYouTubePopup() {
    this.showYouTubePopup = true;
  }

  closeYouTubePopup() {
    this.showYouTubePopup = false;
  }
}
