import { Injectable, NgZone } from '@angular/core';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';

@Injectable({
  providedIn: 'root'
})
export class GsapAnimationService {

  constructor(private ngZone: NgZone) {}

  /**
   * Animate step transition with horizontal slide
   * @param fromStep Element of the step being exited
   * @param toStep Element of the step being entered
   * @param direction 'next' or 'prev' for slide direction
   */
  animateStepTransition(fromStep: HTMLElement, toStep: HTMLElement, direction: 'next' | 'prev'): Promise<void> {
    return this.ngZone.runOutsideAngular(() => {
      return new Promise((resolve) => {
        const xOffset = direction === 'next' ? 100 : -100;
        
        // Set initial state for incoming step
        gsap.set(toStep, { 
          xPercent: xOffset, 
          opacity: 0,
          display: 'block'
        });

        // Create timeline for smooth transition
        const tl = gsap.timeline({
          onComplete: () => {
            gsap.set(fromStep, { display: 'none' });
            this.ngZone.run(() => resolve());
          }
        });

        // Animate outgoing step
        tl.to(fromStep, {
          xPercent: -xOffset,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.inOut'
        }, 0);

        // Animate incoming step
        tl.to(toStep, {
          xPercent: 0,
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out'
        }, 0.1);
      });
    });
  }

  /**
   * Animate progress bar morphing
   * @param progressBar The progress bar element
   * @param fromPercent Starting percentage
   * @param toPercent Target percentage
   */
  animateProgressBar(progressBar: HTMLElement, fromPercent: number, toPercent: number): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.fromTo(progressBar, 
        { width: `${fromPercent}%` },
        { 
          width: `${toPercent}%`, 
          duration: 0.4, 
          ease: 'power2.inOut'
        }
      );
    });
  }

  /**
   * Animate success modal with scale from center
   * @param modalElement The modal container element
   * @param contentElement The modal content element
   */
  animateSuccessModal(modalElement: HTMLElement, contentElement: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      // Backdrop fade in
      gsap.fromTo(modalElement,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );

      // Content scale from center with bounce
      gsap.fromTo(contentElement,
        { 
          scale: 0.5, 
          opacity: 0,
          y: 50
        },
        { 
          scale: 1, 
          opacity: 1,
          y: 0,
          duration: 0.5, 
          ease: 'back.out(1.7)',
          delay: 0.1
        }
      );
    });
  }

  /**
   * Fire confetti particles celebration
   */
  fireConfetti(): void {
    this.ngZone.runOutsideAngular(() => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Fire from left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        
        // Fire from right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    });
  }

  /**
   * Staggered fade-in animation for image grid
   * @param imageElements Array of image container elements
   */
  animateImagesStagger(imageElements: HTMLElement[]): void {
    if (imageElements.length === 0) return;
    
    this.ngZone.runOutsideAngular(() => {
      gsap.fromTo(imageElements,
        { 
          opacity: 0, 
          y: 20,
          scale: 0.9
        },
        { 
          opacity: 1, 
          y: 0,
          scale: 1,
          duration: 0.4, 
          stagger: 0.08,
          ease: 'power2.out'
        }
      );
    });
  }

  /**
   * Animate single image addition
   * @param imageElement The image container element
   */
  animateImageAdd(imageElement: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.fromTo(imageElement,
        { 
          opacity: 0, 
          scale: 0.8,
          rotateY: -15
        },
        { 
          opacity: 1, 
          scale: 1,
          rotateY: 0,
          duration: 0.4, 
          ease: 'back.out(1.5)'
        }
      );
    });
  }

  /**
   * Animate image removal
   * @param imageElement The image container element
   * @param onComplete Callback after animation completes
   */
  animateImageRemove(imageElement: HTMLElement, onComplete: () => void): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.to(imageElement, {
        opacity: 0,
        scale: 0.8,
        x: -50,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          this.ngZone.run(() => onComplete());
        }
      });
    });
  }

  /**
   * Animate button click ripple effect
   * @param buttonElement The button element
   */
  animateButtonClick(buttonElement: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.fromTo(buttonElement,
        { scale: 1 },
        { 
          scale: 0.95, 
          duration: 0.1, 
          yoyo: true, 
          repeat: 1,
          ease: 'power2.inOut'
        }
      );
    });
  }

  /**
   * Animate step indicator dots
   * @param dots Array of dot elements
   * @param activeIndex Current active step index
   */
  animateStepDots(dots: HTMLElement[], activeIndex: number): void {
    this.ngZone.runOutsideAngular(() => {
      dots.forEach((dot, index) => {
        if (index === activeIndex) {
          gsap.to(dot, {
            scale: 1.3,
            backgroundColor: '#EAB308', // yellow-500
            duration: 0.3,
            ease: 'back.out(2)'
          });
        } else if (index < activeIndex) {
          gsap.to(dot, {
            scale: 1,
            backgroundColor: '#22C55E', // green-500
            duration: 0.3,
            ease: 'power2.out'
          });
        } else {
          gsap.to(dot, {
            scale: 1,
            backgroundColor: '#D1D5DB', // gray-300
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      });
    });
  }

  /**
   * Animate form field focus
   * @param fieldElement The form field element
   */
  animateFieldFocus(fieldElement: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.fromTo(fieldElement,
        { boxShadow: '0 0 0 0 rgba(234, 179, 8, 0)' },
        { 
          boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.3)',
          duration: 0.2,
          ease: 'power2.out'
        }
      );
    });
  }

  /**
   * Animate form field blur
   * @param fieldElement The form field element
   */
  animateFieldBlur(fieldElement: HTMLElement): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.to(fieldElement, {
        boxShadow: '0 0 0 0 rgba(234, 179, 8, 0)',
        duration: 0.2,
        ease: 'power2.out'
      });
    });
  }
}
