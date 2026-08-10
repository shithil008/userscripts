/*!
 * TimeHook.js
 * Accelerate (or slow) a page's sense of time. Unlike a one-shot clock offset,
 * this continuously speeds up timers so countdowns / timed ads elapse faster.
 *
 * It hooks:
 *   - setTimeout / setInterval  (delays are divided by the rate)
 *   - Date / Date.now           (the clock advances `rate` times faster)
 *   - performance.now           (same acceleration, for high-res loops)
 *   - <video>.playbackRate       (media fast-forwards with the rate)
 *
 * Public API (window.TimeHook):
 *   setRate(n)     Set the speed multiplier (1 = normal, 2 = twice as fast).
 *   getRate()      Read the current multiplier.
 *   speedUp([s])   Increase rate by s (default 1).
 *   speedDown([s]) Decrease rate by s (default 1).
 *   reset()        Back to real-time (rate = 1).
 *
 * Run in page context: userscript `@grant none`, `@run-at document-start`.
 */
(function (global) {
    'use strict';

    if (global.TimeHook && global.TimeHook.__installed) {
        return;
    }

    // Never touch anti-bot / captcha challenge frames (e.g. Cloudflare
    // Turnstile). They detect Date/timer tampering and will break.
    if (isProtectedFrame(global)) return;
    function isProtectedFrame(g) {
        var host = '', href = '';
        try { host = (g.location && g.location.hostname) || ''; } catch (e) {}
        try { href = (g.location && g.location.href) || ''; } catch (e) {}
        return /(^|\.)challenges\.cloudflare\.com$/.test(host) ||
               /(^|\.)hcaptcha\.com$/.test(host) ||
               /(^|\.)recaptcha\.net$/.test(host) ||
               /\/cdn-cgi\/challenge-platform\//.test(href) ||
               /\/recaptcha\//.test(href);
    }

    // --- Native snapshots (grab before patching) ----------------------------
    var NativeDate = global.Date;
    var nativeDateNow = NativeDate.now;
    var nativeSetInterval = global.setInterval.bind(global);
    var nativeClearInterval = global.clearInterval.bind(global);
    var nativeSetTimeout = global.setTimeout.bind(global);
    var nativeClearTimeout = global.clearTimeout.bind(global);
    var nativePerf = global.performance;
    var nativePerfNow = nativePerf ? nativePerf.now.bind(nativePerf) : null;

    // --- State --------------------------------------------------------------
    var rate = 1;

    // The accelerated clock is anchored so that changing the rate never makes
    // time jump backwards: fakeNow = anchorFake + (realNow - anchorReal) * rate.
    var anchorReal = nativeDateNow.call(NativeDate);
    var anchorFake = anchorReal;

    function realNow() { return nativeDateNow.call(NativeDate); }
    function fakeNow() { return anchorFake + (realNow() - anchorReal) * rate; }

    // Bookkeeping so live timers can be rescheduled when the rate changes.
    var intervals = Object.create(null);
    var timeouts = Object.create(null);

    function scale(delay) {
        var d = Number(delay) || 0;
        return Math.floor(d / rate);
    }

    function log() {
        if (!global.console || !console.log) return;
        var a = Array.prototype.slice.call(arguments);
        a.unshift('[TimeHook]');
        console.log.apply(console, a);
    }

    // --- Hook setInterval ---------------------------------------------------
    global.setInterval = function (handler, delay) {
        var extra = Array.prototype.slice.call(arguments, 2);
        var originMS = Number(delay) || 0;
        var id = nativeSetInterval.apply(null, [handler, scale(originMS)].concat(extra));
        intervals[id] = { handler: handler, originMS: originMS, extra: extra, id: id };
        return id;
    };

    global.clearInterval = function (id) {
        if (id != null && intervals[id]) delete intervals[id];
        return nativeClearInterval(id);
    };

    // --- Hook setTimeout ----------------------------------------------------
    global.setTimeout = function (handler, delay) {
        var extra = Array.prototype.slice.call(arguments, 2);
        var originMS = Number(delay) || 0;
        var rec = { handler: handler, originMS: originMS, extra: extra };

        function fire() {
            delete timeouts[rec.id];
            if (typeof handler === 'function') return handler.apply(this, arguments);
            return global.eval(handler); // string handler, like native behaviour
        }

        var id = nativeSetTimeout.apply(null, [fire, scale(originMS)].concat(extra));
        rec.id = id;
        rec.fireAtReal = realNow() + scale(originMS);
        timeouts[id] = rec;
        return id;
    };

    global.clearTimeout = function (id) {
        if (id != null && timeouts[id]) delete timeouts[id];
        return nativeClearTimeout(id);
    };

    // --- Hook Date ----------------------------------------------------------
    class HookedDate extends NativeDate {
        constructor() {
            if (arguments.length === 0) {
                super(fakeNow());
            } else {
                super(...arguments);
            }
        }
        static now() { return Math.floor(fakeNow()); }
    }
    try { Object.defineProperty(HookedDate, 'name', { value: 'Date', configurable: true }); } catch (e) {}
    try { Object.defineProperty(HookedDate, Symbol.toStringTag, { value: 'Date', configurable: true }); } catch (e) {}
    global.Date = HookedDate;

    // --- Hook performance.now ----------------------------------------------
    var perfAnchorReal = nativePerfNow ? nativePerfNow() : 0;
    var perfAnchorFake = perfAnchorReal;
    if (nativePerf && nativePerfNow) {
        try {
            nativePerf.now = function now() {
                return perfAnchorFake + (nativePerfNow() - perfAnchorReal) * rate;
            };
        } catch (e) { /* read-only in some sandboxes */ }
    }

    // --- Video playback -----------------------------------------------------
    function applyVideoRate() {
        var r = Math.min(16, Math.max(0.065, rate));
        var doc = global.document;
        if (!doc) return;
        var vids = doc.querySelectorAll('video');
        for (var i = 0; i < vids.length; i++) {
            try { vids[i].playbackRate = r; } catch (e) { /* locked */ }
        }
    }

    // --- Reschedule live timers on rate change ------------------------------
    function reschedule() {
        Object.keys(intervals).forEach(function (key) {
            var rec = intervals[key];
            nativeClearInterval(rec.id);
            delete intervals[key];
            var id = nativeSetInterval.apply(null, [rec.handler, scale(rec.originMS)].concat(rec.extra));
            rec.id = id;
            intervals[id] = rec;
        });

        var now = realNow();
        Object.keys(timeouts).forEach(function (key) {
            var rec = timeouts[key];
            var remaining = rec.fireAtReal - now;
            if (remaining < 0) remaining = 0;
            // Convert the remaining real time back into "page ms", then rescale.
            var newDelay = Math.floor(remaining); // already scaled previously
            nativeClearTimeout(rec.id);
            delete timeouts[key];
            var id = nativeSetTimeout.apply(null, [function () {
                delete timeouts[rec.id];
                if (typeof rec.handler === 'function') return rec.handler.apply(this, arguments);
                return global.eval(rec.handler);
            }, newDelay].concat(rec.extra));
            rec.id = id;
            rec.fireAtReal = now + newDelay;
            timeouts[id] = rec;
        });
    }

    // --- Public API ---------------------------------------------------------
    function setRate(n) {
        n = Number(n);
        if (!n || isNaN(n) || n <= 0) return rate;

        // Re-anchor both clocks so time stays continuous across the change.
        anchorFake = fakeNow();
        anchorReal = realNow();
        if (nativePerfNow) {
            perfAnchorFake = perfAnchorFake + (nativePerfNow() - perfAnchorReal) * rate;
            perfAnchorReal = nativePerfNow();
        }

        rate = n;
        reschedule();
        applyVideoRate();
        log('rate =', rate);
        return rate;
    }

    var api = {
        __installed: true,
        setRate: setRate,
        getRate: function () { return rate; },
        speedUp: function (s) { return setRate(rate + (Number(s) || 1)); },
        speedDown: function (s) { return setRate(rate - (Number(s) || 1)); },
        reset: function () { return setRate(1); }
    };

    Object.defineProperty(api, 'native', {
        value: Object.freeze({ Date: NativeDate, dateNow: nativeDateNow, performanceNow: nativePerfNow }),
        enumerable: false
    });

    // Keep video rate applied even if the site swaps in new <video> elements.
    nativeSetInterval(function () { if (rate !== 1) applyVideoRate(); }, 4000);

    global.TimeHook = api;
    log('installed');
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
