import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface WebsiteStats {
  visitor_count: number;
  submission_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class StatsService {
  private backendUrl = environment.backendApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get website statistics
   */
  getStats(): Observable<WebsiteStats> {
    return this.http.get<WebsiteStats>(`${this.backendUrl}/stats`).pipe(
      catchError((error) => {
        console.error('Error fetching website stats:', error);
        return of({ visitor_count: 0, submission_count: 0 });
      }),
    );
  }

  /**
   * Record a new visitor (increment count)
   */
  recordVisitor(): Observable<any> {
    // Only record if not already recorded in this session
    const recorded = sessionStorage.getItem('visitor_recorded');
    if (recorded) {
      return of(null);
    }

    return this.http.post(`${this.backendUrl}/stats/visitor`, {}).pipe(
      map((res) => {
        sessionStorage.setItem('visitor_recorded', 'true');
        return res;
      }),
      catchError((error) => {
        console.error('Error recording visitor:', error);
        return of(null);
      }),
    );
  }
}
