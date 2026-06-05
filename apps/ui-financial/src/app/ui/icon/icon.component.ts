import { Component, input } from '@angular/core';

const PATHS: Record<string, string> = {
  home:       'M3 8L9 3l6 5v8H3V8z',
  list:       'M5 5h11M5 9h11M5 13h11',
  grid:       'M3 3h6v6H3zM10 3h6v6h-6zM3 10h6v6H3zM10 10h6v6h-6',
  plus:       'M9 3v12M3 9h12',
  card:       'M2 5h14v9H2z M2 8h14',
  target:     'M9 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0 M9 9m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  repeat:     'M3 7l2-2 2 2 M15 11l-2 2-2-2 M5 5h6a4 4 0 0 1 4 4v2 M13 13H7a4 4 0 0 1-4-4V7',
  chart:      'M3 14V8M7 14V4M11 14v-7M15 14V2',
  layers:     'M9 2l7 4-7 4-7-4 7-4z M2 11l7 4 7-4',
  arrowLeft:  'M11 4L6 9l5 5',
  arrowRight: 'M7 4l5 5-5 5',
  arrowUp:    'M4 11l5-5 5 5',
  arrowDown:  'M4 7l5 5 5-5',
  search:     'M8 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10z M12 12l3 3',
  filter:     'M2 4h14L11 10v5l-4-2v-3L2 4',
  download:   'M9 3v9 M5 9l4 4 4-4 M3 15h12',
  settings:   'M9 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5 M9 1v2 M9 15v2 M3.4 3.4l1.4 1.4 M13.2 13.2l1.4 1.4 M1 9h2 M15 9h2 M3.4 14.6l1.4-1.4 M13.2 4.8l1.4-1.4',
  bell:       'M9 2v1 M5 8a4 4 0 1 1 8 0v4l1 2H4l1-2V8z M7 16a2 2 0 0 0 4 0',
  check:      'M3 9l4 4 8-8',
  x:          'M4 4l10 10 M14 4L4 14',
  chevDown:   'M4 7l5 5 5-5',
  chevRight:  'M7 4l5 5-5 5',
  chevUp:     'M4 11l5-5 5 5',
  chevLeft:   'M11 4L6 9l5 5',
  calendar:   'M3 5h12v10H3z M3 8h12 M6 3v3 M12 3v3',
  receipt:    'M4 2h10v14l-2-1-2 1-2-1-2 1-2-1V2z M6 5h6 M6 8h6 M6 11h4',
  flame:      'M9 2c0 4-4 5-4 8a4 4 0 0 0 8 0c0-2-2-2-2-4 0-2 1-2 1-4-1 0-3 0-3 0',
  bank:       'M2 7L9 2l7 5 M3 7h12v8H3z M5 9v4 M8 9v4 M11 9v4 M14 9v4',
  upload:     'M9 13V4 M5 8l4-4 4 4 M3 15h12',
  pix:        'M9 2L4 7l5 5 5-5-5-5z M9 12v4',
};

@Component({
  selector: 'cf-icon',
  standalone: true,
  templateUrl: './icon.component.html',
})
export class IconComponent {
  name = input.required<string>();
  size = input(14);
  color = input('currentColor');

  path() {
    return PATHS[this.name()] ?? PATHS['list'];
  }
}
