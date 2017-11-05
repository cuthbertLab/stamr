import * as $ from 'jquery';

import { chord } from './chord.js';
import { clef } from './clef.js';
import { duration } from './duration.js';
import { key } from './key.js';
import { meter } from './meter.js';
import { note } from './note.js';
import { pitch } from './pitch.js';
import { stream } from './stream.js';
import { tie } from './tie.js';

const DEFAULTS = {
    divisionsPerQuarter: 32 * 3 * 3 * 5 * 7,
};

function hyphenToCamelCase(tag) {
    return tag.replace(/-([a-z])/g, firstLetter =>
        firstLetter[1].toUpperCase()
    );
}

function seta(m21El, xmlEl, tag, attributeName, transform) {
    const $matchEl = $(xmlEl).children(tag);
    if (!$matchEl) {
        return;
    }
    let value = $matchEl
        .contents()
        .eq(0)
        .text();
    if (value === undefined || value === '') {
        return;
    }
    if (transform !== undefined) {
        value = transform(value);
    }
    if (attributeName === undefined) {
        attributeName = hyphenToCamelCase(tag);
    }
    m21El[attributeName] = value;
}

export class ScoreParser {
    constructor() {
        this.xmlText = undefined;
        this.xmlUrl = undefined;
        this.$xmlRoot = undefined;
        this.stream = new stream.Score();

        this.definesExplicitSystemBreaks = false;
        this.definesExplicitPageBreaks = false;

        this.mxScorePartDict = {};
        this.m21PartObjectsById = {};
        this.partGroupList = [];
        this.parts = [];

        this.musicXmlVersion = '1.0';
    }

    scoreFromUrl(url) {
        this.xmlUrl = url;
        return $.get(url, {}, (xmlDoc, textStatus) =>
            this.scoreFromDOMTree(xmlDoc)
        );
    }

    scoreFromText(xmlText) {
        this.xmlText = xmlText;
        const xmlDoc = $.parseXML(xmlText);
        return this.scoreFromDOMTree(xmlDoc);
    }

    scoreFromDOMTree(xmlDoc) {
        this.$xmlRoot = $($(xmlDoc).children('score-partwise'));
        this.xmlRootToScore(this.$xmlRoot, this.stream);
        return this.stream;
    }

    xmlRootToScore($mxScore, inputM21) {
        let s = inputM21;
        if (inputM21 === undefined) {
            s = new stream.Score();
        }
        // version
        // defaults
        // credit
        this.parsePartList($mxScore);
        for (const p of $mxScore.children('part')) {
            const $p = $(p);
            const partId = $p.attr('id');
            // if (partId === undefined) {
            //     partId = //something
            // }
            const $mxScorePart = this.mxScorePartDict[partId];
            const part = this.xmlPartToPart($p, $mxScorePart);
            if (part !== undefined) {
                // partStreams are undefined
                s.insert(0.0, part);
                this.m21PartObjectsById[partId] = part;
                this.parts.push(part);
            }
        }
        // partGroups;
        // spanners;
        // definesExplicitSystemreaks, etc.
        // sort
        return s;
    }

    xmlPartToPart($mxPart, $mxScorePart) {
        const parser = new PartParser($mxPart, $mxScorePart, this);
        parser.parse();
        // handle partStreams
        return parser.stream;
    }

    parsePartList($mxScore) {
        const mxPartList = $mxScore.children('part-list');
        if (!mxPartList) {
            return;
        }
        // const openPartGroups = [];
        for (const partListElement of mxPartList) {
            const $partListElement = $(partListElement);
            const partId = $partListElement.attr('id');
            this.mxScorePartDict[partId] = $partListElement;
        }
        // deal with part-groups
    }
}

