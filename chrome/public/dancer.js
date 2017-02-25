'use strict';

(function () {

    var Dancer = function () {
        this.audioAdapter = new Dancer.adapters.webaudio(this);
        this.events = {};
        this.sections = [];
        this.bind('update', update);
    };

    Dancer.version = 'X.X.X';
    Dancer.adapters = {};

    Dancer.prototype = {

        load: function (source, boost) {
            this.audio = this.audioAdapter.load(source, boost);

            return this;
        },

        /* Actions */
        createKick: function (options) {
            return new Dancer.Kick(this, options);
        },

        bind: function (name, callback) {
            if (!this.events[name]) {
                this.events[name] = [];
            }
            this.events[name].push(callback);
            return this;
        },

        unbind: function (name) {
            if (this.events[name]) {
                delete this.events[name];
            }
            return this;
        },

        trigger: function (name) {
            var _this = this;
            if (this.events[name]) {
                this.events[name].forEach(function (callback) {
                    callback.call(_this);
                });
            }
            return this;
        },

        // Returns the magnitude of a frequency or average over a range of frequencies
        getFrequency: function (freq, endFreq) {
            var sum = 0;
            if (endFreq !== undefined) {
                for (var i = freq; i <= endFreq; i++) {
                    sum += this.getSpectrum()[i];
                }
                return sum / (endFreq - freq + 1);
            } else {
                return this.getSpectrum()[freq];
            }
        },

        getWaveform: function () {
            return this.audioAdapter.getWaveform();
        },

        getSpectrum: function () {
            return this.audioAdapter.getSpectrum();
        },

        /* Sections */

        after: function (time, callback) {
            var _this = this;
            this.sections.push({
                condition: function () {
                    return _this.getTime() > time;
                },
                callback: callback
            });
            return this;
        },

        before: function (time, callback) {
            var _this = this;
            this.sections.push({
                condition: function () {
                    return _this.getTime() < time;
                },
                callback: callback
            });
            return this;
        },

        between: function (startTime, endTime, callback) {
            var _this = this;
            this.sections.push({
                condition: function () {
                    return _this.getTime() > startTime && _this.getTime() < endTime;
                },
                callback: callback
            });
            return this;
        },

        onceAt: function (time, callback) {
            var
                _this = this,
                thisSection = null;
            this.sections.push({
                condition: function () {
                    return _this.getTime() > time && !this.called;
                },
                callback: function () {
                    callback.call(this);
                    thisSection.called = true;
                },
                called: false
            });
            // Baking the section in the closure due to callback's this being the dancer instance
            thisSection = this.sections[this.sections.length - 1];
            return this;
        }
    };

    function update() {
        for (var i in this.sections) {
            if (this.sections[i].condition && this.sections[i].condition())
                this.sections[i].callback.call(this);
        }
    }

    window.Dancer = Dancer;
})();

(function (Dancer) {

    var CODECS = {
        'mp3': 'audio/mpeg;',
        'ogg': 'audio/ogg; codecs="vorbis"',
        'wav': 'audio/wav; codecs="1"',
        'aac': 'audio/mp4; codecs="mp4a.40.2"'
    },
        audioEl = document.createElement('audio');

    Dancer.options = {};

    Dancer.setOptions = function (o) {
        for (var option in o) {
            if (o.hasOwnProperty(option)) {
                Dancer.options[option] = o[option];
            }
        }
    };
})(window.Dancer);

