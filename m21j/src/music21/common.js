/**
 * common functions
 *
 * @exports music21/common
 */
/**
 * functions that are useful everywhere...
 *
 * @namespace music21.common
 * @memberof music21
 */
export const common = {};

/**
 * concept borrowed from Vex.Flow.Merge, though here the source can be undefined;
 * http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
 * recursive parts used in .clone()
 *
 * @function music21.common.merge
 * @param {object} destination - object to have attributes placed into
 * @param {object} source - object to take attributes from.
 * @memberof music21.common
 * @returns {object} destination
 */
common.merge = function mergeRecursive(destination, source) {
    if (source === undefined || source === null) {
        return destination;
    }
    for (const p in source) {
        if (!{}.hasOwnProperty.call(source, p)) {
            continue;
        }
        try {
            // Property in destination object set; update its value.
            if (source[p].constructor === Object) {
                destination[p] = mergeRecursive(destination[p], source[p]);
            } else {
                destination[p] = source[p];
            }
        } catch (e) {
            // Property in destination object not set; create it and set its value.
            destination[p] = source[p];
        }
    }
    return destination;
};

common.range = function common_range(start, stop, step) {
    if (step === undefined) {
        step = 1;
    }
    if (stop === undefined) {
        stop = start;
        start = 0;
    }

    const count = Math.ceil((stop - start) / step);
    return Array.apply(0, Array(count)).map((e, i) => i * step + start);
};

/**
 * Mix in another class into this class -- a simple form of multiple inheritance.
 * See articulations.Marcato for an example.
 *
 */
common.mixin = function common_mixin(OtherParent, thisClassOrObject) {
    let proto = Object.getPrototypeOf(OtherParent);
    const classProto = Object.getPrototypeOf(thisClassOrObject);

    while (proto) {
        for (const key in Object.keys(proto)) {
            if (!{}.hasOwnProperty.call(proto, key)) {
                continue;
            }
            if (!(key in classProto)) {
                classProto[key] = proto[key];
            }
        }
        proto = Object.getPrototypeOf(proto);
    }
};

/**
 * Aggregation -- closer to true multiple inheritance -- prefers last class's functions.  See
 * https://stackoverflow.com/questions/29879267/es6-class-multiple-inheritance
 *
 *  not currently used...
 */

common.aggregation = (baseClass, ...mixins) => {
    class base extends baseClass {
        constructor(...args) {
            super(...args);
            mixins.forEach(mixin => {
                copyProps(this, new mixin());
            });
        }
    }
    let copyProps = (target, source) => {
        // this function copies all properties and symbols, filtering out some special ones
        Object.getOwnPropertyNames(source)
            .concat(Object.getOwnPropertySymbols(source))
            .forEach(prop => {
                if (
                    !prop.match(
                        /^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/
                    )
                ) {
                    Object.defineProperty(
                        target,
                        prop,
                        Object.getOwnPropertyDescriptor(source, prop)
                    );
                }
            });
    };
    mixins.forEach(mixin => {
        // outside contructor() to allow aggregation(A,B,C).staticFunction() to be called etc.
        copyProps(base.prototype, mixin.prototype);
        copyProps(base, mixin);
    });
    return base;
};

/**
 * posMod - return a modulo value that is not negative
 *
 * @param  {Int} a value
 * @param  {Int} b modulo
 * @return {Int}   a mod b between 0 and b - 1
 */

common.posMod = function posMod(a, b) {
    return (a % b + b) % b;
};

/**
 *
 * Returns the statistical mode (most commonly appearing element)
 * in a.
 *
 * In case of tie, returns the first element to reach the maximum
 * number of occurrences.
 *
 * @function music21.common.statisticalMode
 * @param {Array} a - an array to analyze
 * @returns {object} element with the highest frequency in a
 */
