'use strict';

/* Beep-o-tron

	fixes:
		-play calls resume on context.
		
		-proper class structure, and plug-in-structure

		-init calls resume on context if existing, creates one if not.
		    to be used on user gesture!
			https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio

		-fixed smoothing deprecation
			// see article: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Porting_webkitAudioContext_code_to_standards_based_AudioContext

 */

(function (){
	
	function BeepOTron()
	{
		this.beeps=[];
		this.polyphony=8;
		this.actx=null;
	}
	BeepOTron.prototype.init=function()
	{
		// call this when you get a click from the user.
		// private vars!
		if(this.actx==null)
		{
			if (typeof AudioContext !== "undefined") {
				this.actx=new AudioContext();
			} else if (typeof webkitAudioContext !== "undefined") {
				/*jshint newcap:false*/
				this.actx=new webkitAudioContext();
			} else {
				window.alert("WebAudio isn't supported in this browser yet :-(");
				// supported browsers include Chrome, Firefox, Edge, Safari, Opera
				throw new Error('AudioContext not supported. :(');
			}
			console.log("BeepoTron: audiocontext created");
		}else
		{
			//console.log("Beepotron init called, but audioContext allready created.");
			this.actx.resume().then(() => {
				//console.log('BeepoTron Playback resumed successfully on init');
			});
		}
	};
	BeepOTron.prototype.getType=function(i)
	{
		var tps=["sine","square","triangle","sawtooth"];
		return tps[i];
	};
	BeepOTron.prototype.createModulator=function(f,t,v)
	{
		var o={};
		o.o=this.actx.createOscillator();
		o.t=this.getType(t);
		o.o.type=o.t;
		o.f=f;
		o.o.frequency.setValueAtTime(o.f, 0.0); // may be: [-24000, 24000] if you are creating beeps, you should know that!
		o.g=this.actx.createGain();
		o.gv=v;
		o.g.gain.setValueAtTime(o.gv, 0.0);
		o.o.connect(o.g);
		return o;
	}
	BeepOTron.prototype.createCarrier=function(f,t,v)
	{
		var o={};
		o.c=-1;
		o.o=this.actx.createOscillator();
		o.t=this.getType(t)
		o.o.type=o.t;
		o.f=f;
		//o.o.frequency.value = o.f;
		o.o.frequency.setValueAtTime(o.f, 0.0);
		o.g=this.actx.createGain();
		o.gv=v;
		//o.g.gain.value =o.gv;
		o.g.gain.setValueAtTime(o.gv, 0.0);
		o.o.connect(o.g);
		return o;
	}
	BeepOTron.prototype.play=function(r,v,pt,pn)
	{
		
	 // if there is an old one and it needs stopping, stop it!
		var i;
		this.actx.resume().then(() => {
			
					var now = this.actx.currentTime;
	   if(this.beeps.length!=0)
	   {
	//	    console.log("starting mod: "+JSON.stringify(beeps));
		   for(i=0;i<beeps.length;i++)
		   {
			   var b=beeps[i];
			   var ts=new Date().getTime();
			   if((b.length+b.started)<ts)
			   {
				   //console.log(JSON.stringify(b.mod));
				   // we must stop it first.
					for(i=0;i<b.mod.length;i++)
					{
	//					var d=b.mod[i].o;
	//					console.log("starting mod: "+JSON.stringify(d));
						// create the envelope if there is one!
						b.mod[i].o.stop(now);
					}
			   }
		   }
						   
	   }
	   var mod=[];
	   var l=r.l;
		for(i=0;i<r.o.length;i++)
		{
			var d=r.o[i];
			if(d.c<0)
			{
				mod[i] =this.createCarrier(d.f,d.t,d.v);
			}else
			{
				mod[i] = this.createModulator(d.f,d.t,d.v);
			}
		}
		
		var env = this.actx.createGain(); // overal gain envelope!
		env.connect(this.actx.destination) ;
		var now = this.actx.currentTime;
		env.gain.cancelScheduledValues(now);
		if(typeof(r.e)!="undefined")
		{
			for(i=0;i<r.e.length;i++)
			{
				if(i==0)
					env.gain.setValueAtTime(r.e[i].v*v*d.v, now);
				//this.oscillator.frequency.setValueAtTime(frequency, actx.currentTime); is also possible! :)
				else
					env.gain.linearRampToValueAtTime(r.e[i].v*v*d.v, now + l*r.e[i].t);
				//
			}
		}
		// create connections
		for(i=r.o.length-1;i>=0;i--)
		{
			var d=r.o[i];
			if(d.c<0)
			{
				mod[i].g.connect(env);
			}else
			{
				var index=d.c;
				//  modulator.gain.connect(carrier.osc.frequency);
				if(d.m=="v")
					mod[i].g.connect(mod[index].g); // is you want to change the volume, you connect to the gain!
				else
					mod[i].g.connect(mod[index].o.frequency);
			}
		}
		for(i=0;i<mod.length;i++)
		{
			var d=r.o[i];
			//console.log("starting mod: "+JSON.stringify(d));
			// create the envelope if there is one!
			if(typeof(d.ve)!="undefined")
			{
				//console.log("do the volume envelop of: "+JSON.stringify(d.ve)+" to "+JSON.stringify(mod[i]));
				// put a envelope on the oscillator
				//mod[i].g.gain.cancelScheduledValues(now); // this is if you reuse oscillators..
				// we need to do something different for frequency and volume modifiers!
				var ove; // oscillator volume envelope
				for(ove=0;ove<d.ve.length;ove++)
				{
					if(ove==0)
						mod[i].g.gain.setValueAtTime(d.ve[ove].v*d.v, now);
					else
						mod[i].g.gain.linearRampToValueAtTime(d.ve[ove].v*d.v , now + l*d.ve[ove].t);
				}

			}
			if(typeof(d.fe)!="undefined")
			{
				console.log("do the frequency envelop of: "+JSON.stringify(d.fe)+" to "+JSON.stringify(mod[i]));
				// put a envelope on the oscillator
				//mod[i].g.gain.cancelScheduledValues(now); // this is if you reuse oscillators..
				// we need to do something different for frequency and volume modifiers!
				var ofe; // oscillator frequency envelope
				for(ofe=0;ofe<d.fe.length;ofe++)
				{
					if(ofe==0)
						mod[i].o.frequency.setValueAtTime(d.fe[ofe].v*d.f, now);
					else
						mod[i].o.frequency.linearRampToValueAtTime(d.fe[ofe].v*d.f , now + l*d.fe[ofe].t);
				}

			}
			mod[i].o.start(now);
			mod[i].o.stop(now+l);
			mod[i].stop=now+l;
		}
		if(this.polyphony==1)
		{
			// we save it in beeps,
			this.beeps=[{mod:mod,length:l,started:(new Date()).getTime()}];
		}
			
			
			
			
		});

	};

	MG.trons.beepotron=new BeepOTron();
	window['loaded_container_trons_beepotron']=true;

})();




