var Service, Characteristic;
var request = require("request");
var pollingtoevent = require("polling-to-event");

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-http", "Http", HttpAccessory);
};

function HttpAccessory(log, config) {
	this.log = log;

	// accessory details
	this.manufacturer = config["manufacturer"] || "HTTP Manufacturer";
	this.model = config["model"] || "HTTP Model";
	this.serial_number = config["serial_number"] || "HTTP Serial Number";
	
	// define methods
	this.name = config["name"];
	this.http_method = config["http_method"] || "GET";
	this.http_brightness_method = config["http_brightness_method"] || this.http_method;
	this.http_hue_method = config["http_hue_method"] || this.http_method;
	this.http_saturation_method = config["http_saturation_method"] || this.http_method;
	
	// switch, light and non-switch handling accessories (sensors)
	this.service = config["service"] || "Switch";
	this.switchHandling = config["switchHandling"] || "no";
	this.on_url = config["on_url"];
	this.on_body = config["on_body"];
	this.off_url = config["off_url"];
	this.off_body = config["off_body"];
	this.status_url = config["status_url"];
	this.status_on = config["status_on"];
	this.status_off = config["status_off"];
	
	// brightness (light)
	this.brightnessHandling = config["brightnessHandling"] || "no";
	this.brightness_url = config["brightness_url"];
	this.brightnesslvl_url = config["brightnesslvl_url"];
	
	// color (light)
	this.colorHandling = config["colorHandling"] || "no";
	this.hue_url = config["hue_url"];
	this.hueset_url = config["hueset_url"];
	this.saturation_url = config["saturation_url"];
	this.saturationset_url = config["saturationset_url"];
	
	// additional
	this.sendimmediately = config["sendimmediately"] || "";
	this.username = config["username"] || "";
	this.password = config["password"] || "";

	// realtime polling info
	this.state = false;
	this.enableSet = true;
	this.currentlevel = 0;
	this.currenthue = 0;
	this.currentsaturation = 0;
	
	var that = this;

	
	// Status Polling, if you want to add additional services that don't use switch handling you can add something like this || (this.service=="Smoke" || this.service=="Motion"))
	if ((this.status_url && this.switchHandling === "realtime") || (this.status_url && this.service === "Smoke") || (this.status_url && this.service === "Motion") || (this.status_url && this.service === "IrrigationSystem") || (this.status_url && this.service === "ContactSensor") || (this.status_url && this.service === "CarbonDioxideSensor") || (this.status_url && this.service === "Outlet")|| (this.status_url && this.service === "Valve")|| (this.status_url && this.service === "Speaker")|| (this.status_url && this.service === "SecuritySystem")|| (this.status_url && this.service === "Faucet")|| (this.status_url && this.service === "Occupancy") || (this.status_url && this.service === "Fan") || (this.status_url && this.service === "Leak") || (this.status_url && this.service === "Doorbell") || (this.status_url && this.service === "StatelessProgrammableSwitch")) {
		
		var powerurl = this.status_url;
		var statusemitter = pollingtoevent(function(done) {
			that.httpRequest(powerurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, body) {
				if (error) {
					that.log("HTTP get power function failed: %s", error.message);
					try {
						done(new Error("Network failure that must not stop homebridge!"));
					} catch (err) {
						that.log(err.message);
					}
				} else {
					done(null, body);
				}
			})
		}, {longpolling: true, interval: 300, longpollEventName: "statuspoll"});

		function compareStates(customStatus, stateData) {
			var objectsEqual = true;
			
			for (var param in customStatus) {
				if (!stateData.hasOwnProperty(param) || customStatus[param] !== stateData[param]) {
					objectsEqual = false;
					break;
				}
			}
			
			// that.log("Equal", objectsEqual);
			return objectsEqual;
		}

		statusemitter.on("statuspoll", function(responseBody) {
			var binaryState;
			
			if (that.status_on && that.status_off) {//Check if custom status checks are set
				var customStatusOn = that.status_on;
				var customStatusOff = that.status_off;
				var statusOn, statusOff;

				// Check to see if custom states are a json object and if so compare to see if either one matches the state response
				if (responseBody.startsWith("{")) {
					statusOn = compareStates(customStatusOn, JSON.parse(responseBody));
					statusOff = compareStates(customStatusOff, JSON.parse(responseBody));
				} else {
					statusOn = responseBody.includes(customStatusOn);
					statusOff = responseBody.includes(customStatusOff);
				}
				
				that.log("Status On Status Poll", statusOn);
				if (statusOn) binaryState = 1;
				//else binaryState = 0;
				if (statusOff) binaryState = 0;
			} else {
				binaryState = parseInt(responseBody.replace(/\D/g, ""));
			}
			
			that.state = binaryState > 0;
			that.log(that.service, "received power", that.status_url, "state is currently", binaryState);
			// switch used to easily add additonal services
			that.enableSet = false;
			
		switch (that.service) {
		case "Switch":
			if (that.switchService) {
			that.switchService
			.getCharacteristic(Characteristic.On)
			.setValue(that.state);
			}
		break;
                case "Outlet":
                         if (that.OutletService) {
                         that.OutletService
                         .getCharacteristic(Characteristic.On)
                         .setValue(that.state);
                         }
                break;
                case "Fan":
                         if (that.FanService) {
                         that.FanService
                         .getCharacteristic(Characteristic.On)
                         .setValue(that.state);
                         }
                break;
		case "Light":
			if (that.lightbulbService) {
			that.lightbulbService
			.getCharacteristic(Characteristic.On)
			setValue(that.state);
			}
		break;
		case "Smoke":
			if (that.smokeService) {
			that.smokeService
			.getCharacteristic(Characteristic.SmokeDetected)
			.setValue(that.state);
			}
		break;
		case "Motion":
			if (that.motionService) {
			that.motionService
			.getCharacteristic(Characteristic.MotionDetected)
			.setValue(that.state);
			}
		break;
                case "Leak":
                         if (that.leakService) {
                         that.leakService
                         .getCharacteristic(Characteristic.LeakDetected)
                         .setValue(that.state);
                         }
                break;
                case "CarbonDioxideSensor":
                         if (that.CarbonDioxideSensorService) {
                         that.CarbonDioxideSensorService
                         .getCharacteristic(Characteristic.CarbonDioxideDetected)
                         .setValue(that.state);
                         }
                break;
                case "ContactSensor":
                         if (that.ContactSensorService) {
                         that.ContactSensorService
                         .getCharacteristic(Characteristic.ContactSensorState)
                         .setValue(that.state);
                         }
                break;
                case "Faucet":
                         if (that.faucetService) {
                         that.faucetService
                         .getCharacteristic(Characteristic.Active)
                         .setValue(that.state);
                         }
                break;
                case "IrrigationSystem":
                         if (that.IrrigationSystemService) {
                         that.IrrigationSystemService
                         .getCharacteristic(Characteristic.Active)
                         .setValue(that.state);
                         }
                break;
                case "Valve":
                         if (that.ValveService) {
                         that.ValveService
                         .getCharacteristic(Characteristic.Active)
                         .setValue(that.state);
                         }
                break;
                case "SecuritySystem":
                         if (that.SecuritySystemService) {
                         that.SecuritySystemService
                         .getCharacteristic(Characteristic.StatusTampered)
                         .setValue(that.state);
                         }
                break;
                case "Doorbell":
                         if (that.DoorbellService) {
                         that.DoorbellService
                         .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                         .setValue(that.state);
                         }
                break;
                case "Speaker":
                         if (that.SpeakerService) {
                         that.SpeakerService
                         .getCharacteristic(Characteristic.Mute)
                         .setValue(that.state);
                         }
                break;
		case "Occupancy":
			if (that.occupancyService) {
			that.occupancyService
			.getCharacteristic(Characteristic.OccupancyDetected)
			.setValue(that.state);
			}
		break;
			}
			
			that.enableSet = true;
		});

	}
	
	// Brightness Polling [Will get removed soon]
	if (this.brightnesslvl_url && this.brightnessHandling === "realtime") {
		var brightnessurl = this.brightnesslvl_url;
		
		var levelemitter = pollingtoevent(function(done) {
			that.httpRequest(brightnessurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
				if (error) {
					that.log("HTTP get power function failed: %s", error.message);
					return;
				} else {
					done(null, responseBody);
				}
			})// set longer polling as slider takes longer to set value
		}, { longpolling: true, interval: 300, longpollEventName: "levelpoll" });

		levelemitter.on("levelpoll", function(responseBody) {
			that.currentlevel = parseInt(responseBody);
			that.enableSet = false;
			
			if (that.lightbulbService) {
				that.log(that.service, "received brightness", that.brightnesslvl_url, "level is currently", that.currentlevel);
				that.lightbulbService
					.getCharacteristic(Characteristic.Brightness)
					.setValue(that.currentlevel);
			}
			
			that.enableSet = true;
		});
	}
	
	// Hue Polling [Will get removed soon]
	if (this.hue_url && this.colorHandling === "realtime") {
		var hueurl = this.hue_url;
		var levelemitter = pollingtoevent(function(done) {
			that.httpRequest(hueurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
				if (error) {
					that.log('HTTP get hue function failed: %s', error.message);
					return;
				} else {               				    
					done(null, responseBody);
				}
			}) // set longer polling as slider takes longer to set value
		}, {longpolling: true, interval: 2000, longpollEventName: "huepoll"});

		levelemitter.on("huepoll", function(data) {  
			that.currenthue = parseInt(data);

			if (that.lightbulbService) {				
				that.log(that.service, "received hue",that.hue_url, "level is currently", that.currenthue); 		        
				that.lightbulbService
					.getCharacteristic(Characteristic.Hue)
					.setValue(that.currenthue);
			}        
		});
	}

	// Saturation Polling [Will get removed soon]
	if (this.saturation_url && this.colorHandling === "realtime") {
		var saturationurl = this.saturation_url;
		var levelemitter = pollingtoevent(function(done) {
			that.httpRequest(saturationurl, "", "GET", that.username, that.password, that.sendimmediately, function(error, response, responseBody) {
				if (error) {
					that.log('HTTP get saturation function failed: %s', error.message);
					return;
				} else {               				    
					done(null, responseBody);
				}
			}) // set longer polling as slider takes longer to set value
		}, {longpolling: true, interval: 2000, longpollEventName: "saturationpoll"});

		levelemitter.on("saturationpoll", function(data) {  
			that.currentsaturation = parseInt(data);

			if (that.lightbulbService) {				
				that.log(that.service, "received saturation",that.hue_url, "level is currently", that.currentsaturation); 		        
				that.lightbulbService
					.getCharacteristic(Characteristic.Saturation)
					.setValue(that.currentsaturation);
			}        
		});
	}
}



