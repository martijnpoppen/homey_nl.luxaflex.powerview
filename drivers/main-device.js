'use strict';

const rootDevice = require('./root-device');
const { setShade, getShade } = require('../lib/api');

const maxValue = 65535;

class mainDevice extends rootDevice {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Connecting to: ${this.getName()} ... (this might take longer when multiple shades are connected)`);

            const hasHub = await this.checkForHub();
            
            this.homey.app.log(`[Device] ${this.getName()} - checkForHub - `, hasHub);

            await this.fixSettings();
            await this.checkCapabilities();

            if (hasHub) {
                const driverData = this.homey.drivers.getDriver('nl.luxaflex.powerview.shade');
                const driverDevices = driverData.getDevices();
                const deviceObject = this.getData();

                const sleepIndex = driverDevices.findIndex((device) => {
                    const driverDeviceObject = device.getData();
                    return deviceObject.id === driverDeviceObject.id;
                });

                await sleep((sleepIndex + 1) * 10000);

                this.homey.app.log('[Device] - init - after sleep =>', sleepIndex, this.getName());

                await this.setCapabilityValues(true);
                await this.setCapabilityListeners();
                
                await this.setAvailable();

                this.shadeUpdate();
            } else {
                this.setUnavailable(`Can't find PowerviewHub. Is it connected to Homey? Make sure the IP address setting is the same.`);
            }
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async checkForHub() {
        const driverData = this.homey.drivers.getDriver('nl.luxaflex.powerview.hub');
        const driverDevices = driverData.getDevices();
        const settings = this.getSettings();

        return driverDevices.some((d) => {
            const driverDeviceSettings = d.getSettings();

            return driverDeviceSettings && driverDeviceSettings.ip === settings.ip;
        });
    }

    // ------------- Settings -------------
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.homey.app.log(`[Device] ${this.getName()} - oldSettings`, { ...oldSettings });
        this.homey.app.log(`[Device] ${this.getName()} - newSettings`, { ...newSettings });

        if (changedKeys.length) {
            await sleep(1000);
            this.setCapabilityValues(true, newSettings);
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
                        position1: parseInt((maxValue * setValue1).toFixed()),
                        ...(settings.dualmotor && settings.updatePosition2 && { posKind2: parseInt(settings.posKind2) }),
                        ...(settings.dualmotor && settings.updatePosition2 && { position2: parseInt((maxValue * setValue2).toFixed()) })
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET shadeResponse: `, shadeResponse);

            if (settings.updatePosition2) {
                this.setCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });
            } else {
                this.setCapabilityValues(false, null, {
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
                        position1: parseInt((maxValue * setValue1).toFixed()),
                        posKind2: parseInt(settings.posKind2),
                        position2: parseInt((maxValue * setValue2).toFixed())
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_TILT_SET shadeResponse: `, shadeResponse);

            this.setCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });

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
                        position1: parseInt((maxValue * setValue1).toFixed()),
                        posKind2: parseInt(settings.posKind2),
                        position2: parseInt((maxValue * setValue2).toFixed())
                    }
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET_BOTH request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET_BOTH shadeResponse: `, shadeResponse);

            this.setCapabilityValues(false, null, { ...shadeResponse, positions: request.shade.positions });

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            return Promise.reject(e);
        }
    }

    async shadeUpdate() {
        this.homey.app.log(`[Device] ${this.getName()} - init shadeUpdate`);

        this.homey.app.homeyEvents.on('shadesUpdate', async (shades) => {
            this.homey.app.log(`[Device] ${this.getName()} - shadeUpdate`);
            const deviceObject = await this.getData();
            const shadeData = shades.find(s => s.id === deviceObject.id);

            if(shadeData) {
                this.homey.app.log(`[Device] ${this.getName()} - shadeUpdate - correct`);
                
                this.setCapabilityValues(false, null, shadeData)
            }
        });
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

            // // ------------ Get values --------------
            const { position1 } = positions;

            await this.setValue('windowcoverings_set', position1 / maxValue);

            if (settings.dualmotor) {
                const { position2 } = positions;
                await this.setValue('windowcoverings_tilt_set', position2 / maxValue);
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
}

module.exports = mainDevice;
