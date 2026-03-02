import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService, WebsiteStats, DormCountResponse, OnlineCountResponse } from '../../services/stats.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit, OnDestroy {
  stats: WebsiteStats = { visitor_count: 0, submission_count: 0 };
  isLoadingStats = true;
  onlineCount = 0;
  dormCount = 0;
  
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

  initWebSocket() {
    try {
      const wsUrl = 'ws://localhost:3000/ws'; // Update with production URL when needed
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onmessage = (e) => {
        const { type, count } = JSON.parse(e.data);
        if (type === 'online_count') {
          this.onlineCount = count;
        }
      };

      this.ws.onerror = () => {
        console.error('WebSocket error, falling back to HTTP');
        this.loadOnlineCountFallback();
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed, attempting to reconnect...');
        setTimeout(() => this.initWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket, using HTTP fallback');
      this.loadOnlineCountFallback();
    }
  }

  loadOnlineCountFallback() {
    this.statsService.getOnlineCount().subscribe({
      next: (data) => {
        this.onlineCount = data.online_count;
      },
      error: () => {
        this.onlineCount = 0;
      }
    });
  }

  recordVisitor() {
    // Record visitor once per session
    const recorded = sessionStorage.getItem('visitor_recorded');
    if (!recorded) {
      this.statsService.recordVisitor().subscribe({
        next: () => {
          sessionStorage.setItem('visitor_recorded', 'true');
          this.loadStats(); // Refresh stats after recording
        },
        error: () => {
          console.error('Failed to record visitor');
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