export class PartParser {
    constructor($mxPart, $mxScorePart, parent) {
        this.$mxPart = $mxPart;
        this.$mxScorePart = $mxScorePart;
        // ignore parent for now
        if ($mxPart !== undefined) {
            this.partId = $mxPart.attr('id');
            // ignore empty partId for now
        }
        // spannerBundles
        this.stream = new stream.Part();
        this.atSoundingPitch = true;
        this.staffReferenceList = [];

        this.lastTimeSignature = undefined;
        this.lastMeasureWasShort = false;
        this.lastMeasureOffset = 0.0;
        this.lastClefs = {
            0: new clef.TrebleClef(),
        };
        this.activeTuplets = [];
        this.activeTuplets.length = 7;
        this.activeTuplets.fill(undefined);

        this.maxStaves = 1;
        this.lastMeasureNumber = 0;
        this.lastNumberSuffix = undefined;

        this.multiMeasureRestsToCapture = 0;
        this.activeMultimeasureRestSpanner = undefined;

        this.activeInstrument = undefined;
        this.firstMeasureParsed = false;
        this.$activeAttributes = undefined;
        this.lastDivisions = DEFAULTS.divisionsPerQuarter;

        this.appendToScoreAfterParse = true;
        this.lastMeasureParser = undefined;
    }

    parse() {
        this.parseXmlScorePart();
        this.parseMeasures();
        // atSoundingPitch;
        // spannerBundles
        // partStaves;
    }

    parseXmlScorePart() {
        const part = this.stream;
        const $mxScorePart = this.$mxScorePart;

        seta(part, $mxScorePart, 'part-name'); // todo -- clean string
        // remainder of part names
        // instruments
    }

    parseMeasures() {
        for (const mxMeasure of this.$mxPart.children('measure')) {
            const $mxMeasure = $(mxMeasure);
            this.xmlMeasureToMeasure($mxMeasure);
        }
        if (this.lastMeasureParser !== undefined) {
            this.lastMeasureParser.parent = undefined; // gc.
        }
    }

    xmlMeasureToMeasure($mxMeasure) {
        const measureParser = new MeasureParser($mxMeasure, this);
        measureParser.parse();
        if (this.lastMeasureParser !== undefined) {
            this.lastMeasureParser.parent = undefined; // gc.
        }
        this.lastMeasureParser = measureParser;
        // max staves
        // transposition
        this.firstMeasureParsed = true;
        // staffReferenceList

        const m = measureParser.stream;
        this.setLastMeasureInfo(m);
        // fullMeasureRests

        // TODO: offsets!!!
        // this.stream.insert(this.lastMeasureOffset, m);
        this.stream.append(m);

        this.adjustTimeAttributesFromMeasure(m);
    }

    setLastMeasureInfo(m) {
        if (m.number !== this.lastMeasureNumber) {
            this.lastMeasureNumber = m.number;
            this.lastNumberSuffix = m.numberSuffix;
        }

        if (m.timeSignature !== undefined) {
            this.lastTimeSignature = m.timeSignature;
        } else if (this.lastTimeSignature === undefined) {
            this.lastTimeSignature = new meter.TimeSignature('4/4');
        }
    }

    adjustTimeAttributesFromMeasure(m) {
        const mHighestTime = m.highestTime;
        // ignore incomplete measures.
        const mOffsetShift = mHighestTime;
        this.lastMeasureOffset += mOffsetShift;
    }
}

