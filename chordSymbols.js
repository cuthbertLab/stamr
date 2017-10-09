class ChordSymbol extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    console.log('connected');
        // Create a shadow root
    const shadow = this.attachShadow({mode: 'open'});
    let innerChord = this.innerHTML;
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
      } else if (['♯', '♭'].includes(sym) && inRNAlone) {
        rnAlone += sym;
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

.grid > div {
  font-size: .5em;
  text-align: right;
}
</style>
${rnAlone}`;
    const grid = document.createElement('div');
    grid.classList.add('grid');
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
    console.log(shadow.innerHTML);
  }
}

// Define the new element
customElements.define('chord-symbol', ChordSymbol);