(function (undefined) {
    var Kick = function (dancer, o) {
        o = o || {};
        this.dancer = dancer;
        this.frequency = o.frequency !== undefined ? o.frequency : [0, 5];
        this.threshold = o.threshold !== undefined ? o.threshold : 0.3;
        this.decay = o.decay !== undefined ? o.decay : 0.02;
        this.onKick = o.onKick;
        this.offKick = o.offKick;
        this.isOn = false;
        this.currentThreshold = this.threshold;
        this.previousMag = 0;
        this.canUseRatio = true;
        this.canUseRatioHandle = null;

        var _this = this;
        this.dancer.bind('update', function () {
            _this.onUpdate();
        });
    };

    Kick.prototype = {
        on: function () {
            this.isOn = true;
            return this;
        },
        off: function () {
            this.isOn = false;
            return this;
        },

        set: function (o) {
            o = o || {};
            this.frequency = o.frequency !== undefined ? o.frequency : this.frequency;
            this.threshold = o.threshold !== undefined ? o.threshold : this.threshold;
            this.decay = o.decay !== undefined ? o.decay : this.decay;
            this.onKick = o.onKick || this.onKick;
            this.offKick = o.offKick || this.offKick;
        },

        onUpdate: function () {
            if (!this.isOn) { return; }

            var magnitude = this.maxAmplitude(this.frequency);
            if (magnitude >= this.currentThreshold && magnitude >= this.threshold) {
                this.currentThreshold = magnitude;
                this.onKick && this.onKick.call(this.dancer, magnitude);
                this.canUseRatio = false;

                if (this.canUseRatioHandle) {
                    clearTimeout(this.canUseRatioHandle);
                    this.canUseRatioHandle = null;
                }

                var self = this;
                this.canUseRatioHandle = setTimeout(function () {
                    self.canUseRatio = true;
                }, 5000);
            } else {
                if (magnitude / this.previousMag > this.threshold * 5 && magnitude > 0.1 && this.canUseRatio) {
                    this.onKick && this.onKick.call(this.dancer, magnitude, magnitude / this.previousMag);
                } else {
                    this.offKick && this.offKick.call(this.dancer, magnitude);
                }

                this.currentThreshold -= this.decay;
                this.previousMag = (magnitude > 0) ? magnitude : 0.0001;
            }
        },
        maxAmplitude: function (frequency) {
            var max = 0, fft = this.dancer.getSpectrum();

            // Sloppy array check
            if (!frequency.length) {
                return frequency < fft.length ?
                    fft[~~frequency] :
                    null;
            }

            for (var i = frequency[0], l = frequency[1]; i <= l; i++) {
                if (fft[i] > max) { max = fft[i]; }
            }
            return max;
        }
    };

    window.Dancer.Kick = Kick;
})();

(function () {
    var
        SAMPLE_SIZE = 2048,
        SAMPLE_RATE = 44100;

    var adapter = function (dancer) {
        var context;

        if ('AudioContext' in window) {
            context = new AudioContext();
        } else {
            context = new webkitAudioContext();
        }

        this.dancer = dancer;
        this.context = context;
    };

    adapter.prototype = {

        load: function (_source, boost) {
            var _this = this;
            this.source = this.context.createMediaStreamSource(_source);

            this.isLoaded = false;
            this.progress = 0;

            if (this.proc) {
                this.proc.onaudioprocess = null;
                delete this.proc;
            }

            this.proc = this.context.createScriptProcessor(SAMPLE_SIZE / 2, 1, 1);

            this.proc.onaudioprocess = function (e) {
                _this.update.call(_this, e);
            };

            this.gain = this.context.createGain();

            this.fft = new FFT(SAMPLE_SIZE / 2, SAMPLE_RATE, boost);
            this.signal = new Float32Array(SAMPLE_SIZE / 2);

            connectContext.call(_this);

            return this.source;
        },

        getWaveform: function () {
            return this.signal;
        },

        getSpectrum: function () {
            return this.fft.spectrum;
        },

        update: function (e) {
            var
                buffers = [],
                channels = e.inputBuffer.numberOfChannels,
                resolution = SAMPLE_SIZE / channels,
                sum = function (prev, curr) {
                    return prev[i] + curr[i];
                }, i;

            for (i = channels; i--;) {
                buffers.push(e.inputBuffer.getChannelData(i));
            }

            for (i = 0; i < resolution; i++) {
                this.signal[i] = channels > 1 ?
                    buffers.reduce(sum) / channels :
                    buffers[0][i];
            }

            this.fft.forward(this.signal);
            this.dancer.trigger('update');
        }
    };

    function connectContext() {
        this.source.connect(this.proc);
        this.source.connect(this.gain);
        this.gain.connect(this.context.destination);
        this.proc.connect(this.context.destination);

        this.isLoaded = true;
        this.progress = 1;
        this.dancer.trigger('loaded');
    }

    Dancer.adapters.webaudio = adapter;

})();


/*
 *  DSP.js - a comprehensive digital signal processing  library for javascript
 *
 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 *  Copyright 2010 Corban Brook. All rights reserved.
 *
 */

