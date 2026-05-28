import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'cf-progress-bar',
  standalone: true,
  template: `
    <div class="pbar" [style.height.px]="height()">
      <div class="pbar__fill" [style.width]="pct() + '%'" [style.background]="color()"></div>
    </div>
  `,
  styles: [`
    .pbar {
      width: 100%;
      background: var(--line-soft);
      position: relative;
      overflow: hidden;
    }
    .pbar__fill {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      background: var(--brand);
      transition: width 0.3s ease;
    }
  `],
})
export class ProgressBarComponent {
  value = input.required<number>();
  max = input.required<number>();
  color = input<string | undefined>(undefined);
  height = input(4);

  pct = computed(() => {
    if (this.max() <= 0) return 0;
    return Math.min(100, Math.max(0, (this.value() / this.max()) * 100));
  });
}
