import { Injectable, signal } from '@angular/core';

export type ToastType = 'pos' | 'neg' | 'warn';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: { label: string; callback: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;

  show(
    message: string,
    type: ToastType = 'pos',
    action?: { label: string; callback: () => void },
  ): number {
    const id = this.nextId++;
    this._toasts.update(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => this.dismiss(id), 4000);
    return id;
  }

  dismiss(id: number): void {
    this._toasts.update(prev => prev.filter(t => t.id !== id));
  }
}
