'use strict';

(function() {
    class ParallaxImage extends HTMLElement {

        SENSOR_THRESHOLD = 10;
        SENSOR_SCALER = 20;

        static get observedAttributes() { return ['rotation']; };

        constructor() {
            super();
            const shadow = this.attachShadow({ mode: 'open' });
            const parallaxImageContainer = document.createElement('div');

            this.imageLoadCounter = 0;
            this.handleMouseMove = this.onMouseMove.bind(this);
            this.handleImageLoad = this.onImageLoad.bind(this);
            this.handleDeviceMotion = this.onDeviceMotion.bind(this);

            parallaxImageContainer.classList.add('parallax-image');
            parallaxImageContainer.innerHTML = `
                ${this.images.map(a => `<img src="${a}"></img>`).join('')}
                <style>
                    img { position: absolute; }
                    .parallax-image { position: relative; }
                </style>
            `;
            shadow.appendChild(parallaxImageContainer);
            this.updateStyles(0, 0);
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === "rotation") {
                const rotation = newValue.split(" ");
                const x = rotation[0];
                const y = rotation[1];
                this.updateStyles(x, y);
            }
        }

        connectedCallback() {
            this.elements.forEach(a => a.addEventListener('load', this.handleImageLoad, false));
        }

        disconnectedCallback() {
            window.removeEventListener("mousemove", this.handleMouseMove);
            window.removeEventListener("devicemotion", this.handleDeviceMotion);
            this.elements.forEach(a => a.removeEventListener('load', this.handleImageLoad, false));
        }

        get elements() {
            return [].slice.call(this.shadowRoot.querySelectorAll('img'));
        }

        get images() {
            const attributes = [...this.attributes].filter(a => a.name.includes('src'));
            const sortedAttributes = attributes.sort((a, b) => {
                const aIndex = a.name.split("-")[1];
                const bIndex = b.name.split("-")[1];
                if (aIndex < bIndex) {
                    return -1;
                } else {
                    return 1;
                }
                return 0;
            });

            const images = [];
            [...sortedAttributes].forEach(attr => {
                images.push(attr.value);
            });
            return images;
        }

        get maxHeight() {
            const getMax = ( max, cur ) => Math.max( max, cur );
            return this.elements.map(a => a.offsetHeight).reduce(getMax, -Infinity);
        }

        get maxWidth() {
            const getMax = ( max, cur ) => Math.max( max, cur );
            return this.elements.map(a => a.offsetWidth).reduce(getMax, -Infinity);
        }

        get perspective() {
            return this.getAttribute('perspective') || 1000;
        }

        get scalar() {
            return this.getAttribute('scalar') || 3;
        }

        get spacing() {
            return this.getAttribute('spacing') || 10;
        }

        get startZ() {
            return this.getAttribute('startz') || 100;
        }

        initialize() {
            this.updateDimensions();
            window.addEventListener("mousemove", this.handleMouseMove);
            window.addEventListener("devicemotion", this.handleDeviceMotion);
        }

        rotate(x, y) {
            this.setAttribute("rotation", `${x} ${y}`);
        }

        updateDimensions() {
            const el = this.shadowRoot.querySelector(".parallax-image");
            el.style.width = `${this.maxWidth}px`;
            el.style.height = `${this.maxHeight}px`;
        }

        updateStyles(x, y) {
            this.shadowRoot.querySelector('style').textContent = `
                .parallax-image {
                    backface-visibility: hidden;
                    border-radius: 60px;
                    overflow: hidden;
                    position: relative;
                    perspective-origin: 50% 50%;
                    transform: perspective(${this.perspective}px) rotateX(${x}deg) rotateY(${y}deg);
                }
                ${this.images.map((a, b) => {
                    const z = b * this.spacing + Number(this.startZ);
                    return `
                        img:nth-child(${b + 1}) {
                            backface-visibility: hidden;
                            left: 0;
                            perspective-origin: 50% 50%;
                            position: absolute;
                            top: 0;
                            transform: perspective(${this.perspective}px) rotateX(${x}deg) rotateY(${y}deg) translateZ(${(z)}px);
                        }
                    `;
                }).join("")}
            `;
        }

        onDeviceMotion(e) {
            const rotation = e.rotationRate || {};
            if (Math.abs(rotation.alpha) > this.SENSOR_THRESHOLD || Math.abs(rotation.beta) > this.SENSOR_THRESHOLD) {
                const x = -(rotation.alpha || 0) / this.SENSOR_SCALER; //  -90 :: 90
                const y = (rotation.beta || 0) / this.SENSOR_SCALER; // -180 :: 180
                this.rotate(x, y);
            }
        }

        onImageLoad() {
            this.imageLoadCounter++;
            if (this.imageLoadCounter === this.elements.length) {
                this.initialize();
            }
        }

        onMouseMove(e) {
            const x = e.pageX - this.offsetLeft;
            const y = e.pageY - this.offsetTop;
			const width = this.maxWidth;
            const xAngle = (0.5 - (y / width)) * this.scalar;
			const yAngle = -(0.5 - (x / width)) * this.scalar;
            this.rotate(xAngle, yAngle);
        }
    }

    // let the browser know about the custom element
    customElements.define('parallax-img', ParallaxImage);
})();
