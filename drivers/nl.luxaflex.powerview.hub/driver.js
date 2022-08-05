const Homey = require('homey');

module.exports = class PowerviewDriver extends Homey.Driver {
    onInit() {
        this.homey.app.log('[Driver] - init', this.id);
        this.homey.app.log(`[Driver] - version`, Homey.manifest.version);
    }

    async onPair(session) {
        const discoveryStrategy = this.homey.discovery.getStrategy('powerview');
        const discoveryResults = discoveryStrategy.getDiscoveryResults();

        this.homey.app.log(`[Driver] ${this.id} - searching for Powerview`);

        session.setHandler('list_devices', async (data) => {
            console.log(data);
            try {
                const devices = Object.values(discoveryResults).map((discoveryResult) => {
                    console.log(discoveryResult);
                    return {
                        name: discoveryResult.name ? discoveryResult.name : 'Powerview',
                        data: {
                            id: data.id
                        },
                        settings: {
                            ip: `${discoveryResult.host.toLowerCase()}.local`,
                        }
                    };
                });

                this.homey.app.log(`[Driver] ${this.id} - Found devices - `, devices);

                return devices;
            } catch (error) {
                this.homey.app.log(error);
                return Promise.reject(error);
            }
        });
    }
};