// Fourier Transform Module used by DFT, FFT, RFFT
function FourierTransform(bufferSize, sampleRate, boost) {
    this.bufferSize = bufferSize;
    this.sampleRate = sampleRate;
    this.bandwidth = 2 / bufferSize * sampleRate / 2;
    this.boost = boost ? boost : 1;

    this.spectrum = new Float32Array(bufferSize / 2);
    this.real = new Float32Array(bufferSize);
    this.imag = new Float32Array(bufferSize);

    this.peakBand = 0;
    this.peak = 0;

    /**
     * Calculates the *middle* frequency of an FFT band.
     *
     * @param {Number} index The index of the FFT band.
     *
     * @returns The middle frequency in Hz.
     */
    this.getBandFrequency = function (index) {
        return this.bandwidth * index + this.bandwidth / 2;
    };

    this.setBoost = function (boost) {
        this.boost = boost;
    };

    this.calculateSpectrum = function () {
        var spectrum = this.spectrum,
            real = this.real,
            imag = this.imag,
            boost = this.boost,
            bSi = 2 / this.bufferSize,
            sqrt = Math.sqrt,
            rval,
            ival,
            mag;

        for (var i = 0, N = bufferSize / 2; i < N; i++) {
            rval = real[i];
            ival = imag[i];
            mag = bSi * sqrt(rval * rval + ival * ival);

            if (mag > this.peak) {
                this.peakBand = i;
                this.peak = mag;
            }

            spectrum[i] = mag * boost;
        }
    };
}

/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 * @param {Number} boost The coefficient
 *
 * @constructor
 */
function FFT(bufferSize, sampleRate, boost) {
    FourierTransform.call(this, bufferSize, sampleRate, boost);

    this.reverseTable = new Uint32Array(bufferSize);

    var limit = 1;
    var bit = bufferSize >> 1;

    var i;

    while (limit < bufferSize) {
        for (i = 0; i < limit; i++) {
            this.reverseTable[i + limit] = this.reverseTable[i] + bit;
        }

        limit = limit << 1;
        bit = bit >> 1;
    }

    this.sinTable = new Float32Array(bufferSize);
    this.cosTable = new Float32Array(bufferSize);

    for (i = 0; i < bufferSize; i++) {
        this.sinTable[i] = Math.sin(-Math.PI / i);
        this.cosTable[i] = Math.cos(-Math.PI / i);
    }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function (buffer) {
    // Locally scope variables for speed up
    var bufferSize = this.bufferSize,
        cosTable = this.cosTable,
        sinTable = this.sinTable,
        reverseTable = this.reverseTable,
        real = this.real,
        imag = this.imag,
        spectrum = this.spectrum;

    var k = Math.floor(Math.log(bufferSize) / Math.LN2);

    if (Math.pow(2, k) !== bufferSize) { throw "Invalid buffer size, must be a power of 2."; }
    if (bufferSize !== buffer.length) { throw "Supplied buffer is not the same size as defined FFT. FFT Size: " + bufferSize + " Buffer Size: " + buffer.length; }

    var halfSize = 1,
        phaseShiftStepReal,
        phaseShiftStepImag,
        currentPhaseShiftReal,
        currentPhaseShiftImag,
        off,
        tr,
        ti,
        tmpReal,
        i;

    for (i = 0; i < bufferSize; i++) {
        real[i] = buffer[reverseTable[i]];
        imag[i] = 0;
    }

    while (halfSize < bufferSize) {
        //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
        //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
        phaseShiftStepReal = cosTable[halfSize];
        phaseShiftStepImag = sinTable[halfSize];

        currentPhaseShiftReal = 1;
        currentPhaseShiftImag = 0;

        for (var fftStep = 0; fftStep < halfSize; fftStep++) {
            i = fftStep;

            while (i < bufferSize) {
                off = i + halfSize;
                tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

                real[off] = real[i] - tr;
                imag[off] = imag[i] - ti;
                real[i] += tr;
                imag[i] += ti;

                i += halfSize << 1;
            }

            tmpReal = currentPhaseShiftReal;
            currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
            currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
        }

        halfSize = halfSize << 1;
    }

    return this.calculateSpectrum();
};