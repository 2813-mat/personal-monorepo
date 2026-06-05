import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'cf-progress-bar',
  standalone: true,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
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