HttpAccessory.prototype = {
	httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false,
			auth: {
				user: username,
				pass: password,
				sendImmediately: sendimmediately
			}
		},
		function(error, response, body) {
			callback(error, response, body)
		})
	},

	// for switch & sensor (smoke, motion, occupancy)
	getPowerState: function(callback) {
		if (!this.status_url) {
			this.log.warn("Ignoring request; No status url defined.");
			callback(new Error("No status url defined."));
			return;
		}

		var url = this.status_url;
		this.log("Getting power state");

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function (error, response, responseBody) {
			if (error) {
				this.log("HTTP get power function failed: %s", error.message);
				callback(error);
			} else {
				var binaryState;
				this.log("Status Config On", this.status_on);
				
				if (this.status_on && this.status_off) {	//Check if custom status checks are set
					var customStatusOn = that.status_on;
					var customStatusOff = that.status_off;
					var statusOn, statusOff;

					// Check to see if custom states are a json object and if so compare to see if either one matches the state response
					if (responseBody.startsWith("{")) {
						statusOn = compareStates(customStatusOn, JSON.parse(responseBody));
						statusOff = compareStates(customStatusOff, JSON.parse(responseBody));
					} else {
						statusOn = responseBody.includes(customStatusOn);
						statusOff = responseBody.includes(customStatusOff);
					}
					
					that.log("Status On Get Power State", statusOn);
					if (statusOn) binaryState = 1;
					// else binaryState = 0;
					if (statusOff) binaryState = 0;
				} else {
					binaryState = parseInt(responseBody.replace(/\D/g, ""));
				}
				
				var powerOn = binaryState > 0;
				this.log("Power state is currently %s", binaryState);
				callback(null, powerOn);
			}
		}.bind(this));
	},
	
	setPowerState: function(powerState, callback) {
		this.log("Power On", powerState);
		this.log("Enable Set", this.enableSet);
		this.log("Current Level", this.currentlevel);
		
		if (this.enableSet === true) {
			var url;
			var body;

			if (!this.on_url || !this.off_url) {
				this.log.warn("Ignoring request; No power url defined.");
				callback(new Error("No power url defined."));
				return;
			}

			if (powerState) {
				url = this.on_url;
				body = this.on_body;
				this.log("Setting power state to on");
			} else {
				url = this.off_url;
				body = this.off_body;
				this.log("Setting power state to off");
			}

			this.httpRequest(url, body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error) {
					this.log("HTTP set power function failed: %s", error.message);
					callback(error);
				} else {
					this.log("HTTP set power function succeeded!");
					callback();
				}
			}.bind(this));
		} else {
			callback();
		}
	},


	// for light (brightness, hue, saturation) Will get removed soon
	getBrightness: function(callback) {
		if (!this.brightnesslvl_url) {
			this.log.warn("Ignoring request; No brightness level url defined.");
			callback(new Error("No brightness level url defined."));
			return;
		}
		
		var url = this.brightnesslvl_url;
		this.log("Getting Brightness level");

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function (error, response, responseBody) {
			if (error) {
				this.log("HTTP get brightness function failed: %s", error.message);
				callback(error);
			} else {
				var binaryState = parseInt(responseBody.replace(/\D/g, ""));
				var level = binaryState;
				this.log("brightness state is currently %s", binaryState);
				callback(null, level);
			}
		}.bind(this));
	},

	setBrightness: function(level, callback) {
		if (this.enableSet === true) {
			if (!this.brightness_url) {
				this.log.warn("Ignoring request; No brightness url defined.");
				callback(new Error("No brightness url defined."));
				return;
			}

			var url = this.brightness_url.replace("%b", level);
			this.log("Setting brightness to %s", level);
			
			this.httpRequest(url, "", this.http_brightness_method, this.username, this.password, this.sendimmediately, function (error, response, body) {
				if (error) {
					this.log("HTTP brightness function failed: %s", error);
					callback(error);
				} else {
					this.log("HTTP brightness function succeeded!");
					callback();
				}
			}.bind(this));
		} else {
			callback();
		}
	},
	
	getHue: function(callback) {
		if (!this.hue_url) {
			this.log.warn("Ignoring request; No hue level url defined.");
			callback(new Error("No hue level url defined."));
			return;
		}

		var url = this.hue_url;
		this.log("Getting Hue level");

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP get hue function failed: %s', error.message);
				callback(error);
			} else {
				var binaryState = parseInt(responseBody);
				var level = binaryState;
				this.log("hue state is currently %s", binaryState);
				callback(null, level);
			}
		}.bind(this));
	},

	setHue: function(level, callback) {
		if (!this.hueset_url) {
			this.log.warn("Ignoring request; No hue url defined.");
			callback(new Error("No hue url defined."));
			return;
		}

		var url = this.hueset_url.replace("%b", level)
		this.log("Setting hue to %s", level);

		this.httpRequest(url, "", this.http_hue_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
			if (error) {
				this.log('HTTP hue function failed: %s', error);
				callback(error);
			} else {
				this.log('HTTP hue function succeeded!');
				callback();
			}
		}.bind(this));
	},

	getSaturation: function(callback) {
		if (!this.saturation_url) {
			this.log.warn("Ignoring request; No hue level url defined.");
			callback(new Error("No saturation level url defined."));
			return;
		}

		var url = this.saturation_url;
		this.log("Getting Saturation level");

		this.httpRequest(url, "", "GET", this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP get saturation function failed: %s', error.message);
				callback(error);
			} else {
				var binaryState = parseInt(responseBody);
				var level = binaryState;
				this.log("saturation state is currently %s", binaryState);
				callback(null, level);
			}
		}.bind(this));
	},

	setSaturation: function(level, callback) {
		if (!this.saturationset_url) {
			this.log.warn("Ignoring request; No saturation url defined.");
			callback(new Error("No saturation url defined."));
			return;
		}

		var url = this.saturationset_url.replace("%b", level)
		this.log("Setting saturation to %s", level);

		this.httpRequest(url, "", this.http_saturation_method, this.username, this.password, this.sendimmediately, function(error, response, body) {
			if (error) {
				this.log('HTTP saturation function failed: %s', error);
				callback(error);
			} else {
				this.log('HTTP saturation function succeeded!');
				callback();
			}
		}.bind(this));
	},


	identify: function(callback) {
		this.log("Identify requested!");
		callback(); //success
	},

	getServices: function() {
		var that = this;

		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial_number);

		switch (this.service) {
			case "Switch":
				this.switchService = new Service.Switch(this.name);
				
				switch (this.switchHandling) {
					//Power Polling
					case "yes":
						this.switchService
							.getCharacteristic(Characteristic.On)
							.on("get", this.getPowerState.bind(this))
							.on("set", this.setPowerState.bind(this));
					break;
					case "realtime":
						this.switchService
							.getCharacteristic(Characteristic.On)
							.on("get", function (callback) {callback(null, that.state)})
							.on("set", this.setPowerState.bind(this));
					break;
					default:
						this.switchService
							.getCharacteristic(Characteristic.On)
							.on("set", this.setPowerState.bind(this));
					break;
				}
				
				return [this.switchService];
			break;

            case "Fan":
                this.FanService = new Service.Fan(this.name);
                
                switch (this.switchHandling) {
                        //Power Polling
                    case "yes":
                        this.FanService
                        .getCharacteristic(Characteristic.On)
                        .on("get", this.getPowerState.bind(this))
                        .on("set", this.setPowerState.bind(this));
                        break;
                    case "realtime":
                        this.FanService
                        .getCharacteristic(Characteristic.On)
                        .on("get", function (callback) {callback(null, that.state)})
                        .on("set", this.setPowerState.bind(this));
                        break;
                    default:
                        this.FanService
                        .getCharacteristic(Characteristic.On)
                        .on("set", this.setPowerState.bind(this));
                        break;
                }
                
                return [this.FanService];
                break;
                
            case "Outlet":
                this.OutletService = new Service.Outlet(this.name);
                
                switch (this.switchHandling) {
                        //Power Polling
                    case "yes":
                        this.OutletService
                        .getCharacteristic(Characteristic.On)
                        .on("get", this.getPowerState.bind(this))
                        .on("set", this.setPowerState.bind(this));
                        break;
                    case "realtime":
                        this.OutletService
                        .getCharacteristic(Characteristic.On)
                        .on("get", function (callback) {callback(null, that.state)})
                        .on("set", this.setPowerState.bind(this));
                        break;
                    default:
                        this.OutletService
                        .getCharacteristic(Characteristic.On)
                        .on("set", this.setPowerState.bind(this));
                        break;
                }
                
                return [this.OutletService];
                break;
				
			case "Light":
				this.lightbulbService = new Service.Lightbulb(this.name);
				
				switch (this.switchHandling) {
					//Power Polling
					case "yes":
						this.lightbulbService
							.getCharacteristic(Characteristic.On)
							.on("get", this.getPowerState.bind(this))
							.on("set", this.setPowerState.bind(this));
					break;
					case "realtime":
						this.lightbulbService
							.getCharacteristic(Characteristic.On)
							.on("get", function(callback) {callback(null, that.state)})
							.on("set", this.setPowerState.bind(this));
					break;
					default:
						this.lightbulbService
							.getCharacteristic(Characteristic.On)
							.on("set", this.setPowerState.bind(this));
					break;
				}
				
				// Brightness Polling, ending soon
				switch (this.brightnessHandling) {
					case "yes":
						this.lightbulbService
							.addCharacteristic(new Characteristic.Brightness())
							.on("get", this.getBrightness.bind(this))
							.on("set", this.setBrightness.bind(this));
					break;
					case "realtime":
						this.lightbulbService
							.addCharacteristic(new Characteristic.Brightness())
							.on("get", function(callback) {callback(null, that.currentlevel)})
							.on("set", this.setBrightness.bind(this));
					break;
				}
				
				// Color Polling
				switch (this.colorHandling) {
					case "yes":
						this.lightbulbService
							.addCharacteristic(new Characteristic.Hue())
							.on('get', this.getHue.bind(this))
							.on('set', this.setHue.bind(this));
						this.lightbulbService
							.addCharacteristic(new Characteristic.Saturation())
							.on('get', this.getSaturation.bind(this))
							.on('set', this.setSaturation.bind(this));
					break;
					case "realtime":
						this.lightbulbService 
							.addCharacteristic(new Characteristic.Hue())
							.on('get', function(callback) {callback(null, that.currenthue)})
							.on('set', this.setHue.bind(this));
						this.lightbulbService
							.addCharacteristic(new Characteristic.Saturation())
							.on('get', function(callback) {callback(null, that.currentsaturation)})
							.on('set', this.setSaturation.bind(this));
					break;
				}

				return [informationService, this.lightbulbService];
			break;
				
	// Other Services		
	   case "Smoke":
		this.smokeService = new Service.SmokeSensor(this.name);
		this.switchHandling === "realtime";
		this.smokeService
		.getCharacteristic(Characteristic.SmokeDetected)
		.on('get', function(callback) {callback(null, that.state)});
		return [this.smokeService];
		break;
				
	   case "Motion":
		this.motionService = new Service.MotionSensor(this.name);
		this.switchHandling === "realtime";				
		this.motionService
		.getCharacteristic(Characteristic.MotionDetected)
		.on('get', function(callback) {callback(null, that.state)});
		return [this.motionService];
		break;
                
            case "CarbonDioxideSensor":
                this.CarbonDioxideSensorService = new Service.CarbonDioxideSensor(this.name);
                this.switchHandling === "realtime";
                this.CarbonDioxideSensorService
                .getCharacteristic(Characteristic.CarbonDioxideDetected)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.CarbonDioxideSensorService];
                break;
                
            case "ContactSensor":
                this.ContactSensorService = new Service.ContactSensor(this.name);
                this.switchHandling === "realtime";
                this.ContactSensorService
                .getCharacteristic(Characteristic.ContactSensorState)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.ContactSensorService];
                break;
				
            case "Faucet":
                this.faucetService = new Service.Faucet(this.name);
                this.switchHandling === "realtime";
                this.faucetService
                .getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.faucetService];
            break;
                
            case "IrrigationSystem":
                this.IrrigationSystemService = new Service.IrrigationSystem(this.name);
                this.switchHandling === "realtime";
                this.IrrigationSystemService
                .getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.IrrigationSystemService];
                break;

            case "Doorbell":
                this.DoorbellService = new Service.Doorbell(this.name);
                this.switchHandling === "realtime";
                this.DoorbellService
                .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.DoorbellService];
                break;
                
            case "Speaker":
                this.SpeakerService = new Service.Speaker(this.name);
                this.switchHandling === "realtime";
                this.SpeakerService
                .getCharacteristic(Characteristic.Mute)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.SpeakerService];
                break;
                
            case "Valve":
                this.ValveService = new Service.Valve(this.name);
                this.switchHandling === "realtime";
                this.ValveService
                .getCharacteristic(Characteristic.Active)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.ValveService];
                break;
                
            case "SecuritySystem":
                this.SecuritySystemService = new Service.SecuritySystem(this.name);
                this.switchHandling === "realtime";
                this.SecuritySystemService
                .getCharacteristic(Characteristic.StatusTampered)
                .on('get', function(callback) {callback(null, that.state)});
                return [this.SecuritySystemService];
                break;
                
	    case "Occupancy":
		this.occupancyService = new Service.OccupancySensor(this.name);
		this.switchHandling === "realtime";                
		this.occupancyService
		.getCharacteristic(Characteristic.OccupancyDetected)
		.on('get', function(callback) {callback(null, that.state)});
		return [this.occupancyService];
		break;
				
	    case "Leak":
		this.leakService = new Service.LeakSensor(this.name);
		this.switchHandling === "realtime";                
		this.leakService
		.getCharacteristic(Characteristic.LeakDetected)
		.on('get', function(callback) {callback(null, that.state)});
		return [this.leakService];
		break;
		
	// This will die soon				
	    case "StatelessProgrammableSwitch":
				this.statelessProgrammableSwitchService = new Service.StatelessProgrammableSwitch(this.name);
				/*this.switchHandling === "realtime";                
				this.statelessProgrammableSwitchService
					.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
					.on('get', function(callback) {callback(null, that.state)});*/
				
				switch (this.switchHandling) {
					case "yes":
						this.statelessProgrammableSwitchService
							.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
							.on("get", this.getPowerState.bind(this))
							.on("set", this.setPowerState.bind(this));
					break;
					case "realtime":
						this.statelessProgrammableSwitchService
							.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
							.on('get', function(callback) {callback(null, that.state)})
							.on("set", this.setPowerState.bind(this));
					break;
				}
				
				return [this.statelessProgrammableSwitchService];
			break;
			

		}
	}
};
