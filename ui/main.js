const MIN_ROWS = 4;
const MAX_ROWS = 14;

const REFRESH_INTERVAL_MS = 50;

const PIXEL_TIMEOUT = 2000;
const PIXEL_SIZE = 35;
const PIXEL_GUTTER = 5;

const BUCKET_SECONDS = 5;

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple", "white"];

const PIXEL_COLORS = {
	red:    '#FB3D3D',
	orange: '#FB823D',
	yellow: '#C9FF0D',
	green:  '#3DFB78',
	blue:   '#0B9AFF',
	purple: '#6D3DFB',
	white:  '#FFFFFF',
};
const PIXEL_BG = '#272727';
const PIXEL_ERROR_COLOR = '#9c0303';
const PIXEL_FADE_MS = 500;
const PIXEL_SHAKE_MS = 600;
const PIXEL_SHAKE_AMPLITUDE = 3;

function lerpColor(a, b, t) {
	const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
	const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
	return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

class App {
	constructor() {
		this.colors = new Colors();
		this.interval = null;
		this.inFlight = 0;

		this.toggleInput = document.getElementById('toggle-input');
		this.toggleInput.addEventListener('change', this.toggle.bind(this));

		const c = this.getColumns();
		this.columns = c;
		const r = this.getRows();
		this.rows = r;
		this.grid = new Grid(r, c);
		this.graph = new Graph(c);
	}

	resize() {
		const c = this.getColumns();
		this.columns = c;
		const r = this.getRows();
		this.rows = r;
		this.grid.resize(r, c);
		this.graph.resize(c);
	}

	toggle() {
		if (this.toggleInput.checked) {
			this.interval = setInterval(() => this.load(), REFRESH_INTERVAL_MS);
			this.on = true;
		} else {
			clearInterval(this.interval);
			this.on = false;
		}
	}

	req() {
		const colors = Object.keys(this.colors.available) || [];
		if (colors.length == 0) {
            return "[]"
        }
        let values = []
        colors.forEach(color => {
            values.push(this.colors.available[color].values())
        })
		return JSON.stringify(values);
	}

	load() {
		if (this.inFlight >= 6) {
			return;
		}
		this.inFlight++;
	    fetch('./color', {
	        method: "POST",
	        body: this.req(),
	    })
	    .then(function(res) {
	       return res.json().then(color => ({ color, res }))
	    }).then((function(res) {
	    	const {color} = res;
	    	const error = res.res.status === 500;
	    	this.colors.add(color);
	    	if (!document.hidden) {
		        this.grid.light(this.randCoord(), color, error);
		        this.graph.record(color, error);
		    }
	    }).bind(this))
	    .finally(() => {
	    	this.inFlight--;
	    });
	}

	randCoord() {
		const row = Math.round(Math.random() * this.rows);
		const col = Math.round(Math.random() * this.columns);
		return [row, col];
	}

	getColumns() {
		return Math.round(window.innerWidth / (PIXEL_SIZE + PIXEL_GUTTER)) - 2;
	}

	getRows() {
		const gridTop = document.getElementById('grid').getBoundingClientRect().top;
		const gridMarginBottom = 32; // 2em
		const graphH = 105; // .bar height
		const bodyPaddingBottom = 15;
		const available = window.innerHeight - gridTop - gridMarginBottom - graphH - bodyPaddingBottom;
		var rows = Math.round(available / (PIXEL_SIZE + PIXEL_GUTTER));
		rows = Math.min(rows, MAX_ROWS);
		rows = Math.max(rows, MIN_ROWS);
		return rows;
	}
}

class Button {
	constructor(suffix, onClick) {
		this.container = document.querySelector(`.button--${suffix}`);
		this.container.addEventListener("click", onClick);
	}

	select() {
		this.container.classList.add("button--selected");
	}

	deselect() {
		this.container.classList.remove("button--selected");
	}

	hide() {
		this.container.style.visibility = "hidden";
	}

	show() {
		this.container.style.visibility = "visible";
	}
}

class Slider {
	constructor(name, unitLabel, onChange) {
		this.slider = document.getElementById(name);
		this.label = document.getElementById(`${name}-label`);
		this.unit = unitLabel;
		this.update();
		this.onChange = onChange.bind(this);
		this.slider.oninput = this.update.bind(this);
	}

	format(val) {
		return `${Math.round(val * 10) / 10 || 0}${this.unit}`;
	}

	update() {
		this.value = this.slider.value;
		this.onChange && this.onChange(this.value);
		this.label.innerHTML = this.format(this.value);
	}

	setValue(val) {
		this.value = val || 0;
		this.label.innerHTML = this.format(this.value);
		this.slider.value = this.value;
	}
}

class Colors {
	constructor() {
		this.available = {};
		this.container = document.getElementById("colors");
		this.selected = null;

    	this.latencySlider = new Slider("latency", "s", l => {
    		if (this.selected) {
    			this.available[this.selected].latency = l;
    		}
    	});
		this.errorSlider = new Slider("error", "%", e => {
    		if (this.selected) {
    			this.available[this.selected].error = e;
    		}
    	});
	}

	add(color) {
		if (!this.available[color]) {
			const c = new Color(color, () => this.select(color));
	    	this.container.appendChild(c.container);
	    	this.available[color] = c;
	    	this.select(color);
		}
	}

	select(color) {
		if (this.selected !== color) {
			if (this.selected) {
				this.available[this.selected].container.classList.remove('colors__selected');
			}
			this.selected = color;
			this.available[color].container.classList.add('colors__selected');
			this.latencySlider.setValue(this.available[color].latency);
			this.errorSlider.setValue(this.available[color].error);
		}
	}

	list() {
		return Object.keys(this.available);
	}
}

class Color {
	constructor(name, onClick) {
		this.name = name;
		const el = document.createElement("div");
    	el.classList.add(`colors__${name}`);
    	el.addEventListener("click", onClick.bind(this));
    	this.container = el;
		this.latency = 0;
		this.error = 0;
	}

	values() {
		return {
	        "color": this.name,
	        "return500": parseInt(this.error, 10),
	        "delayLength": parseFloat(this.latency),
	    }
	}
}

class Grid {
	constructor(r, c) {
		this.canvas = document.getElementById('grid');
		this.ctx = this.canvas.getContext('2d');
		this.pixels = [];
		this.activePixels = new Set();
		this.resize(r, c);
		requestAnimationFrame(this.draw.bind(this));
	}

	resize(rows, cols) {
		this.rows = rows;
		this.cols = cols;
		this.canvas.width = cols * (PIXEL_SIZE + PIXEL_GUTTER) - PIXEL_GUTTER;
		this.canvas.height = rows * (PIXEL_SIZE + PIXEL_GUTTER) - PIXEL_GUTTER;
		this.activePixels.clear();
		this.pixels = Array.from({length: rows}, (_, r) =>
			Array.from({length: cols}, (_, c) => ({ row: r, col: c, color: null, error: false, litAt: 0 }))
		);
		// Draw initial background for all pixels
		this.ctx.fillStyle = PIXEL_BG;
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				this.ctx.fillRect(c * (PIXEL_SIZE + PIXEL_GUTTER), r * (PIXEL_SIZE + PIXEL_GUTTER), PIXEL_SIZE, PIXEL_SIZE);
			}
		}
	}

	light(coord, color, error) {
		const [row, col] = coord;
		if (this.pixels[row]?.[col] !== undefined) {
			const px = this.pixels[row][col];
			px.color = color;
			px.error = error;
			px.litAt = Date.now();
			this.activePixels.add(px);
		}
	}

	draw() {
		const ctx = this.ctx;
		const now = Date.now();
		for (const px of this.activePixels) {
			const age = now - px.litAt;
			const x = px.col * (PIXEL_SIZE + PIXEL_GUTTER);
			const y = px.row * (PIXEL_SIZE + PIXEL_GUTTER);
			if (age >= PIXEL_TIMEOUT) {
				ctx.fillStyle = PIXEL_BG;
				ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
				this.activePixels.delete(px);
			} else {
				const base = PIXEL_COLORS[px.color] || PIXEL_COLORS.yellow;
				const fadeStart = PIXEL_TIMEOUT - PIXEL_FADE_MS;
				const pixelColor = age > fadeStart ? lerpColor(base, PIXEL_BG, (age - fadeStart) / PIXEL_FADE_MS) : base;
				let offsetX = 0;
				if (px.error && age < PIXEL_SHAKE_MS) {
					const t = age / PIXEL_SHAKE_MS;
					offsetX = Math.round(Math.sin(age * 0.05) * PIXEL_SHAKE_AMPLITUDE * (1 - t));
				}
				ctx.save();
				ctx.beginPath();
				ctx.rect(x, y, PIXEL_SIZE, PIXEL_SIZE);
				ctx.clip();
				ctx.fillStyle = PIXEL_BG;
				ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
				ctx.fillStyle = pixelColor;
				ctx.fillRect(x + offsetX, y, PIXEL_SIZE, PIXEL_SIZE);
				if (px.error) {
					ctx.strokeStyle = PIXEL_ERROR_COLOR;
					ctx.lineWidth = 3;
					ctx.strokeRect(x + offsetX + 1.5, y + 1.5, PIXEL_SIZE - 3, PIXEL_SIZE - 3);
				}
				ctx.restore();
			}
		}
		requestAnimationFrame(this.draw.bind(this));
	}
}

