define(["Tone/core/Tone", "Tone/signal/WaveShaper", "Tone/core/Type"], function(Tone){

	"use strict";

	/**
	 *  @class  A signal is an audio-rate value. Tone.Signal is a core component of the library.
	 *          Unlike a number, Signals can be scheduled with sample-level accuracy. Tone.Signal
	 *          has all of the methods available to native Web Audio 
	 *          [AudioParam](http://webaudio.github.io/web-audio-api/#the-audioparam-interface)
	 *          as well as additional conveniences. Read more about working with signals 
	 *          [here](https://github.com/Tonejs/Tone.js/wiki/Signals).
	 *
	 *  @constructor
	 *  @extends {Tone.SignalBase}
	 *  @param {Number|AudioParam} [value] Initial value of the signal. If an AudioParam
	 *                                     is passed in, that parameter will be wrapped
	 *                                     and controlled by the Signal. 
	 *  @param {string} [units=Number] unit The units the signal is in. 
	 *  @example
	 * var signal = new Tone.Signal(10);
	 */
	Tone.Signal = function(){

		var options = this.optionsObject(arguments, ["value", "units"], Tone.Signal.defaults);

		/**
		 * The units of the signal.
		 * @type {string}
		 */
		this.units = options.units;

		/**
		 *  When true, converts the set value
		 *  based on the units given. When false,
		 *  applies no conversion and the units
		 *  are merely used as a label. 
		 *  @type  {boolean}
		 */
		this.convert = options.convert;

		/**
		 *  True if the signal value is being overridden by 
		 *  a connected signal.
		 *  @readOnly
		 *  @type  {boolean}
		 *  @private
		 */
		this.overridden = false;

		/**
		 * The node where the constant signal value is scaled.
		 * @type {GainNode}
		 * @private
		 */
		this.output = this._scaler = this.context.createGain();

		/**
		 *  the minimum output value
		 *  @type {number}
		 *  @private
		 */
		this._minOutput = 0.00001;

		/**
		 * The node where the value is set.
		 * @type {AudioParam}
		 * @private
		 */
		this.input = this._value = this._scaler.gain;

		if (options.value instanceof AudioParam){
			this._scaler.connect(options.value);
			//zero out the value
			options.value.value = 0;
		} else {
			if (!this.isUndef(options.param)){
				this._scaler.connect(options.param);
				options.param.value = 0;
			}
			this.value = options.value;
		}

		//connect the constant 1 output to the node output
		Tone.Signal._constant.chain(this._scaler);
	};

	Tone.extend(Tone.Signal, Tone.SignalBase);

	/**
	 *  The default values
	 *  @type  {Object}
	 *  @static
	 *  @const
	 */
	Tone.Signal.defaults = {
		"value" : 0,
		"param" : undefined,
		"units" : Tone.Type.Default,
		"convert" : true,
	};

	/**
	 * The current value of the signal. 
	 * @memberOf Tone.Signal#
	 * @type {Number}
	 * @name value
	 */
	Object.defineProperty(Tone.Signal.prototype, "value", {
		get : function(){
			return this._toUnits(this._value.value);
		},
		set : function(value){
			var convertedVal = this._fromUnits(value);
			this._value.value = convertedVal;
		}
	});

	/**
	 *  Convert the given value from the type specified by Tone.Signal.units
	 *  into the destination value (such as gain).
	 *  @private
	 *  @param  {*} val the value to convert
	 *  @return {number}     the number which the value should be set to
	 */
	Tone.Signal.prototype._fromUnits = function(val){
		if (this.convert || this.isUndef(this.convert)){
			switch(this.units){
				case Tone.Type.Time: 
					return this.toSeconds(val);
				case Tone.Type.Frequency: 
					return this.toFrequency(val);
				case Tone.Type.Decibels: 
					return this.dbToGain(val);
				case Tone.Type.NormalRange: 
					return Math.min(Math.max(val, 0), 1);
				case Tone.Type.AudioRange: 
					return Math.min(Math.max(val, -1), 1);
				case Tone.Type.Positive: 
					return Math.max(val, 0);
				default:
					return val;
			}
		} else {
			return val;
		}
	};

	/**
	 * Convert the signals true value into the units specified by Tone.Signal.units.
	 * @private
	 * @param  {number} val the value to convert
	 * @return {number}
	 */
	Tone.Signal.prototype._toUnits = function(val){
		if (this.convert || this.isUndef(this.convert)){
			switch(this.units){
				case Tone.Type.Decibels: 
					return this.gainToDb(val);
				default:
					return val;
			}
		} else {
			return val;
		}
	};

	/**
	 *  Schedules a parameter value change at the given time.
	 *  @param {*}	value The value to set the signal.
	 *  @param {Time}  time The time when the change should occur.
	 *  @returns {Tone.Signal} this
	 *  @example
	 * //set the frequency to "G4" in exactly 1 second from now. 
	 * freq.setValueAtTime("G4", "+1");
	 */
	Tone.Signal.prototype.setValueAtTime = function(value, time){
		value = this._fromUnits(value);
		this._value.setValueAtTime(value, this.toSeconds(time));
		return this;
	};

	/**
	 *  Creates a schedule point with the current value at the current time.
	 *  This is useful for creating an automation anchor point in order to 
	 *  schedule changes from the current value. 
	 *
	 *  @param {number=} now (Optionally) pass the now value in. 
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.setRampPoint = function(now){
		now = this.defaultArg(now, this.now());
		var currentVal = this._value.value;
		this._value.setValueAtTime(currentVal, now);
		return this;
	};

	/**
	 *  Schedules a linear continuous change in parameter value from the 
	 *  previous scheduled parameter value to the given value.
	 *  
	 *  @param  {number} value   
	 *  @param  {Time} endTime 
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.linearRampToValueAtTime = function(value, endTime){
		value = this._fromUnits(value);
		this._value.linearRampToValueAtTime(value, this.toSeconds(endTime));
		return this;
	};

	/**
	 *  Schedules an exponential continuous change in parameter value from 
	 *  the previous scheduled parameter value to the given value.
	 *  
	 *  @param  {number} value   
	 *  @param  {Time} endTime 
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.exponentialRampToValueAtTime = function(value, endTime){
		value = this._fromUnits(value);
		value = Math.max(this._minOutput, value);
		this._value.exponentialRampToValueAtTime(value, this.toSeconds(endTime));
		return this;
	};

	/**
	 *  Schedules an exponential continuous change in parameter value from 
	 *  the current time and current value to the given value over the 
	 *  duration of the rampTime.
	 *  
	 *  @param  {number} value   The value to ramp to.
	 *  @param  {Time} rampTime the time that it takes the 
	 *                               value to ramp from it's current value
	 *  @returns {Tone.Signal} this
	 *  @example
	 * //exponentially ramp to the value 2 over 4 seconds. 
	 * signal.exponentialRampToValue(2, 4);
	 */
	Tone.Signal.prototype.exponentialRampToValue = function(value, rampTime){
		var now = this.now();
		// exponentialRampToValueAt cannot ever ramp from 0, apparently.
		// More info: https://bugzilla.mozilla.org/show_bug.cgi?id=1125600#c2
		var currentVal = this.value;
		this.setValueAtTime(Math.max(currentVal, this._minOutput), now);
		this.exponentialRampToValueAtTime(value, now + this.toSeconds(rampTime));
		return this;
	};

	/**
	 *  Schedules an linear continuous change in parameter value from 
	 *  the current time and current value to the given value over the 
	 *  duration of the rampTime.
	 *  
	 *  @param  {number} value   The value to ramp to.
	 *  @param  {Time} rampTime the time that it takes the 
	 *                               value to ramp from it's current value
	 *  @returns {Tone.Signal} this
	 *  @example
	 * //linearly ramp to the value 4 over 3 seconds. 
	 * signal.linearRampToValue(4, 3);
	 */
	Tone.Signal.prototype.linearRampToValue = function(value, rampTime){
		var now = this.now();
		this.setRampPoint(now);
		this.linearRampToValueAtTime(value, now + this.toSeconds(rampTime));
		return this;
	};

	/**
	 *  Start exponentially approaching the target value at the given time with
	 *  a rate having the given time constant.
	 *  @param {number} value        
	 *  @param {Time} startTime    
	 *  @param {number} timeConstant 
	 *  @returns {Tone.Signal} this 
	 */
	Tone.Signal.prototype.setTargetAtTime = function(value, startTime, timeConstant){
		value = this._fromUnits(value);
		// The value will never be able to approach without timeConstant > 0.
		// http://www.w3.org/TR/webaudio/#dfn-setTargetAtTime, where the equation
		// is described. 0 results in a division by 0.
		value = Math.max(this._minOutput, value);
		timeConstant = Math.max(this._minOutput, timeConstant);
		this._value.setTargetAtTime(value, this.toSeconds(startTime), timeConstant);
		return this;
	};

	/**
	 *  Sets an array of arbitrary parameter values starting at the given time
	 *  for the given duration.
	 *  	
	 *  @param {Array} values    
	 *  @param {Time} startTime 
	 *  @param {Time} duration  
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.setValueCurveAtTime = function(values, startTime, duration){
		for (var i = 0; i < values.length; i++){
			values[i] = this._fromUnits(values[i]);
		}
		this._value.setValueCurveAtTime(values, this.toSeconds(startTime), this.toSeconds(duration));
		return this;
	};

	/**
	 *  Cancels all scheduled parameter changes with times greater than or 
	 *  equal to startTime.
	 *  
	 *  @param  {Time} startTime
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.cancelScheduledValues = function(startTime){
		this._value.cancelScheduledValues(this.toSeconds(startTime));
		return this;
	};

	/**
	 *  Ramps to the given value over the duration of the rampTime. 
	 *  Automatically selects the best ramp type (exponential or linear)
	 *  depending on the `units` of the signal
	 *  
	 *  @param  {number} value   
	 *  @param  {Time} rampTime the time that it takes the 
	 *                               value to ramp from it's current value
	 *  @returns {Tone.Signal} this
	 *  @example
	 * //ramp to the value either linearly or exponentially 
	 * //depending on the "units" value of the signal
	 * signal.rampTo(0, 10);
	 */
	Tone.Signal.prototype.rampTo = function(value, rampTime){
		rampTime = this.defaultArg(rampTime, 0);
		if (this.units === Tone.Type.Frequency || this.units === Tone.Type.BPM){
			this.exponentialRampToValue(value, rampTime);
		} else {
			this.linearRampToValue(value, rampTime);
		}
		return this;
	};

	/**
	 *  dispose and disconnect
	 *  @returns {Tone.Signal} this
	 */
	Tone.Signal.prototype.dispose = function(){
		Tone.prototype.dispose.call(this);
		this._value = null;
		this._scaler = null;
		return this;
	};

	///////////////////////////////////////////////////////////////////////////
	//	STATIC
	///////////////////////////////////////////////////////////////////////////

	/**
	 *  Generates a constant output of 1.
	 *  @static
	 *  @private
	 *  @const
	 *  @type {AudioBufferSourceNode}
	 */
	Tone.Signal._constant = null;

	/**
	 *  initializer function
	 */
	Tone._initAudioContext(function(audioContext){
		var buffer = audioContext.createBuffer(1, 128, audioContext.sampleRate);
		var arr = buffer.getChannelData(0);
		for (var i = 0; i < arr.length; i++){
			arr[i] = 1;
		}
		Tone.Signal._constant = audioContext.createBufferSource();
		Tone.Signal._constant.channelCount = 1;
		Tone.Signal._constant.channelCountMode = "explicit";
		Tone.Signal._constant.buffer = buffer;
		Tone.Signal._constant.loop = true;
		Tone.Signal._constant.start(0);
		Tone.Signal._constant.noGC();
	});

	return Tone.Signal;
});