common.statisticalMode = function statisticalMode(a) {
    if (a.length === 0) {
        return null;
    }
    const modeMap = {};
    let maxEl = a[0];
    let maxCount = 1;
    for (let i = 0; i < a.length; i++) {
        const el = a[i];
        if (modeMap[el] == null) {
            modeMap[el] = 0;
        }
        modeMap[el] += 1;
        if (modeMap[el] > maxCount) {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
};

/**
 * fromRoman - Convert a Roman numeral (upper or lower) to an int.
 *
 * @param  {string} num roman numeral representation of a number
 * @return {Int}     integer value of roman numeral;
 */

common.fromRoman = function fromRoman(num) {
    const inputRoman = num.toUpperCase();
    const subtractionValues = [1, 10, 100];
    const nums = ['M', 'D', 'C', 'L', 'X', 'V', 'I'];
    const ints = [1000, 500, 100, 50, 10, 5, 1];
    const places = [];
    for (const c of inputRoman) {
        if (!nums.includes(c)) {
            throw new Error(
                'Value is not a valid roman numeral: ' + inputRoman
            );
        }
    }
    for (let i = 0; i < inputRoman.length; i++) {
        const c = inputRoman[i];
        let value = ints[nums.indexOf(c)];
        if (i < inputRoman.length - 1) {
            const nextValue = ints[nums.indexOf(inputRoman[i + 1])];
            if (nextValue > value && subtractionValues.includes(value)) {
                value *= -1;
            }
        }
        places.push(value);
    }
    let summation = 0;
    for (const n of places) {
        summation += n;
    }
    return summation;
};

/**
 * toRoman - Convert a number from 1 to 3999 to a roman numeral
 *
 * @param  {Int} num number to convert
 * @return {string}     as roman numeral
 */

common.toRoman = function toRoman(num) {
    if (typeof num !== 'number') {
        throw new Error('expected integer, got ' + typeof num);
    }
    if (num < 0 || num > 4000) {
        throw new Error('Argument must be between 1 and 3999');
    }
    const ints = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const nums = [
        'M',
        'CM',
        'D',
        'CD',
        'C',
        'XC',
        'L',
        'XL',
        'X',
        'IX',
        'V',
        'IV',
        'I',
    ];
    let result = '';
    for (let i = 0; i < ints.length; i++) {
        const count = Math.floor(num / ints[i]);
        result += nums[i].repeat(count);
        num -= ints[i] * count;
    }
    return result;
};

/**
 * Creates a DOMObject of an SVG figure using the correct `document.createElementNS` call.
 *
 * @function music21.common.makeSVGright
 * @param {string} [tag='svg'] - a tag, such as 'rect', 'circle', 'text', or 'svg'
 * @param {object} [attrs] - attributes to pass to the tag.
 * @memberof music21.common
 * @returns {DOMObject}
 */
common.makeSVGright = function makeSVGright(tag, attrs) {
    // see http://stackoverflow.com/questions/3642035/jquerys-append-not-working-with-svg-element
    // normal JQuery does not work.
    if (tag === undefined) {
        tag = 'svg';
    }
    if (attrs === undefined) {
        attrs = {};
    }

    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) {
        if (!{}.hasOwnProperty.call(attrs, k)) {
            continue;
        }
        el.setAttribute(k, attrs[k]);
    }
    return el;
};

/**
 * Take a number such as 32 and return a string such as "nd"
 * (for "32nd") etc.
 *
 * @function music21.common.ordinalAbbreviation
 * @param {Int} value
 * @param {Boolean} [plural=false] - make plural (note that "21st" plural is "21st")
 * @return {string}
 */
common.ordinalAbbreviation = function ordinalAbbreviation(value, plural) {
    let post = '';
    const valueHundreths = value % 100;
    if (
        valueHundreths === 11
        || valueHundreths === 12
        || valueHundreths === 13
    ) {
        post = 'th';
    } else {
        const valueMod = value % 10;
        if (valueMod === 1) {
            post = 'st';
        } else if (valueMod === 2) {
            post = 'nd';
        } else if (valueMod === 3) {
            post = 'rd';
        } else {
            post = 'th';
        }
    }
    if (post !== 'st' && plural) {
        post += 's';
    }
    return post;
};

/**
 * Find a rational number approximation of this floating point.
 *
 * @function music21.common.rationalize
 * @param {number} ql - number to rationalize
 * @param {number} [epsilon=0.001] - how close to get
 * @param {Int} [maxDenominator=50] - maximum denominator
 * @returns {object|undefined} {'numerator: numerator, 'denominator': denominator}
 */
common.rationalize = function rationalize(ql, epsilon, maxDenominator) {
    epsilon = epsilon || 0.001;
    maxDenominator = maxDenominator || 50;

    for (let i = 2; i < maxDenominator; i++) {
        if (Math.abs(ql * i - Math.round(ql * i)) < epsilon) {
            const numerator = Math.round(ql * i);
            const denominator = i;
            return { numerator, denominator };
        }
    }
    return undefined;
};

/**
 * Change something that could be a string or number and might
 * end with "px" to a number.
 *
 * "400px" -> 400
 *
 * @function music21.common.stripPx
 * @param {Int|string} str -- string that might have 'px' at the end or not
 * @returns {Int} a number to use
 */
common.stripPx = function stripPx(str) {
    if (typeof str === 'string') {
        const pxIndex = str.indexOf('px');
        str = str.slice(0, pxIndex);
        return parseInt(str);
    } else {
        return str;
    }
};

/**
 * Find name in the query string (?name=value) and return value.
 *
 * @function music21.common.urlParam
 * @param {string} name - url parameter to find
 * @returns {string} may be "" if empty.
 */
common.urlParam = function urlParam(name) {
    name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results == null
        ? ''
        : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

common.arrayEquals = function arrayEquals(a1, a2) {
    if (a1.length !== a2.length) {
        return false;
    }
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] instanceof Array && a2[i] instanceof Array) {
            if (!arrayEquals(a1[i], a2[i])) {
                return false;
            }
        } else if (a1[i] !== a2[i]) {
            return false;
        }
    }
    return true;
};