class Graph {
	constructor(c) {
		this.container = document.getElementById("graph");
		this.buckets = [];
		this.liveBar = null;
		this.liveDirty = false;
		this.resize(c);
		requestAnimationFrame(this.rafLoop.bind(this));
		setInterval(this.tick.bind(this), BUCKET_SECONDS * 1000)
	}

	rafLoop() {
		if (this.liveDirty) {
			this.updateLiveBar();
			this.liveDirty = false;
		}
		requestAnimationFrame(this.rafLoop.bind(this));
	}

	record(color, error) {
		const curBucket = this.buckets[this.buckets.length-1];
		if (!curBucket) {
			return;
		}
		curBucket.drip(color, error);
		this.liveDirty = true;
	} 

	resize(col) {
		const bucketLen = this.buckets.length
		if (col < bucketLen) {
			for (let i = 0; i < bucketLen - col; i++) {
				this.buckets.pop();
				this.container.removeChild(this.container.firstChild);
			}
		} else if (col > bucketLen) {
			for (let i = 0; i < col - bucketLen; i++) {
				this.buckets.unshift(new Bucket());
				const bar = document.createElement("div");
				bar.classList.add('bar');
				this.container.prepend(bar);
			}
		}
		this.liveBar = this.container.lastChild;
	}

	updateLiveBar() {
		const curBucket = this.buckets[this.buckets.length-1];
		this.liveBar.innerHTML = curBucket.full().innerHTML;
	}

