import { Injectable, signal } from '@angular/core';

// Espelha $bp-desktop de styles/_responsive.scss. Os dois precisam andar juntos:
// se um mudar sem o outro, a tabela e o CSS discordam sobre o que é desktop.
const DESKTOP_QUERY = '(min-width: 768px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly desktop = signal(false);

  /** `true` a partir de 768px de largura. */
  readonly isDesktop = this.desktop.asReadonly();

  constructor() {
    const mql = window.matchMedia(DESKTOP_QUERY);
    this.desktop.set(mql.matches);
    mql.addEventListener('change', e => this.desktop.set(e.matches));
  }
}
