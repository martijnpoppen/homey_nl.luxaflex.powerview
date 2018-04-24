'use strict';

const Homey = require('homey');

class PowerviewApp extends Homey.App {
	
	onInit() {
		this.log('PowerviewApp is running...');
	}
	
}

module.exports = PowerviewApp;