const _singletonCounter = {};
_singletonCounter.value = 0;

export class SingletonCounter {
    call() {
        const post = _singletonCounter.value;
        _singletonCounter.value += 1;
        return post;
    }
}
common.SingletonCounter = SingletonCounter;

/**
 * runs a callback with either "visible" or "hidden" as the argument anytime the
 * window or document state changes.
 *
 * Depending on the browser, may be called multiple times with the same argument
 * for a single event.  For instance, Safari calls once on losing focus completely
 * but twice for a tab change.
 *
 * @function music21.common.setWindowVisibilityWatcher
 * @param {function} callback
 */
common.setWindowVisibilityWatcher = function setWindowVisibilityWatcher(
    callback
) {
    let hidden = 'hidden';

    // Standards:
    if (hidden in document) {
        document.addEventListener('visibilitychange', windowFocusChanged);
    } else if ('mozHidden' in document) {
        hidden = 'mozHidden';
        document.addEventListener('mozvisibilitychange', windowFocusChanged);
    } else if ('webkitHidden' in document) {
        hidden = 'webkitHidden';
        document.addEventListener('webkitvisibilitychange', windowFocusChanged);
    } else if ('msHidden' in document) {
        hidden = 'msHidden';
        document.addEventListener('msvisibilitychange', windowFocusChanged);
    } else if ('onfocusin' in document) {
        // IE 9 and lower:
        document.onfocusin = document.onfocusout = windowFocusChanged;
    }

    // Also catch window... -- get two calls for a tab shift, but one for window losing focus
    window.onpageshow = window.onpagehide = window.onfocus = window.onblur = windowFocusChanged;

    function windowFocusChanged(evt) {
        const v = 'visible';
        const h = 'hidden';
        const evtMap = {
            focus: v,
            focusin: v,
            pageshow: v,
            blur: h,
            focusout: h,
            pagehide: h,
        };

        evt = evt || window.event;
        let callbackState = '';
        if (evt.type in evtMap) {
            callbackState = evtMap[evt.type];
        } else {
            callbackState = this[hidden] ? 'hidden' : 'visible';
        }
        callback(callbackState, evt);
    }
    // set the initial state
    const initialState
        = document.visibilityState === 'visible' ? 'focus' : 'blur';
    const initialStateEvent = { type: initialState };
    windowFocusChanged(initialStateEvent);
};

common.urls = {
    css: '/css',
    webResources: '/webResources',
    midiPlayer: '/webResources/midiPlayer',
    soundfontUrl: '/src/ext/soundfonts/FluidR3_GM/',
};
