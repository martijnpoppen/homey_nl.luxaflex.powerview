'use strict';

const Homey = require('homey');
const { sleep } = require('../lib/helpers');

class rootDevice extends Homey.Device {
    // ------------- Settings -------------
    async fixSettings() {
        const settings = await this.getSettings();
        if (!settings.ip && settings['nl.luxaflex.powerview.settings.ip'] && this.driver.id === 'nl.luxaflex.powerview.hub') {
            this.homey.app.log(`[Device] ${this.getName()} - fixSettings - set IP`, { ip: settings['nl.luxaflex.powerview.settings.ip'] });

            await this.setSettings({ ip: settings['nl.luxaflex.powerview.settings.ip'] });
        }

        this.isV3 = settings.apiVersion === '3';
        this.genType = this.isV3 ? '.gen3' : '';
    }

    // ------------- Capabilities -------------
    async checkCapabilities(filterCapability = null) {
        let driverCapabilities = this.driver.manifest.capabilities;
        const deviceCapabilities = this.getCapabilities();

        if (filterCapability) {
            driverCapabilities = driverCapabilities.filter((k) => k !== filterCapability);
        }

        this.homey.app.log(`[Device] ${this.getName()} - Device capabilities =>`, deviceCapabilities);
        this.homey.app.log(`[Device] ${this.getName()} - Driver capabilities =>`, driverCapabilities);

        await this.updateCapabilities(driverCapabilities, deviceCapabilities);

        return driverCapabilities;
    }

    async updateCapabilities(driverCapabilities, deviceCapabilities) {
        try {
            const newC = driverCapabilities.filter((d) => !deviceCapabilities.includes(d));
            const oldC = deviceCapabilities.filter((d) => !driverCapabilities.includes(d));

            this.homey.app.log(`[Device] ${this.getName()} - Got old capabilities =>`, oldC);
            this.homey.app.log(`[Device] ${this.getName()} - Got new capabilities =>`, newC);

            oldC.forEach((c) => {
                this.homey.app.log(`[Device] ${this.getName()} - updateCapabilities => Remove `, c);
                this.removeCapability(c);
            });
            await sleep(2000);
            newC.forEach((c) => {
                this.homey.app.log(`[Device] ${this.getName()} - updateCapabilities => Add `, c);
                this.addCapability(c);
            });
            await sleep(2000);
        } catch (error) {
            this.homey.app.log(error);
        }
    }

    async addOrRemoveCapability(add = true, key) {
        if (add && !this.hasCapability(key)) {
            this.homey.app.log(`[Device] ${this.getName()} - addOrRemoveCapability => Add =>`, key);
            await this.addCapability(key);
        } else if (!add) {
            this.homey.app.log(`[Device] ${this.getName()} - addOrRemoveCapability => Remove =>`, key);
            await this.removeCapability(key);
        }
    }
}

module.exports = rootDevice;
