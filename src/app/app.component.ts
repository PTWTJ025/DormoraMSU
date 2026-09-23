import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminLoginComponent } from './main/admin/login/admin-login.component';
import { AuthModalService } from './services/auth-modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AdminLoginComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Dormora MSU';

  constructor(public authModalService: AuthModalService) {}
}
