const Homey = require('homey');
const { getShades, findPrimaryGateway } = require('../lib/api');
const { getDeviceByType } = require('../constants/device-types');

module.exports = class mainDriver extends Homey.Driver {
    onInit() {
        this.homey.app.log('[Driver] - init', this.id);
        this.homey.app.log(`[Driver] - version`, Homey.manifest.version);

        this.devices = [];
        this.results = [];

        this.homey.app.setDevices(this.getDevices());

        const discoveryStrategy = this.homey.discovery.getStrategy(this.discovery());
        const discoveryResults = discoveryStrategy.getDiscoveryResults();
        const discoveryResultsArray = Object.values(discoveryResults);

        const currentDevices = this.getDevices();
        if (currentDevices.length === 1 && discoveryResultsArray.length) {
            this.syncSingleDeviceIp(currentDevices[0], discoveryResultsArray);
        }
    }

    async syncSingleDeviceIp(device, discoveryResultsArray) {
        try {
            let address = null;

            if (this.apiVersion() === '3') {
                // Multiple gateways can be discovered, only the primary one serves the /home/* API
                const addresses = discoveryResultsArray.map((r) => r.address).filter(Boolean);
                const { primary } = await findPrimaryGateway(addresses, this.homey.app.apiClient);

                if (!primary) {
                    this.homey.app.log(`[Driver] ${this.id} - syncSingleDeviceIp - no primary gateway found`, addresses);
                    return;
                }

                address = primary.address;
            } else if (discoveryResultsArray.length === 1) {
                address = (discoveryResultsArray[0] || {}).address;
            } else {
                return;
            }

            const deviceIp = device.getSettings().ip;

            this.homey.app.log(`[Driver] ${this.id} - syncSingleDeviceIp`, { device: device.getName(), address, deviceIp });

            if (address && address !== deviceIp) {
                this.homey.app.log(`[Driver] ${this.id} - ${device.getName()} - setSettings`, { ip: address });
                device.setSettings({
                    ip: address
                });
            }
        } catch (error) {
            this.homey.app.error(`[Driver] ${this.id} - syncSingleDeviceIp error`, error);
        }
    }

    driverType() {
        return 'other';
    }

    discovery() {
        return 'other';
    }

    apiVersion() {
        return '2';
    }

    GetGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0,
                v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    async onPair(session) {
        const discoveryStrategy = this.homey.discovery.getStrategy(this.discovery());
        const discoveryResults = discoveryStrategy.getDiscoveryResults();

        this.homey.app.log(`[Driver] ${this.id} - searching for Powerview`);

        session.setHandler('showView', async (view) => {
            this.homey.app.log(`[Driver] ${this.id} - currentView:`, { view });

            if (view === 'loading') {
                console.log(Object.values(discoveryResults));
                if (Object.values(discoveryResults).length) {
                    this.results = Object.values(discoveryResults);

                    session.showView('get_data');
                } else {
                    session.showView('set_ip');
                }
            }

            if (view === 'get_data') {
                this.deviceArray = await this.getDeviceArray();
                this.devices = this.findDevices(this, this.deviceArray) || [];

                session.showView('list_devices');
            }
        });

        session.setHandler('set_ip', async (data) => {
            this.homey.app.log(`[Driver] ${this.id} - set_ip`, data);
            this.results = [{ address: data.ip }];

            session.showView('get_data');
            return true;
        });

        session.setHandler('list_devices', async () => {
            try {
                this.homey.app.log(`[Driver] ${this.id} - Found devices - `, this.devices);

                return this.devices;
            } catch (error) {
                this.homey.app.log(error);
                return Promise.reject(error);
            }
        });
    }

    async getDeviceArray() {
        const isV3 = this.apiVersion() === '3';
        const targets = isV3 ? await this.resolveGen3Targets(this.results) : this.results;

        if (this.driverType() !== 'shade') {
            return targets;
        }

        const shades = [];
        const shadeIds = new Set();

        for (const target of targets) {
            const ip = target.address;

            try {
                const result = await getShades(ip, this.homey.app.apiClient, isV3);

                this.homey.app.log(`[Driver] ${this.id} - Found shades on ${ip} - `, result);

                result.forEach((shade) => {
                    if (shadeIds.has(shade.id)) {
                        return;
                    }

                    shadeIds.add(shade.id);
                    shades.push(shade);
                });
            } catch (error) {
                // never let a single unreachable/secondary gateway reject the whole pairing session
                this.homey.app.log(`[Driver] ${this.id} - Unable to get shades from ${ip} - `, error.message);
            }
        }

        return shades;
    }

    // A Gen 3 home can run multiple gateways, but only the primary one answers /home/*.
    // Secondary gateways reply with 'Multi-Gateway environment - this is not the primary gateway',
    // so everything - shades and the gateway device itself - has to be aimed at the primary.
    async resolveGen3Targets(results) {
        const addresses = results.map((r) => r.address).filter(Boolean);

        if (!addresses.length) {
            return results;
        }

        const { details, primary } = await findPrimaryGateway(addresses, this.homey.app.apiClient);

        this.homey.app.log(`[Driver] ${this.id} - discovered gateways - `, details);

        if (!primary) {
            this.homey.app.log(`[Driver] ${this.id} - no primary gateway found, falling back to all discovery results`);
            return results;
        }

        this.homey.app.log(`[Driver] ${this.id} - primary gateway - `, primary.address);

        const discovered = results.find((r) => r.address === primary.address) || {};

        return [
            {
                ...discovered,
                address: primary.address,
                name: primary.name || discovered.name,
                serialNumber: primary.serialNumber
            }
        ];
    }

    findDevices(ctx, deviceArray) {
        try {
            const devices = [];

            ctx.homey.app.log(`[Driver] ${ctx.id} - findDevices `, deviceArray);

            for (const device of deviceArray) {
                const ip = device.address;
                const isV3 = this.apiVersion() === '3';

                if (ctx.driverType() === 'shade') {
                    const typeSettings = getDeviceByType(device.type, device.capabilities);
                    const { positions } = device;

                    if (isV3) {
                        devices.push({
                            name: device.shadeName,
                            data: {
                                id: device.id
                            },
                            settings: {
                                ip: ip,
                                apiVersion: this.apiVersion(),
                                type: device.type,
                                ...(positions && positions.primary && { posKind1: positions.primary.toFixed(2) }),
                                ...(positions && 'secondary' in positions && positions.secondary && { posKind2: positions.secondary.toFixed(2) }),
                                ...typeSettings.options
                            }
                        });
                    } else {
                        devices.push({
                            name: device.shadeName,
                            data: {
                                id: device.id
                            },
                            settings: {
                                ip: ip,
                                apiVersion: this.apiVersion(),
                                type: device.type,
                                ...(positions && positions.posKind1 && { posKind1: positions.posKind1.toFixed() }),
                                ...(positions && 'posKind2' in positions && positions.posKind2 && { posKind2: positions.posKind2.toFixed() }),
                                ...typeSettings.options
                            }
                        });
                    }
                } else {
                    devices.push({
                        name: device.name || ctx.driverType(),
                        data: {
                            // the gateway serial keeps an already paired gateway out of the results
                            id: device.serialNumber || ctx.GetGUID()
                        },
                        settings: {
                            ip: ip,
                            apiVersion: this.apiVersion()
                        }
                    });
                }
            }

            console.log('devices', devices);

            return devices;
        } catch (error) {
            console.log(error);
        }
    }
};
