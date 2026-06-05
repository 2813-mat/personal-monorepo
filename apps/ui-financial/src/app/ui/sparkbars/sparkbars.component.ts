import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'cf-sparkbars',
  standalone: true,
  templateUrl: './sparkbars.component.html',
})
export class SparkbarsComponent {
  data = input.required<number[]>();
  height = input(24);
  width = input(80);
  baseColor = input('#9CA3AF');
  highlightColor = input('#0F2D4F');
  highlightIndex = input(-1);

  bars = computed(() => {
    const d = this.data();
    const h = this.height();
    const w = this.width();
    const max = Math.max(...d, 1);
    const barW = (w - (d.length - 1) * 2) / d.length;
    const hi = this.highlightIndex() === -1 ? d.length - 1 : this.highlightIndex();
    return d.map((v, i) => {
      const barH = Math.max(2, (v / max) * (h - 2));
      return {
        x: i * (barW + 2),
        y: h - barH,
        w: barW,
        h: barH,
        isHighlight: i === hi,
      };
    });
  });
}
