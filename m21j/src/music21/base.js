/**
 * music21j -- Javascript reimplementation of Core music21p features.
 * music21/base -- objects in base in music21p routines
 *
 * does not load the other modules, music21/moduleLoader.js does that.
 *
 * Copyright (c) 2013-16, Michael Scott Cuthbert and cuthbertLab
 * Based on music21 (=music21p), Copyright (c) 2006–16, Michael Scott Cuthbert and cuthbertLab
 *
 */
import { common } from './common.js';
import { duration } from './duration.js';
import { prebase } from './prebase.js';
import { sites } from './sites.js';

/**
 * module for Music21Objects, see {@link music21.base}
 *
 * @requires music21/common
 * @requires music21/duration
 * @requires music21/prebase
 * @requires music21/sites
 * @exports music21/base
 */
/**
 * Module for Music21Objects.  Does not load other modules, see {@link music21.moduleLoader}
 * for this functionality.
 *
 * @namespace music21.base
 * @memberof music21
 */
export const base = {};

/**
 * Base class for any object that can be placed in a {@link music21.stream.Stream}.
 *
 * @class Music21Object
 * @memberof music21.base
 * @extends music21.prebase.ProtoM21Object
 * @property {object} activeSite - hardlink to a {@link music21.stream.Stream} containing the element.
 * @property {number} classSortOrder - Default sort order for this class (default 20; override in other classes). Lower numbered objects will sort before other objects in the staff if priority and offset are the same.
 * @property {music21.duration.Duration} duration - the duration (object) for the element. (can be set with a quarterLength also)
 * @property {Array} groups - An Array of strings representing group (equivalent to css classes) to assign to the object. (default [])
 * @property {boolean} isMusic21Object - true
 * @property {boolean} isStream - false
 * @property {number} offset - offset from the beginning of the stream (in quarterLength)
 * @property {number} priority - The priority (lower = earlier or more left) for elements at the same offset. (default 0)
 */
export class Music21Object extends prebase.ProtoM21Object {
    constructor(keywords) {
        super();
        this.classSortOrder = 20; // default;

        this.activeSite = undefined;
        this.offset = 0; // for now
        this._naiveOffset = 0;
        // this._activeSite = undefined;
        this._activeSiteStoredOffset = undefined;

        // this._derivation = undefined;
        // this._style = undefined;
        // this._editorial = undefined;

        this._duration = new duration.Duration();

        this._priority = 0; // default;

        // this.id = sites.getId(this);
        this.groups = [];
        // groups
        this.sites = new sites.Sites();

        this.isMusic21Object = true;
        this.isStream = false;

        this.groups = []; // custom object in m21p
        // this.sites, this.activeSites, this.offset -- not yet...
        // beat, measureNumber, etc.
        // lots to do...
        this._cloneCallbacks.activeSite = function Music21Object_cloneCallbacks_activeSite(
            keyName,
            newObj,
            self
        ) {
            newObj[keyName] = undefined;
        };
        this._cloneCallbacks.sites = function Music21Object_cloneCallbacks_sites(
            keyName,
            newObj,
            self
        ) {
            newObj[keyName] = new sites.Sites();
        };
    }
    get priority() {
        return this._priority;
    }
    set priority(p) {
        this._priority = p;
    }
    get duration() {
        return this._duration;
    }
    set duration(newDuration) {
        if (typeof newDuration === 'object') {
            this._duration = newDuration;
            // common errors below...
        } else if (typeof newDuration === 'number') {
            this._duration.quarterLength = newDuration;
        } else if (typeof newDuration === 'string') {
            this._duration.type = newDuration;
        }
    }
    get quarterLength() {
        return this.duration.quarterLength;
    }
    set quarterLength(ql) {
        this.duration.quarterLength = ql;
    }
    /**
     * Return the offset of this element in a given site -- use .offset if you are sure that
     * site === activeSite.
     *
     * Does not change activeSite or .offset
     *
     * @memberof music21.base.Music21Object
     * @param {music21.stream.Stream} site
     * @returns Number|undefined
     */
    getOffsetBySite(site, stringReturns = false) {
        if (site === undefined) {
            return this._naiveOffset;
        }
        return site.elementOffset(this, stringReturns);
    }

    /**
     * setOffsetBySite - sets the offset for a given Stream
     *
     * @memberof music21.base.Music21Object
     * @param  {music21.stream.Stream} site  Stream object
     * @param  {number} value offset
     */

    setOffsetBySite(site, value) {
        if (site !== undefined) {
            site.setElementOffset(this, value);
        } else {
            this._naiveOffset = value;
        }
    }

    // ---------- Contexts -------------

