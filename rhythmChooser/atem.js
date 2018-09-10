class MusicSymbol extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        let observer = new MutationObserver(mutations => this.mutated());
        observer.observe(this, {characterData: true, subtree: true});

        if (this.innerHTML !== '') {
            this.mutated();
        } else {
            setTimeout(() => this.mutated(), 50);
        }
    }

    mutated() {
        const shadow = this.attachShadow({mode: 'open'});
        const innerSymbol = this.innerHTML;
        $(this).attr('data-symbol', innerSymbol);
        const lookup = smuflJSON[innerSymbol];
        let codePoint = innerSymbol;
        if (lookup !== undefined) {
            const codeString = parseInt(lookup.codepoint.replace('U+', ''), 16);
            codePoint = String.fromCharCode(codeString);
            // codePoint = '&#60;';
        }

        // Create a standard img element and set it's attributes.
        const div = document.createElement('div');
        // Add the image to the shadow root.
        div.innerHTML = `
        <style>
        :host {
          display: inline-block;
        }

        .musicSymbol {
            font-family: BravuraText;
            font-size: 150%;
            position: relative;
            top: 20px;
        }
        </style>
        <span class='musicSymbol' data-symbol='${innerSymbol}'>
        ${codePoint}
        </span>`;
        $(this).attr('data-codepoint', codePoint);
        shadow.appendChild(div);
    }
}

class RhythmChooser extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        let observer = new MutationObserver(mutations => this.mutated());
        observer.observe(this, {characterData: true, subtree: true});

        if (this.innerHTML !== '') {
            this.mutated();
        } else {
            setTimeout(() => this.mutated(), 50);
        }
    }

    mutated() {
        const shadow = this.attachShadow({mode: 'open'});
        // Create a standard img element and set it's attributes.
        const div = document.createElement('div');
        // Add the image to the shadow root.
        div.innerHTML = `
        <link rel='stylesheet' type='text/css' href="speechBubbles.css" />
        <style>
        :host {
          display: inline-block;
        }
        music-symbol {
          width: 35px;
          height: 35px;
        }
        music-symbol:hover {
            cursor: pointer;
        }

        </style>
        <div class='triangle-border'>
            <span class='rhythmChooser'>
            <music-symbol>noteDoubleWholeSquare</music-symbol>
            <music-symbol>noteWhole</music-symbol>
            <music-symbol>noteHalfUp</music-symbol>
            <music-symbol>noteQuarterUp</music-symbol>
            <music-symbol>note8thUp</music-symbol>
            <music-symbol>note16thUp</music-symbol>
            <music-symbol>note32ndUp</music-symbol>
            </span>
        </div>
        <img id='outImage'></img>
        <canvas width="300" height="150" id="mainCanvas" style='display: none'>
        </canvas>
        `;
        // const $imgButton = $(div).find('#copyAsImage');
        // $imgButton.on('click', e => copyImage(this.canvas));

        const $symbols = $(div).find('music-symbol');
        this.imgOut = $(div).find('#outImage')[0];
        this.canvas = $(div).find('#mainCanvas')[0];
        this.ctx = this.canvas.getContext('2d');
        this.ctx.font = '80px Bravura';
        this.currentPosition = 0;
        $symbols.on('click', e => {
            this.ctx.fillText(
                e.target.dataset.codepoint,
                this.currentPosition,
                120,
            );
            this.currentPosition += 60;
            this.imgOut.src = this.canvas.toDataURL();
            console.log(e.target.dataset.codepoint);
        });
        shadow.appendChild(div);
    }

    selectText(element) {
        var doc = document;
        if (doc.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    copyImage(canvas) {
        var img = document.createElement('img');
        img.src = canvas.toDataURL();

        var div = document.createElement('div');
        div.contentEditable = true;
        div.appendChild(img);
        document.body.appendChild(div);

        // do copy
        this.selectText(div);
        docuent.execCommand('Copy');
        document.body.removeChild(div);
    }
}

customElements.define('music-symbol', MusicSymbol);
customElements.define('rhythm-chooser', RhythmChooser);
