import { Routes } from '@angular/router';
import { MainComponent } from './main/main.component';
import { DormListComponent } from './main/dorm-list/dorm-list.component';
import { DormDetailComponent } from './main/dorm-detail/dorm-detail.component';
import { DormMapComponent } from './main/dorm-map/dorm-map.component';
import { DormCompareComponent } from './main/dorm-compare/dorm-compare.component';
import { DormSubmitComponent } from './main/dorm-submit/dorm-submit.component';
import { AdminComponent } from './main/admin/admin.component';
import { AdminLoginComponent } from './main/admin/login/admin-login.component';
import { AdminEditDormComponent } from './main/admin/admin-edit-dorm/admin-edit-dorm.component';
import { AuthRedirectGuard } from './guards/auth-redirect.guard';

export const routes: Routes = [
  // Redirect root path to main
  { path: '', redirectTo: '/main', pathMatch: 'full' },

  // Main route - เปิดให้ทุกคนเข้าได้โดยไม่ต้องล็อกอิน
  {
    path: 'main',
    component: MainComponent,
  },

  // Dorm list route - accessible to everyone
  { path: 'dorm-list', component: DormListComponent },

  // Dorm detail route - accessible to everyone
  {
    path: 'dorm-detail/:id',
    component: DormDetailComponent,
  },

  // Dorm compare route - accessible to everyone
  { path: 'dorm-compare', component: DormCompareComponent },

  // Dorm map route - accessible to everyone
  { path: 'dorm-map', component: DormMapComponent },

  // Dorm submission route - public form for submitting dorm data
  { path: 'dorm-submit', component: DormSubmitComponent },

  // Admin routes - เฉพาะแอดมินเท่านั้น
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthRedirectGuard],
    data: { userType: 'admin' },
  },

  // Admin edit dormitory route
  {
    path: 'admin/edit-dorm/:dormId',
    component: AdminEditDormComponent,
    canActivate: [AuthRedirectGuard],
    data: { userType: 'admin' },
  },

  // Admin login route
  {
    path: 'admin/login',
    component: AdminLoginComponent,
  },

  // Wildcard route - redirect to main
  { path: '**', redirectTo: '/main' },
];