    getContextByClass(className, options) {
        const payloadExtractor = function payloadExtractor(
            useSite,
            flatten,
            positionStart,
            getElementMethod,
            classList
        ) {
            // this should all be done as a tree...
            // do not use .flat or .semiFlat so as not
            // to create new sites.

            // VERY HACKY...
            let lastElement;
            for (let i = 0; i < useSite.length; i++) {
                const indexOffset = useSite._elementOffsets[i];
                const thisElement = useSite._elements[i];
                const matchClass = thisElement.isClassOrSubclass(classList);
                if (flatten === false && !matchClass) {
                    continue;
                } else if (!thisElement.isStream && !matchClass) {
                    continue;
                }
                // is a stream or an element of the appropriate class...
                // first check normal elements
                if (
                    getElementMethod.includes('Before')
                    && indexOffset >= positionStart
                ) {
                    if (
                        getElementMethod.includes('At')
                        && lastElement === undefined
                    ) {
                        lastElement = thisElement;
                    } else if (matchClass) {
                        return lastElement;
                    }
                } else {
                    lastElement = thisElement;
                }
                if (
                    getElementMethod.includes('After')
                    && indexOffset > positionStart
                    && matchClass
                ) {
                    return thisElement;
                }
                // now cleck stream... already filtered out flatten == false;
                if (thisElement.isStream) {
                    const potentialElement = payloadExtractor(
                        thisElement,
                        flatten,
                        positionStart + indexOffset,
                        getElementMethod,
                        classList
                    );
                    if (potentialElement !== undefined) {
                        return potentialElement;
                    }
                }
            }
            return undefined;
        };

        const params = {
            getElementMethod: 'getElementAtOrBefore',
            sortByCreationTime: false,
        };
        common.merge(params, options);

        const getElementMethod = params.getElementMethod;
        const sortByCreationTime = params.sortByCreationTime;

        if (className !== undefined && !(className instanceof Array)) {
            className = [className];
        }
        if (
            getElementMethod.includes('At')
            && this.isClassOrSubclass(className)
        ) {
            return this;
        }

        for (const [site, positionStart, searchType] of this.contextSites({
            returnSortTuples: true,
            sortByCreationTime,
        })) {
            if (
                getElementMethod.includes('At')
                && site.isClassOrSubclass(className)
            ) {
                return site;
            }

            if (
                searchType === 'elementsOnly'
                || searchType === 'elementsFirst'
            ) {
                const contextEl = payloadExtractor(
                    site,
                    false,
                    positionStart,
                    getElementMethod,
                    className
                );
                if (contextEl !== undefined) {
                    contextEl.activeSite = site;
                    return contextEl;
                }
            } else if (searchType !== 'elementsOnly') {
                if (
                    getElementMethod.includes('After')
                    && (className === undefined
                        || site.isClassOrSubclass(className))
                ) {
                    if (
                        !getElementMethod.includes('NotSelf')
                        && this !== site
                    ) {
                        return site;
                    }
                }
                const contextEl = payloadExtractor(
                    site,
                    'semiFlat',
                    positionStart,
                    getElementMethod,
                    className
                );
                if (contextEl !== undefined) {
                    contextEl.activeSite = site;
                    return contextEl;
                }
                if (
                    getElementMethod.includes('Before')
                    && (className === undefined
                        || site.isClassOrSubclass(className))
                ) {
                    if (
                        !getElementMethod.includes('NotSelf')
                        || this !== site
                    ) {
                        return site;
                    }
                }
            }
        }

        return undefined;
    }

    * contextSites(options) {
        const params = {
            callerFirst: undefined,
            memo: [],
            offsetAppend: 0.0,
            sortByCreationTime: false,
            priorityTarget: undefined,
            returnSortTuples: false,
            followDerivation: true,
        };
        common.merge(params, options);
        const memo = params.memo;
        if (params.callerFirst === undefined) {
            params.callerFirst = this;
            if (this.isStream && !(this in memo)) {
                const recursionType = this.recursionType;
                yield [this, 0.0, recursionType];
            }
            memo.push(this);
        }

        if (params.priorityTarget === undefined && !params.sortByCreationType) {
            params.priorityTarget = this.activeSite;
        }
        // const topLevel = this;
        for (const siteObj of this.sites.yieldSites(
            params.sortByCreationTime,
            params.priorityTarget,
            true // excludeNone
        )) {
            if (memo.includes(siteObj)) {
                continue;
            }
            if (siteObj.classes.includes('SpannerStorage')) {
                continue;
            }

            // let offset = this.getOffsetBySite(siteObj);
            // followDerivation;
            const offsetInStream = siteObj.elementOffset(this);
            const newOffset = offsetInStream + params.offsetAppend;
            const positionInStream = newOffset;
            const recursionType = siteObj.recursionType;
            yield [siteObj, positionInStream, recursionType];
            memo.push(siteObj);

            const newParams = {
                callerFirst: params.callerFirst,
                memo,
                offsetAppend: positionInStream, // .offset
                returnSortTuples: true, // always!
                sortByCreationTime: params.sortByCreationTime,
            };
            for (const [
                topLevel,
                inStreamPos,
                recurType,
            ] of siteObj.contextSites(newParams)) {
                const inStreamOffset = inStreamPos; // .offset;
                // const hypotheticalPosition = inStreamOffset; // more complex w/ sortTuples

                if (!memo.includes(topLevel)) {
                    // if returnSortTuples...
                    // else
                    yield [topLevel, inStreamOffset, recurType];
                    memo.push(topLevel);
                }
            }
        }
        // if followDerivation...
    }
}

base.Music21Object = Music21Object;
