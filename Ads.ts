import { AdUnits, AdUnit, PrebidUnit, GoogleUnit, PrebidJS, A9JS, GoogleJS, Settings, EventObject, Status } from './Internal';

declare global {
    interface Window { 
        SMARTSYNC: Boolean;
        googletag: any;
        pbjs: any;
        apstag: any;
        ads: Ads;
        adCommands: any;
    }
}

window['SMARTSYNC'] = true; // Legacy Prebid behavior, and perhaps not relavant anymore
const googletag = window['googletag'] || {};


export class Ads {

    loaded = new Date();
    referencesLoaded: number = 0;
    unitsReady: Boolean = false;
    loggingPattern = new RegExp('/enableadlogging=(true|report)/');
    logging: Boolean = window.location.href.match(this.loggingPattern) !== null;
    units: AdUnits = {};
    prebid: Array<PrebidUnit> = [];
    documentVisible = !document.hidden;
    lastInteraction = new Date();
    settings: Settings = {
        dfpUnitIdBase: '/12345/ad-unit-parent/',
        a9Id: 'a9-guid',
        timeout: 1500,
        viewability: {
            rootMargin: Math.floor(window.innerHeight * 2 / 3) + 'px 0px',
            threshold: [0, 0.5],
            callback: (eventObject: EventObject) => this.dispatchEvent('viewable', eventObject)
        },
        interactionThreshold: 60 * 1000,
        retries: {
            wait: 31000,
            viewability: { // retry loading the unit on empty
                wait: 5000,
                limit: 3
            }
        }
    }

    constructor() {}

