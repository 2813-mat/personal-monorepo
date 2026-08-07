import { Injectable, inject, type WritableSignal } from '@angular/core';
import { ToastService } from '../../ui/toast/toast.service';

/**
 * Toda falha de escrita segue o mesmo par: grava a mensagem no sinal de erro do
 * recurso e mostra o toast. Estava duplicado em cada `error:` do AppDataService.
 */
@Injectable({ providedIn: 'root' })
export class FailureReporter {
  private toast = inject(ToastService);

  report(message: string, errorSignal: WritableSignal<string | null>): void {
    errorSignal.set(message);
    this.toast.show(message, 'neg');
  }
}
