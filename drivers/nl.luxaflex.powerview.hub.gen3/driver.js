const mainDriver = require('../main-driver');

module.exports = class PowerviewHubG3Driver extends mainDriver {
    driverType() {
        return 'Powerview Hub';
    }

    discovery() {
        return 'powerview-g3';
    }

    apiVersion() {
        return '3';
    }
};
