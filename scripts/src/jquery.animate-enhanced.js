/************************************************
	jquery.animate-enhanced plugin v0.3
	Author: www.benbarnett.net || @benpbarnett
*************************************************

Extends $.animate() to automatically use CSS3 transformations where applicable.
Requires jQuery 1.4.2+

Supports -moz-transition, -webkit-transition, -o-transition, transition
	
Targetted properties (for now):
	- left
	- top
	- opacity
	
Usage (exactly the same as it would be normally):
	
	$(element).animate({left: 200},  500, function() {
		// callback
	});
	
*********/

(function($) {
	// ----------
	// Plugin variables
	// ----------
	var cssTransitionsSupported = false,
		originalAnimateMethod = $.fn.animate,
		cssTransitionProperties = ["top", "left", "opacity"],
		cssPrefixes = ["", "-webkit-", "-moz-", "-o-"],
		callbackQueue = 0,
		cssMeta = {};
		
		
	
	// ----------
	// Check if this browser supports CSS3 transitions
	// ----------
	var thisBody = document.body || document.documentElement,
   	thisStyle = thisBody.style,
	transitionEndEvent = (thisStyle.WebkitTransition !== undefined) ? "webkitTransitionEnd" : (thisStyle.OTransition !== undefined) ? "oTransitionEnd" : "transitionend";
	cssTransitionsSupported = thisStyle.WebkitTransition !== undefined || thisStyle.MozTransition !== undefined || thisStyle.OTransition !== undefined || thisStyle.transition !== undefined;
	
	// ----------
	// Make a translate or translate3d string
	// ----------
	$.fn.getTranslation = function(x, y, use3D) {
		return (use3D === true) ? "translate3d("+x+"px,"+y+"px,0)" : "translate("+x+"px,"+y+"px)";
	};
	
	
	
	// ----------
	// Build up the CSS object
	// ----------
	$.fn.applyCSSTransition = function(cssProperties, property, duration, easing, value, isTransform, use3D) {		
		if (property == "left" || property == "top") cssMeta[property] = value;
		return $.fn.applyCSSWithPrefix(cssProperties, property, duration, easing, value, isTransform, use3D);
	};
	
	// ----------
	// Helper function to build up CSS properties using the various prefixes
	// ----------
	$.fn.applyCSSWithPrefix = function(cssProperties, property, duration, easing, value, isTransform, use3D) {
		for (var i = cssPrefixes.length - 1; i >= 0; i--){			
			if (typeof cssProperties[cssPrefixes[i] + 'transition-property'] === 'undefined') cssProperties[cssPrefixes[i] + 'transition-property'] = '';
			cssProperties[cssPrefixes[i]+'transition-property'] += ', ' + ((isTransform === true) ? cssPrefixes[i] + 'transform' : property);
			cssProperties[cssPrefixes[i]+'transition-duration'] = duration + 'ms';
			cssProperties[cssPrefixes[i]+'transition-timing-function'] = easing;
			cssProperties.secondary[((isTransform === true) ? cssPrefixes[i]+'transform' : property)] = (isTransform === true) ? $.fn.getTranslation(cssMeta.left, cssMeta.top, use3D) : value;
		};
		
		return cssProperties;
	};
	
	
	// ----------
	// The new $.animate() function
	// ----------
	$.fn.animate = function(prop, speed, easing, callback) {
		if (!cssTransitionsSupported || $.isEmptyObject(prop)) return originalAnimateMethod.apply(this, arguments);
		
		callbackQueue = 0;
		cssMeta = {};
		
		var opt = speed && typeof speed === "object" ? speed : {
			complete: callback || !callback && easing ||
				jQuery.isFunction( speed ) && speed,
			duration: speed,
			easing: callback && easing || easing && !jQuery.isFunction(easing) && easing
		}, propertyCallback = function() {
			callbackQueue--;
			if (callbackQueue <= 0) { 
				// clean up the animation props
				var reset = {};
				for (var i = cssPrefixes.length - 1; i >= 0; i--){
					reset[cssPrefixes[i]+'transition-property'] = 'none';
					reset[cssPrefixes[i]+'transition-duration'] = '';
					reset[cssPrefixes[i]+'transition-timing-function'] = '';
				};
				
				// convert translations to left & top for layout
				if (!prop.leaveTransforms === true) {
					if (cssMeta.top !== 0) {
						$(this).css(reset).css({
							'-webkit-transform': 'translate(0, 0)',
							'-moz-transform': 'translate(0, 0)',
							'-o-transform': 'translate(0, 0)',
							'transform': 'translate(0, 0)',
							'top': cssMeta.top + 'px'
						});
					}
					if (cssMeta.left !== 0) {
						$(this).css(reset).css({
							'-webkit-transform': 'translate(0, 0)',
							'-moz-transform': 'translate(0, 0)',
							'-o-transform': 'translate(0, 0)',
							'transform': 'translate(0, 0)',
							'left': cssMeta.left + 'px'
						});
					}
				}
				
				
				// we're done, trigger the user callback
				return opt.complete ? opt.complete.call() : null;
			}
		},
		easings = {
			bounce: 'cubic-bezier(0.0, 0.35, .5, 1.3)', 
			linear: 'linear',
			swing: 'ease-in-out'
		},
		cssProperties = {}, domProperties = null, cssEasing = "";
		cssProperties.secondary = {}; cssMeta.top = 0; cssMeta.left = 0;
		
		// make easing css friendly
		cssEasing = opt.easing || "swing";
		cssEasing = easings[cssEasing] ? easings[cssEasing] : cssEasing;

		// seperate out the properties for the relevant animation functions
		for (p in prop) {
			var cleanVal = typeof prop[p] == "string" ? prop[p].replace(/px/g, "") : prop[p];
			if ($.inArray(p, cssTransitionProperties) > -1 && $(this).css(p).replace(/px/g, "") !== cleanVal) {
				$.fn.applyCSSTransition(
					cssProperties, 
					p, 
					opt.duration, 
					cssEasing, 
					((p == "left" || p == "top") && prop.avoidTransforms === true) ? cleanVal + "px" : cleanVal, 
					(((p == "left" || p == "top") && prop.avoidTransforms !== true) ? true : false), 
					(prop.useTranslate3d === true) ? true : false);
					
				continue;
			}	
			if (p !== 'useTranslate3d' && p !== 'avoidTransforms' && p !== 'leaveTransforms') {
				domProperties = (!domProperties) ? {} : domProperties;
				domProperties[p] = prop[p];
			}
		}
		
		// clean up
		for (var i = cssPrefixes.length - 1; i >= 0; i--){
			if (typeof cssProperties[cssPrefixes[i]+'transition-property'] !== 'undefined') cssProperties[cssPrefixes[i]+'transition-property'] = cssProperties[cssPrefixes[i]+'transition-property'].substr(2);
		}

		// fire up DOM based animations
		if (domProperties) {
			callbackQueue++;
			originalAnimateMethod.apply(this, [domProperties, opt.duration, opt.easing, propertyCallback]);
		}
		
		// apply the CSS transitions
		if (!$.isEmptyObject(cssProperties.secondary)) {
			this.each(function() {
				var that = $(this).unbind(transitionEndEvent);
				callbackQueue++;
				that.css(cssProperties);
				setTimeout(function(){ 
					that.bind(transitionEndEvent, propertyCallback).css(cssProperties.secondary);
				});
			});
		}
		
		// over and out
		return this;
	};	
})(jQuery);