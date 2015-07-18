define(["Tone/core/Tone", "Tone/source/Player", "Tone/component/AmplitudeEnvelope", "Tone/instrument/Instrument"],
    function(Tone){

        "use strict";

        /**
         *  @class A stripped back Tone.Sampler which plays an audio buffer
         *         through an amplitude envelope only. A sample's offset can
         *         be called using triggerAttack.
         *         Nested lists will be flattened.
         *
         *  @constructor
         *  @extends {Tone.Instrument}
         *  @param {Object|string} urls the urls of the audio file
         *  @param {Object} options the options object for the synth
         *  @example
         *  var simpler = new Simpler({
	 *  	A : {
	 *  		1 : {"./audio/casio/A1.mp3",
	 *  		2 : "./audio/casio/A2.mp3",
	 *  	},
	 *  	"B.1" : "./audio/casio/B1.mp3",
	 *  });
	 *  //...once samples have loaded
	 *  simpler.triggerAttack(time, offset, velocity);
	 */
        Tone.Simpler = function(urls, options){

            Tone.Instrument.call(this);
            options = this.defaultArg(options, Tone.Simpler.defaults);

            /**
             *  the sample player
             *  @type {Tone.Player}
             */
            this.player = new Tone.Player(options.player);
            this.player.retrigger = true;

            /**
             *  the buffers
             *  @type {Object<Tone.Buffer>}
             *  @private
             */
            this._buffers = {};

            /**
             *  The amplitude envelope.
             *  @type {Tone.Envelope}
             */
            this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

            //connections / setup
            this._loadBuffers(urls);
            this.player.chain(this.envelope, this.output);
        };

        Tone.extend(Tone.Simpler, Tone.Instrument);

        /**
         *  the default parameters
         *  @static
         */
        Tone.Simpler.defaults = {
            "player" : {
                "loop" : false,
            },
            "envelope" : {
                "attack" : 0.001,
                "decay" : 0,
                "sustain" : 1,
                "release" : 0.1,
            },
        };

        /**
         *  load the buffers
         *  @param   {Object} urls   the urls
         *  @private
         */
        Tone.Simpler.prototype._loadBuffers = function(urls){
            if (typeof urls === "string"){
                this._buffers["0"] = new Tone.Buffer(urls, function(){
                    this.sample = "0";
                }.bind(this));
            } else {
                urls = this._flattenUrls(urls);
                for (var buffName in urls){
                    this._sample = buffName;
                    var urlString = urls[buffName];
                    this._buffers[buffName] = new Tone.Buffer(urlString);
                }
            }
        };

        /**
         *  flatten an object into a single depth object
         *  https://gist.github.com/penguinboy/762197
         *  @param   {Object} ob
         *  @return  {Object}
         *  @private
         */
        Tone.Simpler.prototype._flattenUrls = function(ob) {
            var toReturn = {};
            for (var i in ob) {
                if (!ob.hasOwnProperty(i)) continue;
                if ((typeof ob[i]) == "object") {
                    var flatObject = this._flattenUrls(ob[i]);
                    for (var x in flatObject) {
                        if (!flatObject.hasOwnProperty(x)) continue;
                        toReturn[i + "." + x] = flatObject[x];
                    }
                } else {
                    toReturn[i] = ob[i];
                }
            }
            return toReturn;
        };

        /**
         *  start the sample.
         *  @param {Tone.Time} [time=now] the time when the note should start
         *  @param {offset} [0] the offset time in the buffer (in seconds) where playback will begin
         *  @param {number} [velocity=1] the velocity of the note
         *  @returns {Tone.Simpler} `this`
         */
        Tone.Simpler.prototype.triggerAttack = function(time, offset, velocity){
            time = this.toSeconds(time);
            this.player.start(time, offset);
            this.envelope.triggerAttack(time, velocity);
            return this;
        };

        /**
         *  start the release portion of the sample
         *
         *  @param {Tone.Time} [time=now] the time when the note should release
         *  @returns {Tone.Simpler} `this`
         */
        Tone.Simpler.prototype.triggerRelease = function(time){
            time = this.toSeconds(time);
            this.envelope.triggerRelease(time);
            this.player.stop(this.toSeconds(this.envelope.release) + time);
            return this;
        };

        /**
         *  clean up
         *  @returns {Tone.Simpler} `this`
         */
        Tone.Simpler.prototype.dispose = function(){
            Tone.Instrument.prototype.dispose.call(this);
            this.player.dispose();
            this.envelope.dispose();
            this.player = null;
            this.envelope = null;
            for (var sample in this._buffers){
                this._buffers[sample].dispose();
                this._buffers[sample] = null;
            }
            this._buffers = null;
            return this;
        };

        return Tone.Simpler;
    });
