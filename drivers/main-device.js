'use strict';

const Homey = require('homey');
const { sleep } = require('../lib/helpers');
const { setShade, getShade } = require('../lib/api');

class mainDevice extends Homey.Device {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Initializing ${this.getName()}`);

            const driverData = this.homey.drivers.getDriver('nl.luxaflex.powerview.shade');
            const driverDevices = driverData.getDevices();
            const deviceObject = this.getData();
            const sleepIndex = driverDevices.findIndex(device => {
                const driverDeviceObject = device.getData();
                return deviceObject.id === driverDeviceObject.id
            })

            await sleep((sleepIndex + 1) * 5000)

            this.homey.app.log('[Device] - init - after sleep =>', sleepIndex, this.getName());

            await this.checkCapabilities();
            await this.setCapabilityValues(true);
            await this.setCapabilityListeners();

            await this.setAvailable();

            await this.setIntervalsAndFlows();
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
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

            const shadeResponse = await setShade(ip, request, deviceObject.id);

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

            const shadeResponse = await setShade(ip, request, deviceObject.id);

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


            const sceneResponse = await getScenes(ip, value);

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


            const sceneResponse = await getSceneCollection(ip, value);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneCollectionSet sceneResponse: `, sceneResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async setCapabilityValues(check = false) {
        this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues`);

        try {
            const deviceObject = await this.getData();
            const settings = await this.getSettings();
            const ip = settings.ip;
            const deviceInfo = await getShade(ip, deviceObject.id);
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

            await this.setValue('measure_battery', batteryTypes[batteryStatus]);

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

            // if (typeof value === 'boolean' && key.startsWith('is_') && oldVal !== value) {
            //     await this.homey.flow
            //         .getDeviceTriggerCard(`${key}_changed`)
            //         .trigger(this, { [`${key}`]: value })
            //         .catch(this.error)
            //         .then(this.homey.app.log(`[Device] ${this.getName()} - setValue ${key}_changed - Triggered: "${key} | ${value}"`));
            // }
        }
    }

    // ------------- Intervals -------------
    async setIntervalsAndFlows() {
        try {
            if (this.getAvailable()) {
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
