'use strict';

const rootDevice = require('./root-device');
const { setShade, getShade } = require('../lib/api');
const { getDeviceByType } = require('../constants/device-types');
const { capitalize } = require('../lib/helpers');

const maxValue = 65535;

class mainDevice extends rootDevice {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Connecting to: ${this.getName()} ... (this might take longer when multiple shades are connected)`);

            await this.fixSettings();
            await this.checkCapabilities();
            await this.setCapabilityListeners();

            if (this.isV3) {
                await this.getTypes(true);
            }

            const hasHub = await this.checkForHub();

            this.homey.app.log(`[Device] ${this.getName()} - checkForHub - `, hasHub);

            if (hasHub) {
                this.onStartup();
            } else {
                this.setUnavailable(`Can't find a Powerview Hub. Is it connected to Homey? Make sure the IP address setting is the same.`);
            }
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async onAdded() {
        this.homey.app.setDevice(this);
    }

    onDeleted() {
        const deviceObject = this.getData();
        this.homey.app.removeDevice(deviceObject.id);
    }

    async sleepByIndex(sleepLength = 10000) {
         const driverData = this.homey.drivers.getDriver(`nl.luxaflex.powerview.shade${this.genType}`);
        const driverDevices = driverData.getDevices();
        const deviceObject = this.getData();

        const sleepIndex = driverDevices.findIndex((device) => {
            const driverDeviceObject = device.getData();
            return deviceObject.id === driverDeviceObject.id;
        });
     
         await sleep((sleepIndex + 1) * sleepLength);
    }

    async onStartup() {
        await this.sleepByIndex();

        this.homey.app.log('[Device] - init - after sleep =>', this.getName());

        await this.setCapabilityValues(true);

        await this.setAvailable();

        this.shadeUpdate();
    }

    async checkForHub() {
        const settings = this.getSettings();
        const driverData = this.homey.drivers.getDriver(`nl.luxaflex.powerview.hub${this.genType}`);
        const driverDevices = driverData.getDevices();

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

            const request = {
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
        try {
            this.homey.app.log(`[Device] ${this.getName()} - init shadeUpdate`);

            this.homey.app.homeyEvents.on(`shadesUpdate${this.genType}`, async (shades) => {
                this.homey.app.log(`[Device] ${this.getName()} - shadeUpdate`);
                const deviceObject = await this.getData();
                const shadeData = shades.find((s) => s.id === deviceObject.id);

                if (shadeData) {
                    this.homey.app.log(`[Device] ${this.getName()} - shadeUpdate - correct`);

                    await this.sleepByIndex(1000);
                    await this.setCapabilityValues(false, null, shadeData);
                }
            });
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - error shadeUpdate`, error);
        }
    }

    async setCapabilityValues(check = false, overrideSettings = null, overrideDeviceInfo = null) {
        this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues`, check, !!overrideSettings, !!overrideDeviceInfo);

        try {
            this.setAvailable();

            if (!check) this.homey.app.homeyEvents.emit('setCapabilityValues');

            const deviceObject = await this.getData();
            const settings = overrideSettings ? overrideSettings : this.getSettings();

            const deviceInfo = overrideDeviceInfo ? overrideDeviceInfo : await getShade(settings.ip, this.homey.app.apiClient, deviceObject.id, this.isV3);

            const { positions } = deviceInfo;
            const { batteryStatus } = deviceInfo;
            const batteryTypes = {
                4: 100,
                3: 100,
                2: 66,
                1: 23,
                0: 0
            };
            const { type, capabilities } = deviceInfo;

            this.homey.app.log(`[Device] ${this.getName()} - deviceInfo =>`, deviceInfo);
            this.homey.app.log(`[Device] ${this.getName()} - deviceInfo positions =>`, positions);

            // // Check for existence
            if (check) {
                await this.addOrRemoveCapability(settings.dualmotor, 'windowcoverings_tilt_set');
                await this.addOrRemoveCapability(settings.measure_battery, 'measure_battery');

                if (type) await this.setSettings({ type });
                if (capabilities) await this.setSettings({ capabilities });
            }

            // // ------------ Get values --------------
            if (!this.isV3) {
                if (positions && 'position1' in positions) {
                    const { position1 } = positions;

                    await this.setValue('windowcoverings_set', Math.round((position1 / maxValue) * 100) / 100);
                }

                if (settings.dualmotor && positions && 'position2' in positions) {
                    const { position2 } = positions;

                    await this.setValue('windowcoverings_tilt_set', Math.round((position2 / maxValue) * 100) / 100);
                }
            }

            if (this.isV3) {
                const types = await this.getTypes();

                if (positions && types[0] in positions) {
                    const pos = positions[types[0]];

                    this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues - Motor 1`, types[0], pos);

                    await this.setValue('windowcoverings_set', Math.round(pos * 100) / 100);
                }

                if (settings.dualmotor && positions && types[1] in positions) {
                    const pos = positions[types[1]];

                    this.homey.app.log(`[Device] ${this.getName()} - setCapabilityValues - Motor 2`, types[1], pos);

                    await this.setValue('windowcoverings_tilt_set', Math.round(pos * 100) / 100);
                }
            }

            await this.setValue('measure_battery', batteryTypes[batteryStatus]);
        } catch (error) {
            this.setUnavailable(error);
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

            if (triggerExists && oldVal !== value) {
                await this.homey.flow
                    .getDeviceTriggerCard(`${key}_changed`)
                    .trigger(this, { [`${key}`]: value })
                    .catch(this.error)
                    .then(this.homey.app.log(`[Device] ${this.getName()} - setValue ${key}_changed - Triggered: "${key}_changed | ${value}"`));
            }
        }
    }

    async getTypes(setSetting = false) {
        // V3 only
        let settings = await this.getSettings();
        const typeSettings = getDeviceByType(settings.type, settings.capabilities)
        const posTypes = ['automatic', 'primary', 'secondary', 'tilt'];
        const posKind1 = settings.posKind1;
        const posKind2 = settings.posKind2;

        if (setSetting) {
            this.homey.app.log(`[Device] ${this.getName()} - setting automatic types`, typeSettings.options.types);

            settings = {
                ...(!posTypes.some((p) => p === posKind1) && { posKind1: 'automatic' }),
                ...(!posTypes.some((p) => p === posKind2) && { posKind2: 'automatic' }),
                posKind1ByType: typeSettings.options.types[0] ? capitalize(typeSettings.options.types[0]) : 'None',
                posKind2ByType: typeSettings.options.types[1] ? capitalize(typeSettings.options.types[1]) : 'None'
            };

            this.setSettings(settings);
        }

        if (posKind1 !== 'automatic' && posKind1) {
            this.homey.app.log(`[Device] ${this.getName()} - getTypes - posKind1`, posKind1);
            typeSettings.options.types[0] = posKind1;
        }

        if (posKind2 !== 'automatic' && posKind2) {
            this.homey.app.log(`[Device] ${this.getName()} - getTypes - posKind2`, posKind2);
            typeSettings.options.types[1] = posKind2;
        }

        this.homey.app.log(`[Device] ${this.getName()} - getTypes - types array`, typeSettings.options.types);
        return typeSettings.options.types;
    }
}

module.exports = mainDevice;
