class ChordSymbol extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        // Create a shadow root
        // xxx = this.innerText;
        let observer = new MutationObserver(mutations => this.mutated());
        observer.observe(this, {characterData: true, subtree: true});

        if (this.innerHTML !== '') {
            this.mutated();
        } else {
            setTimeout(() => this.mutated(), 50);
        }
    }

    mutated() {
        console.log('mutated!');
        let innerChord = this.innerHTML;
        const shadow = this.attachShadow({mode: 'open'});
        console.log('rendering ');
        console.log(innerChord);
        innerChord = innerChord.replace('/o', 'ø');
        let rnAlone = '';
        let symbols = [];
        let inRNAlone = true;
        let appendToLastSymbol = false;
        for (let i = 0; i < innerChord.length; i++) {
            let sym = innerChord[i];
            sym = sym.replace('b', '♭').replace('#', '♯');
            if (['I', 'i', 'V', 'v'].includes(sym)) {
                rnAlone += sym;
            } else if (
                ['♯', '♭'].includes(sym) &&
                inRNAlone &&
                ['I', 'i', 'V', 'v'].includes(innerChord[i + 1])
            ) {
                rnAlone += sym;
            } else if (['♯', '♭'].includes(sym) && inRNAlone) {
                inRNAlone = false;
                appendToLastSymbol = true;
                symbols.push(sym);
            } else {
                inRNAlone = false;
                if (['♯', '♭', 'ø', 'o', '1'].includes(sym)) {
                    if (!appendToLastSymbol) {
                        appendToLastSymbol = true;
                        symbols.push(sym);
                    } else {
                        symbols[symbols.length - 1] += sym;
                        if (symbols[symbols.length - 1].endsWith('11')) {
                            appendToLastSymbol = false;
                        }
                    }
                } else if (appendToLastSymbol) {
                    symbols[symbols.length - 1] += sym;
                    appendToLastSymbol = false;
                } else {
                    symbols.push(sym);
                }
            }
        }
        // Create a standard img element and set it's attributes.
        const div = document.createElement('div');
        // Add the image to the shadow root.
        div.innerHTML = `
        <style>
            :host {
              display: inline-block;
            }
            .grid {
              display: inline-grid;
              vertical-align: middle;
              grid-gap: 0px;
              grid-template-rows: repeat(3, .45em);
            }

            .grid3 {
              display: inline-grid;
              vertical-align: top;
              grid-gap: 0px;
              grid-template-rows: repeat(3, .35em);
            }

            .grid > div {
              font-size: .5em;
              text-align: right;
            }
            .grid3 > div {
                font-size: .4em;
                text-align: right;
            }

        </style>
        ${rnAlone}`;
        const grid = document.createElement('div');
        if (symbols.length >= 3) {
            grid.classList.add('grid3');
        } else {
            grid.classList.add('grid');
        }
        for (let i = 0; i < 3; i++) {
            const innerNum = document.createElement('div');
            const thisSym = symbols[i];
            if (thisSym !== undefined) {
                innerNum.innerText = symbols[i];
            }
            grid.appendChild(innerNum);
        }
        // Add the link to the shadow root.
        div.appendChild(grid);
        shadow.appendChild(div);
    }

    attributeChangedCallback(attrName, oldAttr, newAttr) {
        console.log('attr changed');
        console.log(this.innerHTML);
    }

    adoptedCallback() {
        console.log('adopted changed');
        console.log(this.innerHTML);
    }
}

// Define the new element
customElements.define('chord-symbol', ChordSymbol);