export class MeasureParser {
    constructor($mxMeasure, parent) {
        this.$mxMeasure = $mxMeasure;
        this.$mxMeasureElements = [];

        this.divisions = undefined;
        this.parent = parent;

        this.transposition = undefined;
        // spannerBundles
        this.staffReference = {};
        // activeTuplets
        this.useVoices = false;
        this.voicesById = {};
        this.voiceIndices = new Set();
        this.staves = 1;
        this.$activeAttributes = undefined;
        this.attributesAreInternal = true;
        this.measureNumber = undefined;
        this.numberSuffix = undefined;

        if (parent !== undefined) {
            this.divisions = parent.lastDivisions;
        } else {
            this.divisions = DEFAULTS.divisionsPerQuarter;
        }

        this.staffLayoutObjects = [];
        this.stream = new stream.Measure();

        this.$mxNoteList = [];
        this.$mxLyricList = [];
        this.nLast = undefined;
        this.chordVoice = undefined;
        this.fullMeasureRest = false;
        this.restAndNoteCount = {
            rest: 0,
            note: 0,
        };
        this.lastClefs = {
            0: undefined,
        };
        this.parseIndex = 0;
        this.offsetMeasureNote = 0.0;

        // class attributes in m21p
        this.attributeTagsToMethods = {
            time: 'handleTimeSignature',
            clef: 'handleClef',
            key: 'handleKeySignature',
            // 'staff-details': 'handleStaffDetails',
            // 'measure-style': 'handleMeasureStyle',
        };
        this.musicDataMethods = {
            note: 'xmlToNote',
            // 'backup': 'xmlBackup',
            // 'forward': 'xmlForward',
            // 'direction': 'xmlDirection',
            attributes: 'parseAttributesTag',
            // 'harmony': 'xmlHarmony',
            // 'figured-bass': undefined,
            // 'sound': undefined,
            // 'barline': 'xmlBarline',
            // 'grouping': undefined,
            // 'link': undefined,
            // 'bookmark': undefined,

            // Note: <print> is handled separately...
        };
    }

    parse() {
        // mxPrint
        this.parseMeasureAttributes();
        // updateVoiceInformation;

        const children = this.$mxMeasure.children();
        this.$mxMeasureElements = [];
        for (const c of children) {
            const $c = $(c);
            this.$mxMeasureElements.push($c);
        }

        let i = 0;
        for (const $mxObj of this.$mxMeasureElements) {
            const tag = $mxObj[0].tagName;
            this.parseIndex = i;
            const methName = this.musicDataMethods[tag];
            if (methName !== undefined) {
                this[methName]($mxObj);
            }
            i += 1;
        }
        // useVoices
        // fullMeasureRest
    }

    insertInMeasureOrVoice($mxObj, el) {
        // TODO: offsets!
        // this.stream.insert(this.offsetMeasureNote, el);
        this.stream.append(el);
    }

    xmlToNote($mxNote) {
        let nextNoteIsChord = false;
        const $mxObjNext = this.$mxMeasureElements[this.parseIndex + 1];
        if ($mxObjNext !== undefined) {
            if (
                $mxObjNext[0].tagName === 'note'
                && $mxObjNext.children('chord').length > 0
            ) {
                nextNoteIsChord = true;
            }
        }
        let isChord = false;
        let isRest = false;

        let offsetIncrement = 0.0;
        if ($mxNote.children('rest').length > 0) {
            isRest = true;
        }
        if ($mxNote.children('chord').length > 0) {
            isChord = true;
        }
        if (nextNoteIsChord) {
            isChord = true;
        }

        let n;

        if (isChord) {
            this.$mxNoteList.push($mxNote);
            // chord lyrics
        } else if (!isChord && !isRest) {
            // normal note
            this.restAndNoteCount.note += 1;
            n = this.xmlToSimpleNote($mxNote);
        } else {
            this.restAndNoteCount.rest += 1;
            n = this.xmlToRest($mxNote);
        }

        if (!isChord) {
            // update lyrics
            // add to staffReference
            this.insertInMeasureOrVoice($mxNote, n);
            offsetIncrement = n.duration.quarterLength;
            this.nLast = n;
        }

        if (this.$mxNoteList && !nextNoteIsChord) {
            const c = this.xmlToChord(this.$mxNoteList);
            // update lyrics
            // addToStaffRest;

            // voices;
            this.insertInMeasureOrVoice($mxNote, c);

            this.$mxNoteList = [];
            this.$mxLyricList = [];
            offsetIncrement = c.duration.quarterLength;
            this.nLast = c;
        }

        this.offsetMeasureNote += offsetIncrement;
    }