	tick() {
		this.container.removeChild(this.container.firstChild);
		const newBar = document.createElement("div");
		newBar.classList.add('bar');
		this.container.append(newBar);
		this.liveBar = newBar;
		this.buckets.shift();
		this.buckets.push(new Bucket());
	}
}

class Bucket {
	constructor() {
		const reqPerSecond = 1000 / REFRESH_INTERVAL_MS;
		this.capacity = BUCKET_SECONDS * reqPerSecond;
		this.amounts = {};
	}

	drip(color, error) {
		if (!this.amounts[color]) {
			this.amounts[color] = {ok: 0, error: 0};
		}
		if (error) {
			this.amounts[color].error += 1;
		} else {
			this.amounts[color].ok += 1;
		}
	}

	genFill(amount, c, error) {
		const fill = document.createElement("div");
		fill.classList.add('bar__fill');
		fill.classList.add(`graph__${c}`);
		if (error) {
			fill.classList.add(`bar__fill--error`);
		}
		fill.style.height = `${100 * amount/this.capacity}%`;
		return fill;
	}

	full() {
		const el = document.createElement("div");
		el.classList.add('bar');
		for (const c of COLORS) {
			if (!this.amounts[c]) {
				continue
			}
			const ok = this.amounts[c].ok;
			if (ok > 0) {
				const okFill = this.genFill(this.amounts[c].ok, c, false);
				el.appendChild(okFill);	
			}
			const errors = this.amounts[c].error;
			if (errors > 0) {
				const errFill = this.genFill(this.amounts[c].error, c, true);
				el.appendChild(errFill);
			}
		}
		return el;
	}
}

const app = new App();
app.toggle();
let resizeTimer;
window.addEventListener("keydown", (e) => {
	if (e.code === 'Space' && e.target === document.body) {
		e.preventDefault();
		app.toggleInput.checked = !app.toggleInput.checked;
		app.toggle();
	}
});
window.addEventListener("resize", () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => app.resize(), 100);
});