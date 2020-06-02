import { AdUnit } from './Internal';

export enum Status {
    UNDEFINED, // never loaded or finished rendering
    FETCHING, // fetching bids
    READYTODRAW, // bids are back
    DRAWING, // drawing
    WAITING, // waiting for the timeout between reloads
}
export enum Libraries {
    PREBID,
    A9,
    DFP
}
export interface ViewableSettings {
    rootMargin: string,
    threshold: Array<number>,
    callback: Function
}
export interface PrebidJS {
    setTargetingForGPTAsync: Function,
    requestBids: Function,
    que: Array<Function>,
    addAdUnits: Function,
    setConfig: Function
}
export interface PrebidUnit {
    code: string,
    mediaTypes: {
        banner: {
            sizes: Array<Array<number>>,
            bids: Array<object>
        }
    }
}
export interface A9JS {
    setDisplayBids: Function,
    fetchBids: Function,
    init: Function
}
export interface A9Unit {
    slotID: string,
    slotName: string,
    sizes: Array<Array<number>>
}
export interface GoogleJS {
    cmd: Array<Function>,
    display: Function,
    googletags: Function,
    pubads: Function,
    defineSlot: Function,
    enableServices: Function,
    destroySlots: Function
}
export interface GoogleUnit {
    setTargeting: Function,
    slot: {
        getSlotElementId: Function
    }
    isEmpty: Boolean
}
export interface AdUnits {
    [code: string]: AdUnit
}
export interface EventObject extends CustomEventInit<any> {
    detail: {
        code: string,
        fromViewableEvent?: Boolean,
        isEmpty?: Boolean
    }
}
export interface Settings {
    timeout: number, // in milliseconds
    interactionThreshold: number | Boolean, // in milliseconds, or false
    dfpUnitIdBase: string, // /{networkcode}/{string}
    a9Id: string, // guid from Amazon
    viewability: ViewableSettings,
    retries: {
        wait: number,
        viewability: { // retry loading the unit on empty
            wait: number,
            limit: number
        }
    }
}