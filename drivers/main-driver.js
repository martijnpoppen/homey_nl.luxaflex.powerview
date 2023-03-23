const Homey = require('homey');
const { getShades } = require('../lib/api');
const { sleep } = require('../lib/helpers');
const { getDeviceByType } = require('../constants/device-types');

module.exports = class mainDriver extends Homey.Driver {
    onInit() {
        this.homey.app.log('[Driver] - init', this.id);
        this.homey.app.log(`[Driver] - version`, Homey.manifest.version);

        this.devices = [];
        this.results = [];
    }

    driverType() {
        return 'other';
    }

    discovery() {
        return 'other'
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
                console.log(Object.values(discoveryResults))
                if (Object.values(discoveryResults).length) {
                    this.results = Object.values(discoveryResults);

                    session.showView('get_data');
                } else {
                    session.showView('set_ip');
                }
            }

            if (view === 'get_data') {
                this.deviceArray = await this.getDeviceArray();
                this.devices = await this.waitForResults(this);

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

    getDeviceArray() {
        if (this.driverType() === 'shade') {
            const shades = [];

            this.results.forEach((r) => {
                const ip = r.address;
                const isV3 = this.apiVersion() === '3'

                getShades(ip, this.homey.app.apiClient, isV3).then((result) => {
                    shades.push(...result);
                    this.homey.app.log(`[Driver] ${this.id} - Found shades - `, result);
                });
            });

            return shades;
        } else {
            return this.results;
        }
    }

    findDevices(ctx, deviceArray) {
        try {
            const devices = [];

            ctx.homey.app.log(`[Driver] ${ctx.id} - findDevices `, deviceArray);

            for (const device of deviceArray) {
                const ip = device.address;
                const isV3 = this.apiVersion() === '3';

                if (ctx.driverType() === 'shade') {
                    const typeSettings = getDeviceByType(device.type);
                    const { positions } = device;

                    if(isV3) {
                        devices.push({
                            name: device.shadeName,
                            data: {
                                id: device.id,
                            },
                            settings: {
                                ip: ip,
                                apiVersion: this.apiVersion(),
                                type: device.type,
                                posKind1: positions.primary.toFixed(2),
                                ...('secondary' in positions && {posKind2: positions.secondary.toFixed(2)}),
                                ...typeSettings.options
                            }
                        });
                    } else {
                        devices.push({
                            name: device.shadeName,
                            data: {
                                id: device.id,
                            },
                            settings: {
                                ip: ip,
                                apiVersion: this.apiVersion(),
                                type: device.type,
                                ...(positions.posKind1 && {posKind1: positions.posKind1.toFixed()}),
                                ...('posKind2' in positions && {posKind2: positions.posKind2.toFixed()}),
                                ...typeSettings.options
                            }
                        });
                    }
                } else {
                    devices.push({
                        name: device.name || ctx.driverType(),
                        data: {
                            id: ctx.GetGUID()
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

    async waitForResults(ctx, retry = 10) {
        for (let i = 1; i <= retry; i++) {
            ctx.homey.app.log(`[Driver] ${ctx.id} - findDevices - try: ${i}`);
            await sleep(1000);

            if (ctx.deviceArray.length && i > 5) {
                const devices = ctx.findDevices(ctx, ctx.deviceArray);
                return Promise.resolve(devices);
            } else if (i === 10) {
                return Promise.resolve([]);
            }
        }

        return Promise.resolve([]);
    }
};
