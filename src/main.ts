// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
  // ลบ console.log เฉพาะใน Production
  if (window) {
    window.console.log = () => {};
    window.console.debug = () => {};
    window.console.info = () => {};
    // ปล่อย console.error กับ warn ไว้สำหรับเช็คบัคจริง
  }
}

bootstrapApplication(AppComponent, appConfig)
  .catch(err => {
    // Application bootstrap error
  });