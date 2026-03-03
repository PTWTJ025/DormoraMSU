import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, WebsiteStats } from '../../services/stats.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit, OnDestroy {
  // Stats Data
  stats: WebsiteStats = { visitor_count: 0, submission_count: 0 };
  isLoadingStats = true;
  onlineCount = 0;
  dormCount = 0;

  // Popup States
  showFacebookPopup = false;
  showLinePopup = false;
  showYoutubePopup = false;

  private ws: WebSocket | null = null;

  constructor(private statsService: StatsService) { }

  ngOnInit() {
    this.loadStats();
    this.loadDormCount();
    this.initWebSocket();
    this.recordVisitor();
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }

  // --- Core Logic ---

  initWebSocket() {
    try {
      const wsUrl = 'ws://localhost:3000/ws'; // แก้เป็น URL ของหลังบ้านคุณ
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'online_count') {
            this.onlineCount = data.count;
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      this.ws.onerror = () => this.loadOnlineCountFallback();
      this.ws.onclose = () => setTimeout(() => this.initWebSocket(), 5000);
    } catch (error) {
      this.loadOnlineCountFallback();
    }
  }

  loadOnlineCountFallback() {
    this.statsService.getOnlineCount().subscribe({
      next: (data) => this.onlineCount = data.online_count,
      error: () => this.onlineCount = 0
    });
  }

  recordVisitor() {
    const recorded = sessionStorage.getItem('visitor_recorded');
    if (!recorded) {
      this.statsService.recordVisitor().subscribe({
        next: () => {
          sessionStorage.setItem('visitor_recorded', 'true');
          this.loadStats();
        }
      });
    }
  }

  loadStats() {
    this.statsService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoadingStats = false;
      },
      error: () => this.isLoadingStats = false
    });
  }

  loadDormCount() {
    this.statsService.getDormCount().subscribe({
      next: (data) => this.dormCount = data.dorm_count,
      error: () => this.dormCount = 0
    });
  }

  // --- Popup Handlers ---

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
}