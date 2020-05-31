import { Ads } from './Ads';
import { Status, PrebidUnit, A9Unit, GoogleUnit, PrebidJS, A9JS, GoogleJS, EventObject, Settings } from './Interfaces'

export class AdUnit {
    loaded = new Date();
    code: string;
    sizes: Array<Array<number>>;
    dfpUnitIdBase: string;
    enabled: Boolean = true;
    timeout: number = null;
    status = Status.UNDEFINED;
    viewable: Boolean = false;
    empty: Boolean = true;
    shown: number = 0;
    attempted: number = 0;
    lastShown: Date = null;
    bidsReturned = {
        timeout: null,
        a9: false,
        prebid: false
    };
    prebid: PrebidUnit = null; // the adapter-specific data
    a9: A9Unit = null;
    dfp: GoogleUnit = null;
    ads: Ads = null; // pointer back at the controller for lastInteraction and settings
    retries = {
        timer: {
            long: null,
            short: null
        },
        viewable: 0,
        limit: 3
    };
    constructor(code: string, prebidUnit: PrebidUnit, ads: Ads) {
        this.code = code;
        this.dfpUnitIdBase = ads.settings.dfpUnitIdBase;
        this.sizes = prebidUnit.mediaTypes.banner.sizes;
        this.retries.limit = ads.settings.retries.viewability.limit;
        this.prebid = prebidUnit;
        this.a9 = {
            slotID: this.code,
            slotName: this.dfpUnitIdBase + this.code,
            sizes: this.sizes
        };
        if (!('IntersectionObserver' in window)) {
            //this.load(code); we don't need this because we have a time-based refresh that will cover old browsers
        } else {
            // It is supported
            const unit = document.getElementById(code);
            const observer = new IntersectionObserver((entries) => {
                // Loop through the entries
                entries.forEach((entry) => {
                    // Are we in viewport?
                    if (entry.isIntersecting) {
                        if (entry.intersectionRatio > ads.settings.viewability.threshold) {
                            this.viewable = true;
                            if (this.enabled) {
                                const eventObject: EventObject = { detail: { code: this.code, fromViewableEvent: true }};
                                this.dispatchEvent("viewable", eventObject);
                            }
                        }
                    } else {
                        this.viewable = false;
                        /*if (this.units.states[code].enabled) {
                            this.dispatchEvent("viewable", code);
                        }*/
                    }
                });
            }, ads.settings.viewability);
            observer.observe(unit);
        }
    }
    dispatchEvent(eventName: string, data: EventObject) {
        if (typeof document.dispatchEvent === "function" && typeof CustomEvent === "function") {
            document.dispatchEvent(new CustomEvent(eventName, data));
        }
    }
    disable(callback?: Function) {
        if (window['googletag']) {
            const googletag: GoogleJS = window['googletag'];
            googletag.cmd.push(function () {
                googletag.destroySlots(this.dfp);
                callback(this.code);
            })
        }
        this.enabled = false;
        callback(this.code);
    }
    enable(callback?: Function) {
        if (window['googletag']) {
            const googletag: GoogleJS = window['googletag'];
            googletag.cmd.push(function () {
                googletag.display(this.code);
            });
        }
        this.enabled = true;
        callback(this.code);
    }
    elegableForDraw(nobids: Boolean = false) {
        if (!this.enabled) {
            return false;
        } else if (nobids) {
            return this.viewable && !document.hidden;
        } else {
            return this.bidsReturned.a9 && this.bidsReturned.prebid && this.viewable && (this.status === Status.UNDEFINED || this.status === Status.READYTODRAW) && !document.hidden && this.ads.lastInteraction.getTime() - this.ads.loaded.getTime() > this.ads.settings.interactionThreshold;
        }
    }
    refresh() {
        this.status = Status.UNDEFINED;
        this.fetch();
    }
    draw(fromViewableEvent?: Boolean, callback?: Function) {
        let initalDFPCheckTimeout: number;
        if (this.status === Status.READYTODRAW && this.viewable && window['googletag']) {
            if (initalDFPCheckTimeout) {
                clearTimeout(initalDFPCheckTimeout);
                initalDFPCheckTimeout = null;
            }
            const eventObject: EventObject = { detail: { code: this.code, fromViewableEvent: fromViewableEvent }},
                googletag: GoogleJS = window['googletag'];
            this.status = Status.DRAWING;
            if (this.timeout) { // clear the timout if one exists and we've already started drawing
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            //this.dfp.setTargeting("ad_refresh", "true"); TODO: wire this in
            googletag.cmd.push(() => { 
                callback(eventObject);
                googletag.pubads().refresh([this.dfp]);
            });
        } else {
            initalDFPCheckTimeout = setTimeout(function() { this.draw(fromViewableEvent, callback); }, 100);
        }
    }
    fetch(fromViewableEvent?: Boolean, callback?: Function) {
        const eventObject: EventObject = { detail: { code: this.code, fromViewableEvent: fromViewableEvent }},
            pbjs: PrebidJS = window['pbjs'],
            apstag: A9JS = window['apstag'];
        if (pbjs || apstag) {
            this.status = Status.FETCHING;
        }
        if (pbjs) {
            const prebidParams = {
                timeout: this.timeout,
                bidsBackHandler: (bids: object, timedOut: Boolean) => {
                    pbjs.setTargetingForGPTAsync(this.code);
                    this.bidsReturned.prebid = true;
                    callback(eventObject);
                    if (this.bidsReturned.a9) {
                        this.status = Status.READYTODRAW;
                        if (this.elegableForDraw()) {
                            this.draw(fromViewableEvent, callback);
                        }
                    }
                }
            };
            this.bidsReturned.prebid = false;
            pbjs.que.push(function() { pbjs.requestBids(prebidParams); });
        }
        if (apstag) {
            this.bidsReturned.a9 = false;
            apstag.fetchBids({
                slots: this.a9,
                timeout: this.timeout,
            }, (bids: object) => {
                apstag.setDisplayBids();
                this.bidsReturned.a9 = true;
                callback(eventObject);
                if (this.bidsReturned.prebid) {
                    this.status = Status.READYTODRAW;
                    if (this.elegableForDraw()) {
                        this.draw(fromViewableEvent, callback);
                    }
                }
            });
        }
    }
}