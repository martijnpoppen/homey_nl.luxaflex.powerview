const Homey = require('homey');
const { getShades } = require('../lib/api');


module.exports = class mainDriver extends Homey.Driver {
    onInit() {
        this.homey.app.log('[Driver] - init', this.id);
        this.homey.app.log(`[Driver] - version`, Homey.manifest.version);
    }

    driverType() {
        return 'other';
    }

    GetGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    async onPair(session) {
        const discoveryStrategy = this.homey.discovery.getStrategy('powerview');
        const discoveryResults = discoveryStrategy.getDiscoveryResults();

        this.homey.app.log(`[Driver] ${this.id} - searching for Powerview`);

        session.setHandler('list_devices', async () => {
            try {
                const devices = []; 
                
                for (const discoveryResult of Object.values(discoveryResults)) {
                    this.homey.app.log(`[Driver] ${this.id} - discoveryResult `, discoveryResult);

                    const ip = discoveryResult.address;                   

                    if(this.driverType() === 'shade') {
                        const shades = await getShades(ip, this.homey.app.apiClient);
                        this.homey.app.log(`[Driver] ${this.id} - Found shades - `, shades);
    
                        for (const shade of shades) {
                            devices.push({
                                name: shade.shadeName,
                                data: {
                                    id: shade.id
                                },
                                settings: {
                                    'ip': ip,
                                    type: shade.type,
                                    dualmotor: !!(shade.positions && shade.positions.posKind2)
                                }
                            })
                        }
                    } else {
                        this.homey.app.log(`[Driver] ${this.id} - Found hub - `, ip);

                        devices.push({
                            name: discoveryResult.name,
                            data: {
                                id: this.GetGUID()
                            },
                            settings: {
                                'ip': ip
                            }
                        })
                    }
                }

                this.homey.app.log(`[Driver] ${this.id} - Found devices - `, devices);

                return devices;
            } catch (error) {
                this.homey.app.log(error);
                return Promise.reject(error);
            }
        });
    }
};