    disable(units: Array<string>) {
        if (units) {
            units.forEach((code: string) => {
                this.units[code].disable((code: string) => {
                    if (this.logging) {
                        console.log("adsdebug disable", code, (new Date()).getTime() - this.loaded.getTime());
                    }
                });
            });
        } else {
            Object.keys(this.units).forEach((code: string) => {
                this.units[code].disable((code: string) => {
                    if (this.logging) {
                        console.log("adsdebug disable", code, (new Date()).getTime() - this.loaded.getTime());
                    }
                });
            });
        }
    }
    enable(units: Array<string>) {
        if (units) {
            units.forEach((code: string) => {
                this.units[code].enable((code: string) => {
                    if (this.logging) {
                        console.log("adsdebug enable", code, (new Date()).getTime() - this.loaded.getTime());
                    }
                    const eventObject: EventObject = { detail: { code }};
                    this.dispatchEvent('adrendered', eventObject); // trigger draw
                });
            });
        } else {
            Object.keys(this.units).forEach((code: string) => {
                this.units[code].enable((code: string) => {
                    if (this.logging) {
                        console.log("adsdebug enable", code, (new Date()).getTime() - this.loaded.getTime());
                    }
                });
            });
        }
    }
    getLayout() {
        return window.matchMedia("screen and (max-width: 39.9375em)").matches ? "small" : window.matchMedia("screen and (min-width: 40em) and (max-width: 63.9375em)").matches ? "medium" : "large";
    }
    isMobile() {
        return /(iPhone|iPad|iPod|Android|SymbianOS|RIM|BlackBerry|Palm|Windows\s+CE)/.test(navigator.userAgent);
    }
    dispatchEvent(eventName: string, data: EventObject) {
        if (typeof document.dispatchEvent === "function" && typeof CustomEvent === "function") {
            document.dispatchEvent(new CustomEvent(eventName, data));
        }
    }
    refresh(units: Array<string>) {
        if (units) {
            units.forEach((code: string) => {
                if (this.logging) {
                    console.log("adsdebug refreshing", code, (new Date()).getTime() - this.loaded.getTime());
                }
                this.units[code].refresh();
            })
        }
    }
    prime(code: string) {
        // find unit in this.prebid
        for(let i=0;i<this.prebid.length;i++) {
            let unit: PrebidUnit = this.prebid[i];
            if (unit.code === code) {
                this.units[code].enable();
            }
        }
    }
    initialize(prebidUnits: Array<PrebidUnit>, settings: Settings) {
        this.settings = {...this.settings, ...settings} // override with your settings
        if (typeof window['googletag'] === 'undefined') window['googletag'] = {}; // set up googletag
        const googletag: GoogleJS = window['googletag'];
        googletag.cmd = googletag.cmd || [];
        if (typeof window['pbjs'] === 'undefined') window['pbjs'] = {}; // set up pbjs
        const pbjs: PrebidJS = window['pbjs'];
        pbjs.que = pbjs.que || [];
        if (typeof window['apstag'] === 'undefined') window['apstag'] = {}; // set up A9
        const apstag: A9JS = window['apstag'];
        const largeSizes = [[728,90],[300,600],[300,250],[970,90],[970,250]];
        const mediumSizes = [[728,90],[300,600],[300,250],[320,100]];
        const smallSizes = [[320,50],[300,250],[320,100]];
        //const allSizes: Array<Array<number>> = [].concat(largeSizes).concat(mediumSizes).concat(smallSizes);
        this.prebid = prebidUnits;
        this.prebid.forEach((unit: PrebidUnit) => { this.units[unit.code] = new AdUnit(unit.code, unit, this) });
        const scriptCallback = (src: string) => {
            this.referencesLoaded++;
            if (this.logging) {
                console.log("adsdebug", src, (new Date()).getTime() - this.loaded.getTime(), "references", this.referencesLoaded); // src is "loaded [resourcename]"
            }
            if (src.indexOf("/gpt.js") > 0) {
                /*function getScreenLocation(code) { TODO: hook in key-values
                    switch(code){
                        case 'top_leaderboard' || "top_pushdown":
                            return 'top';
                            break;
                        case "mid_leaderboard_rectangle_1":
                            return 'article_top';
                            break;
                        case 'top_rectangle' || "right_halfpage":
                            return 'top_right';
                            break;
                        case "middle_rectangle":
                            return 'center_right';
                            break;
                        case "bottom_rectangle":
                            return 'bottom_right';
                            break;
                        case "bottom_leaderboard" || "bottom_leaderboard_rectangle":
                            return 'bottom';
                            break;
                        default:
                            return 'center';
                    }
                }
                function getSizeMapping(code) {
                    switch(code){
                        case "top_leaderboard":
                            return googletag.sizeMapping().addSize([0,0],[320,50]).addSize([750,200],[728,90]).build();
                            break;
                        case "bottom_leaderboard":
                        case "bottom_leaderboard_rectangle":
                            return googletag.sizeMapping().addSize([0,0],[320,50]).addSize([750,200],[728,90]).build();
                            break;
                        case "right_halfpage":
                            return googletag.sizeMapping().addSize([0,0],[300,600]).build();
                            break;
                        case "top_rectangle":
                        case "middle_rectangle":
                        case "bottom_rectangle":
                            return googletag.sizeMapping().addSize([0,0],[[300,250],[300,600]]).build();
                            break;
                        case "top_pushdown":
                            return googletag.sizeMapping().addSize([0,0],[[1,1]]).build();
                            break;
                        default:
                            return googletag.sizeMapping().addSize([0,0],[300,250]).build();
                    }
                }*/
                googletag.cmd.push(() => {
                    this.prebid.forEach((unit) => {
                        this.units[unit.code].dfp = googletag.defineSlot(this.settings.dfpUnitIdBase + unit.code, unit.mediaTypes.banner.sizes, unit.code).addService(googletag.pubads());
                    });
                    googletag.pubads().setTargeting("url", window.location.pathname);
                    googletag.pubads().setTargeting("in_app", /FBAV/.test(window.navigator.userAgent).toString());
                    googletag.pubads().setTargeting("ads_in_page", "a" + this.units.length);
                    googletag.pubads().enableSingleRequest();
                    googletag.pubads().disableInitialLoad();
                    googletag.pubads().addEventListener('slotRenderEnded', (e: GoogleUnit) => {
                        const code = e.slot.getSlotElementId(),
                            adElement = <HTMLDivElement>document.getElementById(code);
                        this.units[code].empty = e.isEmpty;
                        if (e.isEmpty) {
                            adElement && adElement.parentElement && adElement.parentElement.classList.add("empty");
                        } else {
                            adElement && adElement.parentElement && adElement.parentElement.classList.remove("empty");
                        }
                        const eventObject: EventObject = { detail: { code, isEmpty: e.isEmpty }};
                        this.dispatchEvent('adrendered', eventObject);
                    });
                    googletag.enableServices();
                });
            }
            if (src.indexOf("/prebid.js") > 0) {
                pbjs.que.push(() => {
                    pbjs.addAdUnits(this.prebid);
                    pbjs.setConfig({
                        useBidCache: true,
                        consentManagement: {
                            gdpr: {
                                cmpApi: 'iab',
                                timeout: 10000,
                                allowAuctionWithoutConsent: true
                            },
                            usp: {
                                cmpApi: 'iab',
                                timeout: 100
                            }
                        },
                        bidderSequence: "random",
                        priceGranularity: {
                            "buckets" : [{
                                "precision": 2,  //default is 2 if omitted - means 2.1234 rounded to 2 decimal places = 2.12
                                "min" : 0,
                                "max" : 50,
                                "increment" : 0.01  // from $0 to $50, 1-cent increments
                            }]
                        },
                        enableSendAllBids: false,
                        bidderTimeout: this.settings.timeout,
                        alwaysIncludeDeals: true,
                        sizeConfig: [{
                            "mediaQuery": '(min-width: 64em)',
                            "sizesSupported": largeSizes,
                            "labels": ['desktop']
                        }, {
                            "mediaQuery": '(min-width: 40em) and (max-width: 63.9375em)',
                            "sizesSupported": mediumSizes,
                            "labels": ['tablet']
                        }, {
                            "mediaQuery": '(max-width: 39.9375em)',
                            "sizesSupported": smallSizes,
                            "labels": ['phone']
                        }]
                    });
                    /*pbjs.aliasBidder('appnexus', 'districtm'); TODO: hook these in
                    pbjs.aliasBidder('appnexus', 'oftmedia');
                    pbjs.enableAnalytics({
                        provider: "sovrn",
                        options: {
                            affiliateId: 254196
                        }
                    });*/
                });
            }
            if (src.indexOf("/apstag.js") > 0) {
                //Initialize the Library
                window['apstag'].init({
                    "pubID": this.settings.a9Id,
                    "adServer": "googletag"
                });
            }
            if (this.referencesLoaded > 2) { // attach event listeners when all ad resoruces are loaded
                const eventObject: EventObject = { detail: { code: 'resourcesready' }};
                this.dispatchEvent('library', eventObject);
            }
        }
        const checkAllUnits = () => {
            for (let code in this.units) {
                if (this.units.hasOwnProperty(code)) {
                    if (this.units[code].status === Status.UNDEFINED) {
                        this.units[code].fetch();
                    } else if (this.units[code].status === Status.READYTODRAW) {
                        this.units[code].draw();
                    }
                }
            }
        }
        let hidden: string = "hidden",
            state: string = "visibilityState",
            visibilityChange: string = "visibilitychange";
        if (typeof document.hidden !== "undefined") {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
            state = "visibilityState";
        }/* else if (typeof document['mozHidden'] !== "undefined") {
            hidden = "mozHidden";
            visibilityChange = "mozvisibilitychange";
            state = "mozVisibilityState";
        } else if (typeof document['msHidden'] !== "undefined") {
            hidden = "msHidden";
            visibilityChange = "msvisibilitychange";
            state = "msVisibilityState";
        } else if (typeof document['webkitHidden'] !== "undefined") {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
            state = "webkitVisibilityState";
        }*/
        if (visibilityChange) {
            document.addEventListener(visibilityChange, () => {
                if (document.hidden) {
                    this.documentVisible = false;
                } else {
                    this.documentVisible = true;
                    checkAllUnits(); // tab moved from backgrount to forground
                }
                this.lastInteraction = new Date();
            }, false);
        }
        window.addEventListener("scroll", (e: Event) => {
            this.lastInteraction = new Date();
            checkAllUnits();
        });
        document.addEventListener("mousemove", (e: Event) => {
            this.lastInteraction = new Date();
            checkAllUnits();
        });
        window.addEventListener("resize", (e: Event) => {
            this.lastInteraction = new Date();
            checkAllUnits();
        });
        document.addEventListener("library", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            if (ce.detail) {
                if (this.unitsReady && this.referencesLoaded > 2) { // everything is ready
                    // do stuff here if necessary after everything is loaded
                }
            }
        });
        document.addEventListener("bidsrecieved", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            const eo = <EventObject>ce;
            if (eo.detail) {
                if (this.units[eo.detail.code].elegableForDraw()) {
                    this.units[eo.detail.code].status = Status.READYTODRAW;
                    this.units[eo.detail.code].draw(eo.detail.fromViewableEvent);
                }
            }
        });
        document.addEventListener("timeout", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            const eo = <EventObject>ce;
            if (eo.detail) {
                if (this.units[eo.detail.code].elegableForDraw(true)) {
                    this.units[eo.detail.code].status = Status.READYTODRAW;
                    this.units[eo.detail.code].draw(eo.detail.fromViewableEvent);
                }
            }
        });
        document.addEventListener("viewable", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            const eo = <EventObject>ce;
            if (eo.detail) {
                if (this.units[eo.detail.code].retries.viewable < this.units[eo.detail.code].retries.limit && (this.units[eo.detail.code].status === Status.UNDEFINED || this.units[eo.detail.code].status === Status.READYTODRAW)) {
                    this.units[eo.detail.code].retries.viewable++;
                    if (this.units[eo.detail.code].status === Status.UNDEFINED) {
                        this.units[eo.detail.code].fetch(eo.detail.fromViewableEvent);
                    } else if (this.units[eo.detail.code].elegableForDraw()) {
                        this.units[eo.detail.code].draw(eo.detail.fromViewableEvent);
                    }
                }
            }
        });
        document.addEventListener("waitingover", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            const eo = <EventObject>ce;
            if (eo.detail) {
                if (this.units[eo.detail.code].retries.timer.long) {
                    clearTimeout(this.units[eo.detail.code].retries.timer.long);
                    this.units[eo.detail.code].retries.timer.long = -1;
                }
                this.units[eo.detail.code].retries.viewable = 0;
                if (this.units[eo.detail.code].status === Status.UNDEFINED) {
                    this.units[eo.detail.code].fetch(eo.detail.fromViewableEvent);
                } else if (this.units[eo.detail.code].elegableForDraw()) {
                    this.units[eo.detail.code].draw(eo.detail.fromViewableEvent);
                }
            }
        });
        document.addEventListener("adrendered", (e: Event) => {
            const ce: CustomEvent = e as CustomEvent;
            const eo = <EventObject>ce;
            if (eo.detail) {
                this.units[eo.detail.code].attempted++;
                if (!this.units[eo.detail.code].empty) {
                    this.units[eo.detail.code].shown++;
                    this.units[eo.detail.code].lastShown = new Date();
                    this.units[eo.detail.code].retries.viewable = 0;
                    if (this.units[eo.detail.code].retries.timer.long) {
                        window.clearTimeout(this.units[eo.detail.code].retries.timer.long);   
                        this.units[eo.detail.code].retries.timer.long = -1;
                    }
                }
                if (this.units[eo.detail.code].retries.timer.short) {
                    window.clearTimeout(this.units[eo.detail.code].retries.timer.short);   
                    this.units[eo.detail.code].retries.timer.short = -1;
                }
                this.units[eo.detail.code].bidsReturned.a9 = false;
                this.units[eo.detail.code].bidsReturned.prebid = false;
                this.units[eo.detail.code].status = Status.UNDEFINED;
                // set the longer timer - viewable shouldn't mess with this
                if (!this.units[eo.detail.code].retries.timer.long) {
                    this.units[eo.detail.code].retries.timer.long = window.setTimeout(() => { this.dispatchEvent("waitingover", eo); }, settings.retries.wait);
                }
                if (this.units[eo.detail.code].empty && this.units[eo.detail.code].viewable) {
                    this.units[eo.detail.code].retries.timer.short = window.setTimeout(() => { this.dispatchEvent('viewable', eo); }, settings.retries.viewability.wait);
                }
                const el = document.getElementById(eo.detail.code);
                el && el.setAttribute('data-empty', String(this.units[eo.detail.code].empty));
                el && el.setAttribute('data-retries-viewable', String(this.units[eo.detail.code].retries.viewable));
            }
        });
        let erroredReferences = 0;
        function loadAndWatchScript(src: string, callbackname: string) {
            const script = document.createElement('script'),
                ref = document.getElementsByTagName('script')[0];
            script.src = src;
            script.setAttribute("async", "async");
            script.onload = function() { scriptCallback("loaded " + callbackname); }
            script.onerror = function() { erroredReferences++; /*gtmEventSend();*/ }
            ref && ref.parentNode && ref.parentNode.insertBefore(script, ref);
        }
        loadAndWatchScript('//c.amazon-adsystem.com/aax2/apstag.js', '/apstag.js');
        loadAndWatchScript('//acdn.adnxs.com/prebid/not-for-prod/prebid.js', '/prebid.js');
        loadAndWatchScript('//securepubads.g.doubleclick.net/tag/js/gpt.js', '/gpt.js');
    }
    enableLogging() {
        document.addEventListener("adrendered", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug adrendered", eo.detail, (new Date()).getTime() - this.loaded.getTime(), "empty", this.units[eo.detail.code].empty, "retries.viewable", this.units[eo.detail.code].retries.viewable); }})
        document.addEventListener("bidsrecieved", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug bidsrecieved", eo.detail.code, (new Date()).getTime() - this.loaded.getTime(), "a9", this.units[eo.detail.code].bidsReturned.a9, "prebid", this.units[eo.detail.code].bidsReturned.prebid, "drawing", this.units[eo.detail.code].status === Status.DRAWING); }});
        document.addEventListener("waitingover", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug waitingover", eo.detail, (new Date()).getTime() - this.loaded.getTime()); }});
        document.addEventListener("viewable", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug viewable", eo.detail, (new Date()).getTime() - this.loaded.getTime(), "empty", this.units[eo.detail.code].empty, "attempted", this.units[eo.detail.code].attempted, "retries.viewable", this.units[eo.detail.code].retries.viewable); }});
        document.addEventListener("timeout", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug timeout", eo.detail.code, (new Date()).getTime() - this.loaded.getTime(), eo.detail.fromViewableEvent); }});
        document.addEventListener("library", (e: Event) => { const ce = e as CustomEvent; if (ce.detail) { const eo = <EventObject>ce;console.log("adsdebug library", eo.detail, (new Date()).getTime() - this.loaded.getTime()); }});
    }
    report() {
        let div = document.getElementById('viewableads_report');
        if (!div) {
            div = document.createElement('div');
            div.id = 'viewableads_report';
            document.body.appendChild(div);
        }
        let html = '<div class="table-headers"><b></b></div><ul class="nof table">';
        this.prebid.forEach((unit: PrebidUnit) => {
            let code = unit.code;
            html += '<li data-shown="' + this.units[code].shown + '" data-attempted="' + this.units[code].attempted + '">';
            if (this.units[code].viewable) {
                html += '<b>' + code + '</b><b></b></li>';
            } else {
                html += '<b></b><b>' + code + '</b></li>';
            }
        });
        html += '</ul>';
        div.innerHTML = html;
    }   
}
if (typeof window['adCommands'] !== "undefined") {
    let adCommands = window['adCommands'];
    window['ads'] = window['ads'] || new Ads();
    let ads = window['ads'];
    if (ads.logging) {
        const match = window.location.href.match(ads.loggingPattern);
        if (match && match[1] === 'report') {
            setInterval(() => { ads.report() }, 500);
        } else {
            ads.enableLogging();
        }
    }
    adCommands.forEach((command: Function) => { command(ads); });
    Object.defineProperty(adCommands, "push", {
        enumerable: false, // hide from for...in
        configurable: false, // prevent further meddling...
        writable: false, // see above ^
        value: (command: Function) => { command(ads);return adCommands.length; }
    });
}