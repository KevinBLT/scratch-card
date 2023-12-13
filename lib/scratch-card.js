class ScratchCard extends HTMLElement {
  canvas  = document.createElement('canvas');
  span    = document.createElement('span');
  ctx     = this.canvas.getContext('2d', { willReadFrequently: true });
  pointer = {x: 0, y: 0};

  static observedAttributes = [
    'code', 
    'scratch-word', 
    'scratch-fill',
    'scratch-size',
    'noise-factor'
  ];

  attributeChangedCallback() {
    this.span.textContent = this.code;
  }

  clamp(value, min, max) {
    return Math.min(Math.max(min, value), max);
  }

  random(fac) {
    return (0.5 - Math.random()) * fac;
  }

  prop(name) {
    const style = window.getComputedStyle(this);

    return this.getAttribute(name) || style.getPropertyValue('--' + name) || null;
  }

  get code() {
    return this.getAttribute('code');
  }

  get scratchWord() {
    return this.prop('scratch-word') ?? '';
  }

  get scratchFill() {
    return this.prop('scratch-fill') ?? '#BBB';
  }

  get scratchSize() {
    return parseInt(this.prop('scratch-size') ?? '8');
  }

  get noiseFactor() {
    return parseInt(this.prop('noise-factor') ?? '20');
  }

  static {
    
  }

  pointFromEvent(e) {
    const bbox = this.canvas.getBoundingClientRect();

    return {
      x: e.clientX - bbox.left,
      y: e.clientY - bbox.top
    };
  }

  constructor() {
    super();

    this.attachShadow({mode: 'open'});

    this.addEventListener('mousemove', (e) => {
      const p = this.pointFromEvent(e);
  
      if (e.buttons) {
        this.draw(p.x, p.y);
      }

      Object.assign(this.pointer, p);
    });

    this.addEventListener('touchstart', (e) => {
      
      for (const touch of e.targetTouches) {
        Object.assign(this.pointer, this.pointFromEvent(touch));
        break;
      }  

      e.preventDefault();
      e.stopPropagation();
    });

    this.addEventListener('touchmove', (e) => {
      
      for (const touch of e.targetTouches) {
        const p = this.pointFromEvent(touch);

        this.draw(p.x, p.y);

        Object.assign(this.pointer, p);

        break;
      }  

      e.preventDefault();
      e.stopPropagation();
    });

    const link = document.createElement('link');

    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = new URL('./scratch-card.css', import.meta.url);

    this.shadowRoot.append(link, this.span, this.canvas);
  }

  updatePercentageScratched() {
    const image      = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
          percentage = image.data.filter(
          (v, i) => i > 0 && (i % 4) == 0 && v == 0
        ).length / (image.data.length / 4);

    this.dispatchEvent(new CustomEvent('scratched', {detail: percentage}));
    this.dataset.scratched = Math.round(percentage * 1000) / 1000;
  }

  connectedCallback() {
    this.#drawFoil();
  }

  draw(x, y) {   
    this.ctx.shadowColor = 'white';
    this.ctx.fillStyle   = 'white';
    this.ctx.shadowBlur  = (window.devicePixelRatio).toString();
    this.ctx.lineJoin    = 'bevel';

    const vec    = {x: x - this.pointer.x, y: y - this.pointer.y},
          length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

    vec.x /= length;
    vec.y /= length;
    
    for (let offset = 0; offset < length; offset += this.scratchSize / 2) {
      const p = {
        x: vec.x * offset + this.pointer.x,
        y: vec.y * offset + this.pointer.y,
      };
      
      this.ctx.beginPath();
      this.ctx.globalCompositeOperation = 'destination-out';

      this.ctx.moveTo(
        p.x + this.random(this.scratchSize), 
        p.y + this.random(this.scratchSize)
      );

      const randomizerCount = 15 * window.devicePixelRatio;

      for (let i = 0; i < randomizerCount; i++ ) {
        this.ctx.lineTo(
          p.x + this.random(this.scratchSize), 
          p.y + this.random(this.scratchSize)
        );
      }
      
      this.ctx.closePath();
      this.ctx.fill();

      requestIdleCallback(() => this.updatePercentageScratched());
    }
  }

  #drawFoil() {
    this.canvas.width  = this.offsetWidth  * window.devicePixelRatio;
    this.canvas.height = this.offsetHeight * window.devicePixelRatio;

    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.ctx.beginPath();
    
    this.ctx.fillStyle = this.scratchFill;

    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const image = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < image.data.length; i += 4) {
      const noise = this.random(this.noiseFactor);

      image.data[i]     = this.clamp(image.data[i]     + noise, 0, 255);
      image.data[i + 1] = this.clamp(image.data[i + 1] + noise, 0, 255);
      image.data[i + 2] = this.clamp(image.data[i + 2] + noise, 0, 255);
    }

    this.ctx.putImageData(image, 0, 0);
    this.ctx.closePath();
  }

  #shine(x, y, dx, dy) {
    const gradient  = this.ctx.createLinearGradient(-this.canvas.width * 3, 0 , x + this.canvas.width * 3, this.canvas.height * 5),
          gradient2 = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);

    const stops = 100;

    for (let i = 0; i < stops; i++) {
      if ((i % 2) == 0) gradient.addColorStop(i / stops, 'rgba(255, 0, 0, 0.75)');
      if ((i % 3) == 0) gradient.addColorStop(i / stops, 'rgba(0, 0, 0, 0.0)');
      if ((i % 4) == 0) gradient.addColorStop(i / stops, 'rgba(0, 255, 0, 0.75)');
    }

    gradient2.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient2.addColorStop(1 - ((x + 1800) / 3600), 'rgba(255,255,255, 0.8)');
    gradient2.addColorStop(1 - ((x + 1800) / 3600), 'rgba(255,255,255, 0.8)');
    gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = 'gray';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = gradient2;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }


}

customElements.define('scratch-card', ScratchCard);