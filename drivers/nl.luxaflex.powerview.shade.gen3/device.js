const mainDevice = require('../main-device');
const { getDeviceByType } = require('../constants/device-types');

class PowerviewShadeGen3 extends mainDevice {
    async onCapability_WINDOWCOVERINGS_SET(value) {
        try {
            const deviceObject = await this.getData();
            const settings = await this.getSettings();
            const ip = settings.ip || settings['nl.luxaflex.powerview.settings.ip'];
            const typeSettings = getDeviceByType(deviceObject.type);

            const pos2 = this.getCapabilityValue('windowcoverings_tilt_set');

            const setValue1 = settings.invertPosition1 ? 1 - value : value;
            const setValue2 = settings.invertPosition2 ? 1 - pos2 : pos2;


            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET`, value);
            const request = {
                positions: {
                    [typeSettings.types[0]]: parseFloat(setValue1),
                    ...(settings.dualmotor && settings.updatePosition2 && { [typeSettings.types[1]]: parseFloat(setValue2) })
                }
            };

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET request: `, request);

            const shadeResponse = await setShade(ip, this.homey.app.apiClient, request, deviceObject.id, true);

            this.homey.app.log(`[Device] ${this.getName()} - onCapability_WINDOWCOVERINGS_SET shadeResponse: `, shadeResponse);

            if (settings.updatePosition2) {
                this.setCapabilityValues(false, null, { ...shadeResponse, positions: request.positions });
            } else {
                this.setCapabilityValues(false, null, {
                    ...shadeResponse,
                    positions: {
                        ...request.positions,
                        [typeSettings.types[1]]: settings.invertPosition2 ? 1 - 0 : 0
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
                        [typeSettings.types[0]]: parseFloat((maxValue * setValue1)),
                        [typeSettings.types[1]]: parseFloat((maxValue * setValue2))
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
                        [typeSettings.types[0]]: parseFloat((maxValue * setValue1)),
                        [typeSettings.types[1]]: parseFloat((maxValue * setValue2))
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
}

module.exports = PowerviewShadeGen3;
