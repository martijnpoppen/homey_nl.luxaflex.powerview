'use strict';

const rootDevice = require('./root-device');
const { getShades, getScenes, getSceneCollection } = require('../lib/api');
const { sleep } = require('../lib/helpers');

class mainHub extends rootDevice {
    async onInit() {
        try {
            this.homey.app.log('[Device] - init =>', this.getName());
            this.setUnavailable(`Connecting to: ${this.getName()} ...`);

            await this.fixSettings();

            await this.checkCapabilities();

            await this.registerCapabilityListener('update_data', this.onCapability_UPDATE_DATA.bind(this));
            await this.setAvailable();

            await this.setShadeInterval();
        } catch (error) {
            this.homey.app.error(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async onAdded() {
        this.homey.app.setDevice(this);
    }

    onDeleted() {
        this.clearIntervals();

        const deviceObject = this.getData();
        this.homey.app.removeDevice(deviceObject.id);
    }

    // ------------- Settings -------------
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        try {
            this.homey.app.log(`[Device] ${this.getName()} - oldSettings`, { ...oldSettings });
            this.homey.app.log(`[Device] ${this.getName()} - newSettings`, { ...newSettings });

            if (changedKeys.length && changedKeys.includes('update_interval')) {
                this.setIntervalsAndFlows(false, newSettings.update_interval);
            }

            if (changedKeys.length && (changedKeys.includes('update_shade_ips') || changedKeys.includes('ip'))) {
                this.homey.app.log(`[Device] ${this.getName()} - onSettings => Update Shade IPs`);

                this.setAvailable();

                const shades = await getShades(newSettings.ip, this.homey.app.apiClient, this.isV3);

                if (shades) {
                    this.updateShadeIps(shades, newSettings);
                }
            }
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - onSettings error`, error);
        }
    }

    async updateShadeIps(shades, settings) {
        try {
            this.homey.app.log(`[Device] ${this.getName()} - updateShadeIps`);

            for (const shade of shades) {
                const homeyShade = this.homey.app.deviceList.find((d) => {
                    const deviceObject = d.getData();
                    if (deviceObject.id === shade.id) {
                        return true;
                    }
                });

                if (homeyShade) {
                    this.homey.app.log(`[Device] ${this.getName()} - updateShadeIps => setSetings`, homeyShade.getName());
                    homeyShade.setSettings({ ip: settings.ip });

                    await sleep(2000);

                    homeyShade.onStartup();
                }
            }

            await sleep(5000);

            this.setSettings({ update_shade_ips: false });
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - updateShadeIps error`, error);
        }
    }

    //-------------- PowerView ----------------

    async updateData() {
        try {
            const settings = this.getSettings();

            const driverData = this.homey.drivers.getDriver(`nl.luxaflex.powerview.shade${this.genType}`);
            const driverDevices = driverData.getDevices();

            if (driverDevices.length) {
                const shades = await getShades(settings.ip, this.homey.app.apiClient, this.isV3);

                this.homey.app.log(`[Device] ${this.getName()} - updateData =>`, shades);

                this.homey.app.homeyEvents.emit(`shadesUpdate${this.genType}`, shades);
            } else {
                this.homey.app.log(`[Device] ${this.getName()} - updateData => no shades found on this Homey`);
            }
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - updateData error =>`, error);
            // this.setUnavailable(error);
        }
    }

    // ------------- Intervals -------------
    async setShadeInterval() {
        const settings = this.getSettings();

        this.homey.app.homeyEvents.on('setCapabilityValues', async () => {
            this.clearIntervals();
            await sleep(5000);
            await this.setIntervalsAndFlows(true, settings.update_interval);
        });
    }

    async setIntervalsAndFlows(override = false, time = 2) {
        try {
            this.homey.app.log(`[Device] ${this.getName()} - setIntervalsAndFlows override | time - `, override, time);

            if ((override || this.getAvailable()) && time > 0) {
                await this.setCapabilityValuesInterval(time);
            } else {
                this.homey.app.log(`[Device] ${this.getName()} - setIntervalsAndFlows not set - `, time);
            }
        } catch (error) {
            this.homey.app.log(`[Device] ${this.getName()} - OnInit Error`, error);
        }
    }

    async setCapabilityValuesInterval(update_interval) {
        try {
            const REFRESH_INTERVAL = 1000 * (update_interval * 60);

            this.homey.app.log(`[Device] ${this.getName()} - onPollInterval =>`, REFRESH_INTERVAL, update_interval);

            await this.clearIntervals();

            this.onPollInterval = this.homey.setInterval(this.updateData.bind(this), REFRESH_INTERVAL);
        } catch (error) {
            this.setUnavailable(error);
            this.homey.app.log(error);
        }
    }

    async clearIntervals() {
        this.homey.app.log(`[Device] ${this.getName()} - clearIntervals`);

        if (this.onPollInterval) {
            await this.homey.clearInterval(this.onPollInterval);
        }
    }

    async onCapability_UPDATE_DATA(value) {
        try {
            this.homey.app.log(`[Device] ${this.getName()} - onCapability_UPDATE_DATA`, value);

            this.setCapabilityValue('update_data', false);

            await this.updateData();

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

            const sceneResponse = await getScenes(ip, this.homey.app.apiClient, this.isV3, value);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneSet sceneResponse: `, sceneResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            this.setUnavailable(error);
            return Promise.reject(e);
        }
    }

    async onCapability_sceneCollectionSet(value) {
        try {
            const settings = await this.getSettings();
            const ip = settings.ip || settings['nl.luxaflex.powerview.settings.ip'];

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneCollectionSet`, value);

            const sceneResponse = await getSceneCollection(ip, this.homey.app.apiClient, this.isV3, value);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_sceneCollectionSet sceneResponse: `, sceneResponse);

            return Promise.resolve(true);
        } catch (e) {
            this.homey.app.error(e);
            this.setUnavailable(error);
            return Promise.reject(e);
        }
    }
}

module.exports = mainHub;
