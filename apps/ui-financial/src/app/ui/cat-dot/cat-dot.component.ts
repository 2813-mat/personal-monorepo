import { Component, input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';

@Component({
  selector: 'cf-cat-dot',
  standalone: true,
  template: `
    <span
      class="cat-dot"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.background]="color()"
    ></span>
  `,
  styles: [`
    .cat-dot {
      display: inline-block;
      border-radius: 50%;
      flex-shrink: 0;
    }
  `],
})
export class CatDotComponent {
  private data = inject(AppDataService);

  catId = input.required<string>();
  size = input(7);

  color = computed(() => this.data.catBy()[this.catId()]?.color ?? '#9CA3AF');
}
