import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatsService, WebsiteStats } from '../../services/stats.service';
import { DormitoryService } from '../../services/dormitory.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
})
export class AboutComponent implements OnInit, OnDestroy {
  // Stats Data
  stats: WebsiteStats = { visitor_count: 0, submission_count: 0 };
  isLoadingStats = true;
  onlineCount = 1;
  todayVisitors = 0;
  totalVisitors = 0;
  dormCount = 0;

  // Popup States
  showFacebookPopup = false;
  showLinePopup = false;
  showYoutubePopup = false;

  private ws: WebSocket | null = null;

  constructor(
    private statsService: StatsService,
    private dormSvc: DormitoryService
  ) { }

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
      const wsUrl = 'ws://localhost:3000/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'online_count') {
            this.onlineCount = Math.max(1, data.count);
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
      next: (data) => this.onlineCount = Math.max(1, data.online_count || 1),
      error: () => this.onlineCount = 1
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
    this.initLocalVisitorStats();

    this.statsService.getStats().subscribe({
      next: (data) => {
        if (data && data.visitor_count > 0) {
          this.stats = data;
          this.totalVisitors = data.visitor_count;
        }
        this.isLoadingStats = false;
      },
      error: () => this.isLoadingStats = false
    });
  }

  private initLocalVisitorStats() {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem('dormora_stats_date');
    let storedToday = parseInt(localStorage.getItem('dormora_stats_today') || '0', 10);
    let storedTotal = parseInt(localStorage.getItem('dormora_stats_total') || '142', 10);
    const hasVisitedSession = sessionStorage.getItem('dormora_session_active');

    if (storedDate !== today) {
      // วันใหม่ รีเซ็ตผู้เข้าชมวันนี้
      storedToday = 1;
      storedTotal += 1;
      localStorage.setItem('dormora_stats_date', today);
      localStorage.setItem('dormora_stats_today', '1');
      localStorage.setItem('dormora_stats_total', storedTotal.toString());
      sessionStorage.setItem('dormora_session_active', 'true');
    } else if (!hasVisitedSession) {
      storedToday += 1;
      storedTotal += 1;
      localStorage.setItem('dormora_stats_today', storedToday.toString());
      localStorage.setItem('dormora_stats_total', storedTotal.toString());
      sessionStorage.setItem('dormora_session_active', 'true');
    }

    this.todayVisitors = Math.max(1, storedToday);
    this.totalVisitors = Math.max(this.todayVisitors, storedTotal);
    this.onlineCount = Math.max(1, this.onlineCount);
  }

  loadDormCount() {
    this.statsService.getDormCount().subscribe({
      next: (data) => {
        if (data && data.dorm_count > 0) {
          this.dormCount = data.dorm_count;
        } else {
          this.fetchActualDormCount();
        }
      },
      error: () => this.fetchActualDormCount()
    });
  }

  private fetchActualDormCount() {
    this.dormSvc.getAllDormitories().subscribe({
      next: (dorms) => {
        if (dorms && dorms.length > 0) {
          this.dormCount = dorms.length;
        } else {
          this.dormCount = 38; // Fallback mock count
        }
      },
      error: () => {
        if (this.dormCount === 0) {
          this.dormCount = 38;
        }
      }
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
