'use strict';

const Homey = require('homey');
const { sleep } = require('../lib/helpers');
const { setShade, getShade, getScenes, getSceneCollection } = require('../lib/api');

class mainDevice extends Homey.Device {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Connecting to: ${this.getName()} ...`);

            const driverData = this.homey.drivers.getDriver('nl.luxaflex.powerview.shade');
            const driverDevices = driverData.getDevices();
            const deviceObject = this.getData();

            const sleepIndex = driverDevices.findIndex((device) => {
                const driverDeviceObject = device.getData();
                return deviceObject.id === driverDeviceObject.id;
            });

            await sleep((sleepIndex + 1) * 5000);

            this.homey.app.log('[Device] - init - after sleep =>', sleepIndex, this.getName());

            await this.fixSettings();

            await this.checkCapabilities();

            if (this.getClass() === 'blinds') {
                await this.setCapabilityValues(true);
                await this.setCapabilityListeners();

                await this.setIntervalsAndFlows();
            }

            await this.setAvailable();
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    // ------------- Settings -------------
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log(`[Device] ${this.getName()} - oldSettings`, { ...oldSettings });
        this.log(`[Device] ${this.getName()} - newSettings`, { ...newSettings });

        if (changedKeys.length) {
            await this.setCapabilityValues(false, newSettings);
        }
    }

    async fixSettings() {
        const settings = await this.getSettings();
        if (settings['nl.luxaflex.powerview.settings.ip'] && this.driver.id === 'nl.luxaflex.powerview.hub') {
            this.homey.app.log(`[Device] ${this.getName()} - fixSettings - set IP`, { ip: settings['nl.luxaflex.powerview.settings.ip'] });

            await this.setSettings({ ip: settings['nl.luxaflex.powerview.settings.ip'] });
        }
    }

    async setCapabilityListeners() {
        await this.registerCapabilityListener('windowcoverings_set', this.onCapability_WINDOWCOVERINGS_SET.bind(this));

        if (this.hasCapability('windowcoverings_tilt_set')) {
            await this.registerCapabilityListener('windowcoverings_tilt_set', this.onCapability_WINDOWCOVERINGS_TILT_SET.bind(this));
        }
    }

    async onCapability_WINDOWCOVERINGS_SET(value) {
        try {
            const deviceObject = await this.getData();
            const settings = await this.getSettings();
            const ip = settings.ip || settings['nl.luxaflex.powerview.settings.ip'];

            const setValue = settings.invertPosition1 ? 1 - value : value;

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET`, value);

            let request = {
                shade: {
                    positions: {
                        posKind1: parseInt(settings.posKind1),
                        position1: parseInt((65535 * setValue).toFixed())
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET shadeResponse: `, shadeResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async onCapability_WINDOWCOVERINGS_TILT_SET(value) {
        try {
            const deviceObject = await this.getData();
            const settings = await this.getSettings();
            const ip = settings.ip;

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET`, value);

            const pos1 = this.getCapabilityValue('windowcoverings_set');

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET pos1`, pos1);

            const setValue1 = settings.invertPosition1 ? 1 - pos1 : pos1;
            const setValue2 = settings.invertPosition2 ? 1 - value : value;

            const request = {
                shade: {
                    positions: {
                        posKind1: parseInt(settings.posKind1),
                        position1: parseInt((65535 * setValue1).toFixed()),
                        posKind2: parseInt(settings.posKind2),
                        position2: parseInt((65535 * setValue2).toFixed())
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET shadeResponse: `, shadeResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async onCapability_sceneSet(value) {
        try {
            const settings = await this.getSettings();
            const ip = settings.ip || settings['nl.luxaflex.powerview.settings.ip'];

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneSet`, value);

            const sceneResponse = await getScenes(ip, this.homey.app.apiClient, value);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneSet sceneResponse: `, sceneResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async onCapability_sceneCollectionSet(value) {
        try {
            const settings = await this.getSettings();
            const ip = settings.ip || settings['nl.luxaflex.powerview.settings.ip'];

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneCollectionSet`, value);

            const sceneResponse = await getSceneCollection(ip, this.homey.app.apiClient, value);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneCollectionSet sceneResponse: `, sceneResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async setCapabilityValues(check = false, overrideSettings = null) {
        this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues`);

        try {
            const deviceObject = await this.getData();
            const settings = overrideSettings ? overrideSettings : this.getSettings();
            const ip = settings.ip;
            const deviceInfo = await getShade(ip, this.homey.app.apiClient, deviceObject.id);
            const { positions } = deviceInfo;
            const { batteryStatus } = deviceInfo;
            const batteryTypes = {
                4: 100,
                3: 100,
                2: 66,
                1: 23,
                0: 0
            };

            this.homey.app.log(`[Device] ${this.getName()} - deviceInfo =>`, deviceInfo);

            // // Check for existence
            if (check) {
                if (!settings.dualmotor) {
                    await this.removeCapability('windowcoverings_tilt_set');

                    await this.setSettings({
                        posKind1: positions.posKind1.toFixed()
                    });
                } else {
                    await this.setSettings({
                        posKind1: positions.posKind1.toFixed(),
                        posKind2: positions.posKind2.toFixed()
                    });
                }
            }

            // // ------------ Get values --------------

            if (settings.measure_battery) {
                if(!this.hasCapability('measure_battery')) {
                    this.homey.app.log(`[Device] ${this.getName()} - adding measure_battery =>`, settings);
                    await this.addCapability('measure_battery');
                }

                await this.setValue('measure_battery', batteryTypes[batteryStatus]);
            } else {
                this.homey.app.log(`[Device] ${this.getName()} - removing measure_battery =>`, settings);
                await this.removeCapability('measure_battery');
            }

            const { position1 } = positions;

            await this.setValue('windowcoverings_set', position1 / 65535);

            if (settings.dualmotor) {
                const { position2 } = positions;
                await this.setValue('windowcoverings_tilt_set', position2 / 65535);
            }
        } catch (error) {
            this.homey.app.error(error);
        }
    }

    async setValue(key, value, delay = 0) {
        if (this.hasCapability(key)) {
            const oldVal = await this.getCapabilityValue(key);

            this.homey.app.log(`[Device] ${this.getName()} - setValue => ${key} => `, oldVal, value);

            if (delay) {
                await sleep(delay);
            }

            await this.setCapabilityValue(key, value);

            const triggers = this.homey.manifest.flow.triggers;
            const triggerExists = triggers.find((trigger) => trigger.id === `${key}_changed`);

            if (triggerExists) {
                await this.homey.flow
                    .getDeviceTriggerCard(`${key}_changed`)
                    .trigger(this, { [`${key}`]: value })
                    .catch(this.error)
                    .then(this.homey.app.log(`[Device] ${this.getName()} - setValue ${key}_changed - Triggered: "${key} | ${value}"`));
            }
        }
    }

    // ------------- Intervals -------------
    async setIntervalsAndFlows(override = false) {
        try {
            if (override || this.getAvailable()) {
                await this.setCapabilityValuesInterval(2000);
            }
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async setCapabilityValuesInterval(update_interval) {
        try {
            const REFRESH_INTERVAL = 1000 * update_interval;

            this.homey.app.log(`[Device] ${this.getName()} - onPollInterval =>`, REFRESH_INTERVAL, update_interval);
            this.onPollInterval = setInterval(this.setCapabilityValues.bind(this), REFRESH_INTERVAL);
        } catch (error) {
            this.setUnavailable(error);
            this.homey.app.log(error);
        }
    }

    async clearIntervals() {
        this.homey.app.log(`[Device] ${this.getName()} - clearIntervals`);
        await clearInterval(this.onPollInterval);
    }

    // ------------- Capabilities -------------
    async checkCapabilities() {
        const driverCapabilities = this.driver.manifest.capabilities;
        const deviceCapabilities = this.getCapabilities();

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
}

module.exports = mainDevice;
