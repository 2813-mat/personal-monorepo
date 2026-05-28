import { Component, input, computed } from '@angular/core';

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

@Component({
  selector: 'cf-donut',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      style="transform: rotate(-90deg); display:block"
    >
      <circle
        [attr.cx]="cx()"
        [attr.cy]="cy()"
        [attr.r]="r()"
        fill="none"
        stroke="var(--line-soft)"
        [attr.stroke-width]="stroke()"
      />
      @for (arc of arcs(); track $index) {
        <circle
          [attr.cx]="cx()"
          [attr.cy]="cy()"
          [attr.r]="r()"
          fill="none"
          [attr.stroke]="arc.color"
          [attr.stroke-width]="stroke()"
          [attr.stroke-dasharray]="arc.dashArray"
          [attr.stroke-dashoffset]="arc.dashOffset"
        />
      }
    </svg>
  `,
})
export class DonutComponent {
  segments = input.required<DonutSegment[]>();
  size = input(110);
  stroke = input(18);

  cx = computed(() => this.size() / 2);
  cy = computed(() => this.size() / 2);
  r = computed(() => (this.size() - this.stroke()) / 2);

  arcs = computed(() => {
    const segs = this.segments();
    const r = this.r();
    const circ = 2 * Math.PI * r;
    const total = segs.reduce((s, x) => s + x.value, 0);
    if (total === 0) return [];

    let offset = 0;
    return segs.map(seg => {
      const len = (seg.value / total) * circ;
      const dashOffset = -offset;
      offset += len;
      return {
        color: seg.color,
        dashArray: `${len} ${circ - len}`,
        dashOffset,
      };
    });
  });
}
