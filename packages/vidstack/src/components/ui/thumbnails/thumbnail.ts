import { Component, effect, peek, State } from 'maverick.js';
import { animationFrameThrottle, listenEvent } from 'maverick.js/std';
import type { VTTCue } from 'media-captions';
import { useMediaContext, type MediaContext } from '../../../core/api/media-context';
import { findActiveCue } from '../../../core/tracks/text/utils';
import { $ariaBool } from '../../../utils/aria';
import { ThumbnailsLoader } from './thumbnail-loader';

export interface ThumbnailState {
  src: string;
  img: HTMLImageElement | null | undefined;
  coords: ThumbnailCoords | null;
  activeCue: VTTCue | null;
  loaded: boolean;
}

/**
 * Used to load and display a preview thumbnail at the given `time`.
 *
 * @docs {@link https://www.vidstack.io/docs/player/components/display/thumbnail}
 */
export class Thumbnail extends Component<ThumbnailProps, ThumbnailState> {
  static props: ThumbnailProps = {
    src: '',
    time: 0,
  };

  static state = new State<ThumbnailState>({
    src: '',
    img: null,
    coords: null,
    activeCue: null,
    loaded: false,
  });

  protected _media!: MediaContext;
  protected _thumbnails!: ThumbnailsLoader;

  private _styleResets: (() => void)[] = [];

  protected override onSetup(): void {
    this._media = useMediaContext();
    this._thumbnails = ThumbnailsLoader.create(this.$props.src);

    this.setAttributes({
      'data-loading': this._isLoading.bind(this),
      'aria-hidden': $ariaBool(this._isHidden.bind(this)),
    });
  }

  protected override onConnect(el: HTMLElement) {
    effect(this._watchImg.bind(this));
    effect(this._onLoadStart.bind(this));
    effect(this._onFindActiveCue.bind(this));
    effect(this._onResolveThumbnail.bind(this));
  }

  private _watchImg() {
    const img = this.$state.img();
    if (!img) return;
    listenEvent(img, 'load', this._onLoaded.bind(this));
  }

  private _onLoadStart() {
    const { src, loaded } = this.$state;
    src();
    loaded.set(false);
  }

  private _onLoaded() {
    const { loaded } = this.$state;
    loaded.set(true);
    this._requestResize();
  }

  private _isLoading() {
    const { loaded } = this.$state;
    return !this._isHidden() && !loaded();
  }

  private _isHidden() {
    const { duration } = this._media.$state,
      cues = this._thumbnails.$cues();
    return !Number.isFinite(duration()) || cues.length === 0;
  }

  protected _getTime() {
    return this.$props.time();
  }

  private _onFindActiveCue() {
    const time = this._getTime(),
      { activeCue } = this.$state,
      { duration } = this._media.$state,
      cues = this._thumbnails.$cues();

    if (!cues || !Number.isFinite(duration())) {
      activeCue.set(null);
      return;
    }

    activeCue.set(findActiveCue(cues, time));
  }

  private _onResolveThumbnail() {
    const { src } = this.$props,
      { coords, activeCue } = this.$state,
      cue = activeCue(),
      baseURL = peek(src);

    if (!baseURL || !cue) {
      this.$state.src.set('');
      this._resetStyles();
      return;
    }

    const [_src, _coords = ''] = (cue.text || '').split('#');
    coords.set(this._resolveThumbnailCoords(_coords));

    if (!peek(coords)) {
      this._resetStyles();
      return;
    }

    this.$state.src.set(this._resolveThumbnailSrc(baseURL, _src));
    this._requestResize();
  }

  private _resolveThumbnailSrc(baseURL: string, src: string) {
    return !/https?:/.test(src)
      ? `${baseURL.split('/').slice(0, -1).join('/')}${src.replace(/^\/?/, '/')}`.replace(
          /^\/\//,
          '/',
        )
      : src;
  }

  private _resolveThumbnailCoords(coords: string) {
    const [props, values] = coords.split('='),
      resolvedCoords = {},
      coordValues = values?.split(',');

    if (!props || !values) return null;

    for (let i = 0; i < props.length; i++) resolvedCoords[props[i]] = +coordValues[i];

    return resolvedCoords as ThumbnailCoords;
  }

  private _requestResize = animationFrameThrottle(this._resize.bind(this));

  private _resize() {
    const img = this.$state.img(),
      coords = this.$state.coords();

    if (!img || !coords || !this.el) return;

    const { w, h, x, y } = coords,
      { maxWidth, maxHeight, minWidth, minHeight } = getComputedStyle(this.el),
      minRatio = Math.max(parseInt(minWidth) / w, parseInt(minHeight) / h),
      maxRatio = Math.min(parseInt(maxWidth) / w, parseInt(maxHeight) / h),
      scale = maxRatio < 1 ? maxRatio : minRatio > 1 ? minRatio : 1;

    this._style(this.el!, '--thumbnail-width', `${w * scale}px`);
    this._style(this.el!, '--thumbnail-height', `${h * scale}px`);
    this._style(img, 'width', `${img.naturalWidth * scale}px`);
    this._style(img, 'height', `${img.naturalHeight * scale}px`);
    this._style(img, 'transform', `translate(-${x * scale}px, -${y * scale}px)`);
  }

  private _style(el: HTMLElement, name: string, value: string) {
    el.style.setProperty(name, value);
    this._styleResets.push(() => el.style.removeProperty(name));
  }

  private _resetStyles() {
    for (const reset of this._styleResets) reset();
    this._styleResets = [];
  }
}

export interface ThumbnailProps {
  /**
   * The absolute or relative URL to a [WebVTT](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
   * file resource.
   */
  src: string;
  /**
   * Finds, loads, and displays the first active thumbnail cue that's start/end times are in range.
   */
  time: number;
}

export interface ThumbnailCoords {
  w: number;
  h: number;
  x: number;
  y: number;
}