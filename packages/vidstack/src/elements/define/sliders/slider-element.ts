import { Host } from 'maverick.js/element';

import { Slider } from '../../../components';

/**
 * @docs {@link https://www.vidstack.io/docs/player/components/sliders/slider}
 * @example
 * ```html
 * <media-slider min="0" max="100" value="50" aria-label="...">
 *   <div class="slider-track"></div>
 *   <div class="slider-track-fill"></div>
 *   <div class="slider-track-progress"></div>
 *   <div class="slider-thumb"></div>
 * </media-slider>
 * ```
 */
export class MediaSliderElement extends Host(HTMLElement, Slider) {
  static tagName = 'media-slider';
}

declare global {
  interface HTMLElementTagNameMap {
    'media-slider': MediaSliderElement;
  }
}