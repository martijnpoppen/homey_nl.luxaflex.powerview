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
                await this.manualSetCapabilityValues(true);
                await this.setCapabilityListeners();
            }

            await this.setAvailable();
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    // ------------- Settings -------------
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.homey.app.log(`[Device] ${this.getName()} - oldSettings`, { ...oldSettings });
        this.homey.app.log(`[Device] ${this.getName()} - newSettings`, { ...newSettings });

        if (changedKeys.length && this.getClass() === 'blinds') {
            await sleep(1000);
            this.manualSetCapabilityValues(true, newSettings);
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

            const pos2 = this.getCapabilityValue('windowcoverings_tilt_set');

            const setValue1 = settings.invertPosition1 ? 1 - value : value;
            const setValue2 = settings.invertPosition2 ? 1 - pos2 : pos2;

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET`, value);

            let request = {
                shade: {
                    positions: {
                        posKind1: parseInt(settings.posKind1),
                        position1: parseInt((65535 * setValue1).toFixed()),
                        ...(settings.dualmotor && settings.updatePosition2 && { posKind2: parseInt(settings.posKind2) }),
                        ...(settings.dualmotor && settings.updatePosition2 && { position2: parseInt((65535 * setValue2).toFixed()) })
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET shadeResponse: `, shadeResponse);

            if (settings.updatePosition2) {
                this.manualSetCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });
            } else {
                this.manualSetCapabilityValues(false, null, {
                    ...shadeResponse,
                    positions: {
                        ...request.shade.positions,
                        posKind2: parseInt(settings.posKind2),
                        position2: settings.invertPosition2 ? 1 - 0 : 0
                    }
                });
            }

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

            this.manualSetCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async onCapability_WINDOWCOVERINGS_SET_BOTH(value1, value2) {
        try {
            const deviceObject = await this.getData();
            const settings = await this.getSettings();
            const ip = settings.ip;

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET_BOTH`, value1, value2);

            const setValue1 = settings.invertPosition1 ? 1 - value1 : value1;
            const setValue2 = settings.invertPosition2 ? 1 - value2 : value2;

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

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET_BOTH request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET_BOTH shadeResponse: `, shadeResponse);

            this.manualSetCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });

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

    async manualSetCapabilityValues(...args) {
        // Disable interval as we call it manual
        this.clearIntervals();
        await this.setCapabilityValues(...args);
        this.setIntervalsAndFlows(true);
    }

    async setCapabilityValues(check = false, overrideSettings = null, overrideDeviceInfo = null) {
        this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues`, check, !!overrideSettings, !!overrideDeviceInfo);

        try {
            const deviceObject = await this.getData();
            const settings = overrideSettings ? overrideSettings : this.getSettings();

            const deviceInfo = overrideDeviceInfo ? overrideDeviceInfo : await getShade(settings.ip, this.homey.app.apiClient, deviceObject.id);

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
                await this.addOrRemoveCapability(settings.dualmotor, 'windowcoverings_tilt_set');
                await this.addOrRemoveCapability(settings.measure_battery, 'measure_battery');
            }

            if (overrideDeviceInfo) {
            }

            // // ------------ Get values --------------
            const { position1 } = positions;

            await this.setValue('windowcoverings_set', position1 / 65535);

            if (settings.dualmotor) {
                const { position2 } = positions;
                await this.setValue('windowcoverings_tilt_set', position2 / 65535);
            }

            await this.setValue('measure_battery', batteryTypes[batteryStatus]);
        } catch (error) {
            this.homey.app.error(error);
        }
    }

    async setValue(key, value, delay = 0) {
        if (this.hasCapability(key)) {
            const oldVal = await this.getCapabilityValue(key);

            if (value === null || isNaN(value)) {
                this.homey.app.log(`[Device] ${this.getName()} - setValue => ${key} => invalid!`, oldVal, value);
                return false;
            }

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
                await this.setCapabilityValuesInterval(15);
            }
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async setCapabilityValuesInterval(update_interval) {
        try {
            const REFRESH_INTERVAL = 1000 * (update_interval * 60);

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

module.exports = mainDevice;
