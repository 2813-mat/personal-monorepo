import { Component, input, computed } from '@angular/core';
import type { Holder } from '@caixa-familia/shared-types';

@Component({
  selector: 'cf-avatar',
  standalone: true,
  template: `
    <span
      class="avatar"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="size() * 0.5"
      [style.background]="bgColor()"
    >{{ letter() }}</span>
  `,
  styles: [`
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
  `],
})
export class AvatarComponent {
  holder = input.required<Holder>();
  size = input(18);

  letter = computed(() => {
    if (this.holder() === 'Thais') return 'T';
    if (this.holder() === 'Mateus') return 'M';
    return '·';
  });

  bgColor = computed(() => {
    if (this.holder() === 'Thais') return '#7A1F3D';
    if (this.holder() === 'Mateus') return '#1F4E79';
    return '#475569';
  });
}
