'use strict';

const net = require('net');
const Homey = require('homey');

const DEFAULT_IP =  "192.168.0.1";
const SETTING_KEY_IP = "nl.luxaflex.powerview.settings.ip";


class PowerviewDevice extends Homey.Device {
    onInit() {
		
		this.ip = this.getSetting(SETTING_KEY_IP, DEFAULT_IP);
		
		this.log("hub initialized with IP:", this.ip);
		//var find = new testFind();
			
	}
	
    onAdded() {
        this.log("hub added.");
    }

    onDeleted() {
        this.log("hub deleted.");
    }
	
	onSettings( oldSettingsObj, newSettingsObj, changedKeysArr, callback ) {
		this.log("Settings updated.");
		callback( null, true );

		this.ip = this.getSetting(SETTING_KEY_IP, DEFAULT_IP);		
	}

	getSetting(settingID, defaultValue) {
		let settings = this.getSettings();

		if( settings == undefined || settings[settingID] == undefined)
			return defaultValue;
		else
			return settings[settingID];
	}
}


module.exports = PowerviewDevice;