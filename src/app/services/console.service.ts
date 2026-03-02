import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsoleService {
  
  log(...args: any[]): void {
    if (environment.enableConsoleLogs) {
      console.log(...args);
    }
  }

  error(...args: any[]): void {
    if (environment.enableConsoleLogs) {
      console.error(...args);
    }
  }

  warn(...args: any[]): void {
    if (environment.enableConsoleLogs) {
      console.warn(...args);
    }
  }

  info(...args: any[]): void {
    if (environment.enableConsoleLogs) {
      console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (environment.enableConsoleLogs) {
      console.debug(...args);
    }
  }
}
