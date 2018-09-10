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
          position: relative;
          top: -20px;
        }
        music-symbol:hover {
            cursor: pointer;
        }
        #del {
            cursor: pointer;
        }

        </style>
        <div class='triangle-border'>
            <span class='rhythmChooser'>
            <music-symbol>mensuralBlackLonga</music-symbol>
            <music-symbol>mensuralBlackBrevis</music-symbol>
            <music-symbol>mensuralBlackSemibrevis</music-symbol>
            <music-symbol>mensuralBlackMinima</music-symbol>
            <music-symbol>mensuralBlackSemiminima</music-symbol>
            <music-symbol>mensuralBlackMinimaVoid</music-symbol>
            <music-symbol>mensuralBlackSemibrevisCaudata</music-symbol>
            <music-symbol>augmentationDot</music-symbol>
            <span id="del">&#x232B;</span>
            </span>
        </div>
        <div id="instructions"></div>
        <img id='outImage'></img>
        `;
        this.$div = $(div);
        // const $imgButton = $(div).find('#copyAsImage');
        // $imgButton.on('click', e => copyImage(this.canvas));
        $(div)
            .find('#del')
            .on('click', e => {
                this.$div.find('#instructions').html();
                console.log('CLICK!');
                this.symbols.pop();
                this.redrawImage();
            });

        const $symbols = $(div).find('music-symbol');
        this.imgOut = $(div).find('#outImage')[0];
        this.symbols = [];
        $symbols.on('click', e => {
            // this.canvas.width = this.currentPosition + 100;
            this.symbols.push(e.target.dataset.codepoint);
            this.redrawImage();
        });
        shadow.appendChild(div);
    }

    redrawImage() {
        if (this.symbols.length) {
            this.$div
                .find('#instructions')
                .html('Drag me to your MS Word or other document:');
        }
        const canvas = document.createElement('canvas');
        $(canvas)
            .attr('width', 60 * this.symbols.length + 50)
            .attr('height', 150)[0];
        const ctx = canvas.getContext('2d');
        ctx.font = '80px Bravura';
        for (let i = 0; i < this.symbols.length; i++) {
            ctx.fillText(this.symbols[i], i * 60 + 10, 100);
        }
        this.imgOut.src = canvas.toDataURL();
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
