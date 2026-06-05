import { Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'cf-toast-container',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  protected toastSvc = inject(ToastService);
  toasts = this.toastSvc.toasts;

  onAction(t: Toast): void {
    t.action?.callback();
    this.toastSvc.dismiss(t.id);
  }
}
