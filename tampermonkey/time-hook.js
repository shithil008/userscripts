/*!
 * TimeHook.js — Hook the page clock and apply temporary time offsets.
 * Exposes: window.TimeHook.boost(milliseconds), window.TimeHook.reset(), window.TimeHook.getOffset()
 *
 * IMPORTANT: Requires @grant none (or runs in page context) so page scripts see the hooked time.
 * IMPORTANT: Requires @grant none (runs in page context) so page scripts see the hooked time.
 * Design note: the Date constructor is wrapped as a subclass and Date.now is patched,
 * but the native Date object and its prototype are never replaced, so frameworks
 * (Zone.js, Rocket Loader, etc.) that copy or extend Date keep working.
 */
(function () {
    'use strict';

    // Real (original) time sources
    const realDateNow = Date.now;
    const realPerfNow = performance.now.bind(performance);
    const RealDate = Date;
    const RealDate = window.Date;
    const realDateNow = RealDate.now;
    const realPerfNow = window.performance.now.bind(window.performance);

    // Offset in milliseconds applied while a boost is active
    let offsetMs = 0;

    // --- Hook Date.now ---
    Date.now = function () {
        return realDateNow() + offsetMs;
    };

    // --- Hook new Date() / Date() constructor ---
    function HookedDate(...args) {
        if (new.target) {
            return args.length ? new RealDate(...args) : new RealDate(realDateNow() + offsetMs);
    // Subclass so all native statics/prototype behavior are inherited untouched.
    class HookedDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                super(realDateNow() + offsetMs);
            } else {
                super(...args);
            }
        }
        return RealDate(realDateNow() + offsetMs).toString();
        static now() {
            return realDateNow() + offsetMs;
        }
    }
    HookedDate.prototype = RealDate.prototype;
    HookedDate.now = Date.now;
    HookedDate.UTC = RealDate.UTC;
    HookedDate.parse = RealDate.parse;
    Date = HookedDate;
    // Preserve identity cues frameworks rely on
    Object.defineProperty(HookedDate, 'name', { value: 'Date', configurable: true });
    try { Object.defineProperty(HookedDate, Symbol.toStringTag, { value: 'Date', configurable: true }); } catch (e) { /* noop */ }

    // --- Hook performance.now ---
    performance.now = function () {
    // Replace only the now() on the shared object, keep prototype identical so Zone.js patches apply
    window.Date = HookedDate;
    window.performance.now = function () {
        return realPerfNow() + offsetMs;
    };

    // --- Public API ---
    window.TimeHook = {
        /**
         * Temporarily shift the page timer forward by the given amount.
         * @param {number} ms Offset in milliseconds (e.g. 30000 = +30 seconds)
         */
        boost: function (ms) {
            offsetMs = ms;
            console.log('[TimeHook] Boost active: +' + ms + 'ms (' + ms / 1000 + 's)');
            if (window.console && console.log) console.log('[TimeHook] Boost active: +' + ms + 'ms');
        },

        /**
         * Reset the timer back to real time.
         */
        reset: function () {
            offsetMs = 0;
            console.log('[TimeHook] Timer reset to normal.');
            if (window.console && console.log) console.log('[TimeHook] Timer reset to normal.');
        },

        /**
         * Returns the current offset in milliseconds (0 when reset).
         */
        getOffset: function () {
            return offsetMs;
        }
    };
