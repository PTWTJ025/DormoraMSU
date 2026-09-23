import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  isOpen$ = this.isOpenSubject.asObservable();

  private activeTabSubject = new BehaviorSubject<'login' | 'register'>('login');
  activeTab$ = this.activeTabSubject.asObservable();

  open(tab: 'login' | 'register' = 'login'): void {
    this.activeTabSubject.next(tab);
    this.isOpenSubject.next(true);
    document.body.style.overflow = 'hidden';
  }

  close(): void {
    this.isOpenSubject.next(false);
    document.body.style.overflow = '';
  }

  setTab(tab: 'login' | 'register'): void {
    this.activeTabSubject.next(tab);
  }
}