    xmlToChord($mxNoteList) {
        const notes = [];
        for (const $mxNote of $mxNoteList) {
            const freeSpanners = false;
            notes.push(this.xmlToSimpleNote($mxNote, freeSpanners));
        }
        const c = new chord.Chord(notes);
        // move beams from first note;
        // move articulations;
        // move expressions;
        // move spanners;

        return c;
    }

    xmlToSimpleNote($mxNote, freeSpanners) {
        const n = new note.Note();
        this.xmlToPitch($mxNote, n.pitch);
        // beams;
        // stems;
        // noteheads
        return this.xmlNoteToGeneralNoteHelper(n, $mxNote, freeSpanners);
    }

    // xmlToBeam
    // xmlToBeams
    // xmlNotehead

    xmlToPitch($mxNote, inputM21) {
        let p = inputM21;
        if (inputM21 === undefined) {
            p = new pitch.Pitch();
        }

        let $mxPitch;
        if ($mxNote[0].tagName === 'pitch') {
            $mxPitch = $mxNote;
        } else {
            $mxPitch = $($mxNote.children('pitch')[0]);
            if ($mxPitch.length === 0) {
                // whoops!
                return p;
            }
        }

        seta(p, $mxPitch, 'step');
        seta(p, $mxPitch, 'octave', undefined, parseInt);
        const $mxAlter = $mxPitch.children('alter');
        let accAlter;
        if ($mxAlter) {
            accAlter = parseFloat($mxAlter.text().trim());
        }

        const $mxAccidental = $mxNote.children('accidental');
        // dropping support for musescore 0.9 errors...
        if ($mxAccidental.length > 0) {
            const accObj = this.xmlToAccidental($mxAccidental);
            p.accidental = accObj;
            p.accidental.displayStatus = true;
            // independent accidental from alter
        } else if (accAlter !== undefined) {
            p.accidental = new pitch.Accidental(accAlter);
            p.accidental.displayStatus = false;
        }
        return p;
    }

    xmlToAccidental($mxAccidental) {
        const acc = new pitch.Accidental();
        // to-do m21/musicxml accidental name differences;
        const name = $($mxAccidental[0])
            .text()
            .trim()
            .toLowerCase();
        acc.set(name);

        // set print style
        // parentheses
        // bracket
        // editorial
        return acc;
    }

    xmlToRest($mxRest) {
        const r = new note.Rest();
        // full measure rest
        // apply multimeasure rest
        // display-step, octave, etc.
        return this.xmlNoteToGeneralNoteHelper(r, $mxRest);
    }

    xmlNoteToGeneralNoteHelper(n, $mxNote, freeSpanners) {
        if (freeSpanners === undefined) {
            freeSpanners = true;
        }
        // spanners
        // setPrintStyle
        // print-object
        // dynamics
        // pizzacato
        // grace
        this.xmlToDuration($mxNote, n.duration);
        // type styles
        // color
        // position
        if ($mxNote.children('tie').length > 0) {
            n.tie = this.xmlToTie($mxNote);
        }
        // grace
        // notations
        // editorial
        return n;
    }

    xmlToDuration($mxNote, inputM21) {
        let d = inputM21;
        if (inputM21 === undefined) {
            d = new duration.Duration();
        }
        const divisions = this.divisions;
        const mxDuration = $mxNote.children('duration')[0];
        let qLen = 0.0;

        if (mxDuration) {
            const noteDivisions = parseFloat(
                $(mxDuration)
                    .text()
                    .trim()
            );
            qLen = noteDivisions / divisions;
        }

        const mxType = $mxNote.children('type')[0];
        if (mxType) {
            // long vs longa todo
            const durationType = $(mxType)
                .text()
                .trim();
            const numDots = $mxNote.children('dot').length;
            // tuplets!!!! big to-do!
            d.type = durationType;
            d.dots = numDots;
        } else {
            d.quarterLength = qLen;
        }

        return d;
    }

