define(["Tone/core/Tone", "Tone/signal/LessThan", "Tone/signal/Switch"], function(Tone){

	/**
	 * 	@class  the output signal is the lesser of the incoming signal and min
	 * 	
	 *  @constructor
	 *  @extends {Tone}
	 *  @param {number} min the minimum to compare to the incoming signal
	 */
	Tone.Min = function(min){
		Tone.call(this);

		/**
		 *  the min signal
		 *  @type {Tone.Signal}
		 *  @private
		 */
		this._minSignal = new Tone.Signal(min);

		/**
		 *  @type {Tone.Switch}
		 *  @private
		 */
		this._switch = new Tone.Switch(this.input, this._minSignal);

		/**
		 *  @type {Tone.Switch}
		 *  @private
		 */
		this._lt = new Tone.LessThan(min);

		//connections
		this.input.connect(this._lt);
		this._lt.connect(this._switch.gate);
		this._switch.connect(this.output);
	};

	Tone.extend(Tone.Min);

	/**
	 *  set the min value
	 *  @param {number} min the minimum to compare to the incoming signal
	 */
	Tone.Min.prototype.setMin = function(min){
		this._minSignal.setValue(min);
	};

	/**
	 *  clean up
	 */
	Tone.Min.prototype.dispose = function(){
		this.input.disconnect();
		this.output.disconnect();
		this._minSignal.dispose();
		this._switch.dispose();
		this._lt.dispose();
		this.input = null;
		this.output = null;
		this._minSignal = null;
		this._switch = null;
		this._lt = null;
	};

	return Tone.Min;
});