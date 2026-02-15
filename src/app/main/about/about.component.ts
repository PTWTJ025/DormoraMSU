import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html'
})
export class AboutComponent {
  showImagePopup = false;
  popupImageUrl = '';
  showYouTubePopup = false;

  constructor() { }

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