    // xmlGraceToGrace
    // xmlNotations
    // xmlTechnicalToArticulation
    // setHarmonic
    // handleFingering
    // xmlToArticulation
    // xmlOrnamentToExpression
    // xmlDirectionTypeToSpanners
    // xmlNotationsToSpanners
    // xmlToTremolo
    // xmlOneSpanner

    xmlToTie($mxNote) {
        const t = new tie.Tie();
        const allTies = $mxNote.children('tie');
        if (allTies.length > 1) {
            t.type = 'continue';
        } else {
            const $t0 = $(allTies[0]);
            t.type = $t0.attr('type');
        }
        // style
        return t;
    }

    insertIntoMeasureOrVoice($mxElement, el) {
        this.stream.insert(this.offsetMeasureNote, el);
    }

    parseMeasureAttributes() {
        this.parseMeasureNumbers();
        // width;
    }

    parseMeasureNumbers() {
        const mNumRaw = this.$mxMeasure.attr('number');
        const mNum = parseInt(mNumRaw); // no suffixes...
        this.stream.number = mNum;
        if (this.parent) {
            this.parent.lastMeasureNumber = mNum;
        }
        this.measureNumber = mNum;
    }

    parseAttributesTag($mxAttributes) {
        this.attributesAreInternal = false;
        this.$activeAttributes = $mxAttributes;
        for (const mxSub of $mxAttributes) {
            const tag = mxSub.tagName;
            const $mxSub = $(mxSub);
            const methName = this.attributeTagsToMethods[tag];
            if (methName !== undefined) {
                this[methName]($mxSub);
            } else if (tag === 'staves') {
                this.staves = parseInt($mxSub.text());
            } else if (tag === 'divisions') {
                this.divisions = parseFloat($mxSub.text());
            }
            // transpose;
        }
        if (this.parent !== undefined) {
            this.parent.lastDivisions = this.divisions;
            this.parent.$activeAttributes = this.$activeAttributes;
        }
    }
    // xmlTransposeToInterval

    handleTimeSignature($mxTime) {
        const ts = this.xmlToTimeSignature($mxTime);
        this.insertIntoMeasureOrVoice($mxTime, ts);
    }

    xmlToTimeSignature($mxTime) {
        // senza-misura
        // simple time signature only;
        const numerator = $($mxTime.children('beats')[0])
            .text()
            .trim();
        const denominator = $($mxTime.children('beat-type')[0])
            .text()
            .trim();
        return new meter.TimeSignature(numerator + '/' + denominator);
        // symbol
    }

    handleClef($mxClef) {
        const clefObj = this.xmlToClef($mxClef);
        this.insertIntoMeasureOrVoice($mxClef, clefObj);
        this.lastClefs[0] = clefObj;
    }

    xmlToClef($mxClef) {
        const sign = $($mxClef.children('sign')[0])
            .text()
            .trim();
        // TODO: percussion, etc.
        const line = $($mxClef.children('line')[0])
            .text()
            .trim();

        let clefOctaveChange = 0;
        const $coc = $mxClef.children('clef-octave-change');
        if ($coc.length > 0) {
            clefOctaveChange = parseInt(
                $($coc[0])
                    .text()
                    .trim()
            );
        }
        return clef.clefFromString(sign + line, clefOctaveChange);
    }

    handleKeySignature($mxKey) {
        const keySig = this.xmlToKeySignature($mxKey);
        this.insertIntoMeasureOrVoice($mxKey, keySig);
    }

    xmlToKeySignature($mxKey) {
        const ks = new key.KeySignature();
        seta(ks, $mxKey, 'fifths', 'sharps', parseInt);
        // mode!
        // non-standard and key-octaves
        return ks;
    }
}

export const musicxml = {
    ScoreParser,
    PartParser,
    MeasureParser,
};
