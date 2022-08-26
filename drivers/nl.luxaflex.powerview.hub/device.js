'use strict';

const net = require('net');
const Homey = require('homey');

const OLD_SETTING_KEY_IP = "nl.luxaflex.powerview.settings.ip";


class PowerviewDevice extends Homey.Device {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Initializing ${this.getName()}`);


            await this.setAvailable();
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }
}


module.exports = PowerviewDevice;