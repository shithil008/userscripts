/*!
 * TimeHook.js
 * A tiny clock-hooking library. It overrides the page's time sources so that
 * scripts relying on the wall clock believe time has moved forward (or back).
 *
 * Public API (attached to window.TimeHook):
 *   boost(ms)        Apply a fixed offset in milliseconds (e.g. 30000 => +30s).
 *   boostSeconds(s)  Convenience wrapper around boost() using seconds.
 *   advance(ms)      Add to the current offset instead of replacing it.
 *   reset()          Remove any offset, restoring real time.
 *   getOffset()      Read the current offset in milliseconds.
 *   isActive()       True when an offset is currently applied.
 *
 * Run it in the page context (userscript `@grant none`, `@run-at document-start`)
 * so that the site's own scripts observe the hooked clock.
 */
(function (global) {
    'use strict';

    // Avoid double-installation if the script is injected more than once.
    if (global.TimeHook && global.TimeHook.__installed) {
        return;
    }

    // Snapshot the genuine time sources before anything is patched.
    var NativeDate = global.Date;
    var nativeDateNow = NativeDate.now;
    var nativePerf = global.performance;
    var nativePerfNow = nativePerf ? nativePerf.now.bind(nativePerf) : null;

    // The single source of truth for how far the clock is shifted.
    var offsetMs = 0;

    function currentEpoch() {
        return nativeDateNow.call(NativeDate) + offsetMs;
    }

    // --- Hooked Date --------------------------------------------------------
    // Subclassing keeps the whole Date prototype and every static method intact,
    // so code that does `x instanceof Date`, `Date.parse`, etc. still works.
    class HookedDate extends NativeDate {
        constructor() {
            if (arguments.length === 0) {
                super(currentEpoch());
            } else {
                super(...arguments);
            }
        }

        static now() {
            return currentEpoch();
        }
    }

    // Make the wrapper indistinguishable from the real Date for tooling that
    // sniffs the constructor name or tag.
    try {
        Object.defineProperty(HookedDate, 'name', { value: 'Date', configurable: true });
    } catch (e) { /* some engines lock this; harmless */ }
    try {
        Object.defineProperty(HookedDate, Symbol.toStringTag, { value: 'Date', configurable: true });
    } catch (e) { /* noop */ }

    global.Date = HookedDate;

    // --- Hooked performance.now --------------------------------------------
    // High-resolution timers (animation, countdown loops) should drift with the
    // same offset so accelerated pages stay internally consistent.
    if (nativePerf && nativePerfNow) {
        try {
            nativePerf.now = function now() {
                return nativePerfNow() + offsetMs;
            };
        } catch (e) { /* read-only in some sandboxes */ }
    }

    // --- Logging ------------------------------------------------------------
    function log() {
        if (!global.console || !console.log) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[TimeHook]');
        console.log.apply(console, args);
    }

    // --- Public API ---------------------------------------------------------
    var api = {
        __installed: true,

        boost: function (ms) {
            offsetMs = Number(ms) || 0;
            log('offset set to ' + offsetMs + 'ms (' + (offsetMs / 1000) + 's)');
            return offsetMs;
        },

        boostSeconds: function (seconds) {
            return api.boost((Number(seconds) || 0) * 1000);
        },

        advance: function (ms) {
            offsetMs += Number(ms) || 0;
            log('offset advanced to ' + offsetMs + 'ms');
            return offsetMs;
        },

        reset: function () {
            offsetMs = 0;
            log('offset cleared, real time restored');
            return 0;
        },

        getOffset: function () {
            return offsetMs;
        },

        isActive: function () {
            return offsetMs !== 0;
        }
    };

    // Expose the untouched natives for advanced callers / debugging.
    Object.defineProperty(api, 'native', {
        value: Object.freeze({
            Date: NativeDate,
            dateNow: nativeDateNow,
            performanceNow: nativePerfNow
        }),
        enumerable: false
    });

    global.TimeHook = api;
    log('installed');
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
