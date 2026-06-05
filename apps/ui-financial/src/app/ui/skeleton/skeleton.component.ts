import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'cf-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  width = input<string | number>('100%');
  height = input<string | number>(16);
  lines = input(1);
  gap = input(8);

  bars = computed(() => {
    const count = Math.max(1, this.lines());
    const w = this.toCss(this.width());
    const h = this.toCss(this.height());
    const result: { width: string; height: string }[] = [];
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const barWidth = count > 1 && isLast ? '60%' : w;
      result.push({ width: barWidth, height: h });
    }
    return result;
  });

  private toCss(value: string | number): string {
    return typeof value === 'number' ? `${value}px` : value;
  }
}
