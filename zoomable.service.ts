import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ZoomableService {
  private readonly maxZoom = 25;
  private readonly minZoom = 1;
  private renderer: Renderer2;
  private scale: number = 1;
  private panning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private endX: number = 0;
  private endY: number = 0;
  private initialTouchGap = 0;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  makeZoomable(parentContainer: HTMLElement, zoomableContainer: HTMLElement) {

    // Set the main parent to hide overflow
    parentContainer.style.overflow = 'hidden';

    // Set the zoomable container to relative position
    zoomableContainer.style.position = 'relative';

    // If not on mobile device, change cursor to grab
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      parentContainer.style.cursor = 'grab';
    }

    // Add mouse wheel event for zooming
    this.renderer.listen(parentContainer, 'wheel', (event: WheelEvent) => this.onWheel(event, zoomableContainer));

    // Adding mouse events for dragging
    this.renderer.listen(parentContainer, 'mousedown', (event: MouseEvent) => this.onMouseDown(event, parentContainer));
    this.renderer.listen(parentContainer, 'mousemove', (event: MouseEvent) => this.onMouseMove(event, zoomableContainer));
    this.renderer.listen(parentContainer, 'mouseup', (event: MouseEvent) => this.onMouseUp(event, parentContainer));
    this.renderer.listen(parentContainer, 'mouseleave', (event: MouseEvent) => this.onMouseUp(event, parentContainer));

    // Adding touch events for dragging
    this.renderer.listen(parentContainer, 'touchstart', (event: TouchEvent) => this.onTouchStart(event, zoomableContainer));
    this.renderer.listen(parentContainer, 'touchmove', (event: TouchEvent) => this.onTouchMove(event, zoomableContainer));
    this.renderer.listen(parentContainer, 'touchend', () => this.onTouchEnd(zoomableContainer));
  }

  private onWheel(event: WheelEvent, zoomableContainer: HTMLElement) {
    event.preventDefault();
    this.scale += event.deltaY * -0.001;
    this.scale = Math.round(Math.min(Math.max(this.minZoom, this.scale), this.maxZoom) * 10) / 10;

    let rect = zoomableContainer.getBoundingClientRect();
    const originX = (event.clientX - rect.left) / rect.width * 100;
    const originY = (event.clientY - rect.top) / rect.height * 100;

    this.renderer.setStyle(zoomableContainer, 'transform-origin', `${originX}% ${originY}%`);
    this.renderer.setStyle(zoomableContainer, 'scale', `${this.scale}`);

    const transformedOrigin = window.getComputedStyle(zoomableContainer).transformOrigin.split(' ');
    const newOriginX = parseFloat(transformedOrigin[0]);
    const newOriginY = parseFloat(transformedOrigin[1]);
    this.renderer.setStyle(zoomableContainer, 'left', `${event.clientX - newOriginX}px`);
    this.renderer.setStyle(zoomableContainer, 'top', `${event.clientY - newOriginY}px`);
    this.endX = event.clientX - newOriginX;
    this.endY = event.clientY - newOriginY;
  }

  private onMouseDown(event: MouseEvent, mainContainer: HTMLElement) {
    event.preventDefault();
    mainContainer.style.cursor = 'grabbing';
    this.panning = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
  }

  private onMouseMove(event: MouseEvent, zoomableContainer: HTMLElement) {
    if (this.panning) {
      const x = (event.clientX - this.startX) + this.endX;
      const y = (event.clientY - this.startY) + this.endY;
      this.renderer.setStyle(zoomableContainer, `left`, `${x}px`);
      this.renderer.setStyle(zoomableContainer, `top`, `${y}px`);
    }
  }

  private onMouseUp(event: MouseEvent, mainContainer: HTMLElement) {
    if (this.panning) {
      mainContainer.style.cursor = 'grab';
      this.panning = false;
      this.endX += (event.clientX - this.startX);
      this.endY += (event.clientY - this.startY);
    }
  }

  private onTouchStart(event: TouchEvent, zoomableContainer: HTMLElement) {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.panning = true;
      this.startX = event.touches[0].clientX;
      this.startY = event.touches[0].clientY;
    } else if (event.touches.length === 2) {
      this.initialTouchGap = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY
      );
      this.scale = this.getZoomLevel(zoomableContainer);
    }
  }

  private onTouchMove(event: TouchEvent, zoomableContainer: HTMLElement) {
    event.preventDefault();
    if (this.panning && event.touches.length === 1) {
      const x = (event.touches[0].clientX - this.startX) + this.endX;
      const y = (event.touches[0].clientY - this.startY) + this.endY;
      this.renderer.setStyle(zoomableContainer, `left`, `${x}px`);
      this.renderer.setStyle(zoomableContainer, `top`, `${y}px`);
    } else if (event.touches.length === 2) {
      const damper = 0.05;
      const midpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midpointY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      let rect = zoomableContainer.getBoundingClientRect();
      const originX = (midpointX - rect.left) / rect.width * 100;
      const originY = (midpointY - rect.top) / rect.height * 100;
      this.renderer.setStyle(zoomableContainer, 'transform-origin', `${originX}% ${originY}%`);

      const currentTouchGap = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY
      );
      this.scale = this.scale * ((currentTouchGap / this.initialTouchGap - 1) * damper + 1);
      this.scale = Math.min(Math.max(this.minZoom, this.scale), this.maxZoom);
      console.log(this.scale)
      this.renderer.setStyle(zoomableContainer, 'transform', `scale(${this.scale})`);
      const transformedOrigin = window.getComputedStyle(zoomableContainer).transformOrigin.split(' ');
      const newOriginX = parseFloat(transformedOrigin[0]);
      const newOriginY = parseFloat(transformedOrigin[1]);
      this.renderer.setStyle(zoomableContainer, 'left', `${midpointX - newOriginX}px`);
      this.renderer.setStyle(zoomableContainer, 'top', `${midpointY - newOriginY}px`);
    }
  }

  private onTouchEnd(zoomableContainer: HTMLElement) {
    this.panning = false;
    this.endX = parseInt(window.getComputedStyle(zoomableContainer).getPropertyValue('left'));
    this.endY = parseInt(window.getComputedStyle(zoomableContainer).getPropertyValue('top'));
  }

  private getZoomLevel(element: HTMLElement): number {
    const scale = window.getComputedStyle(element).transform.split(',')[0].split('(')[1];
    if (scale && scale !== 'none') {
      return parseFloat(scale);
    }
    return 1;
  }

  // Reset all zoomable properties to default
  // Should be invoked when the component is destroyed
  reset() {
    this.scale = 1;
    this.panning = false;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.initialTouchGap = 0;
  }
}
