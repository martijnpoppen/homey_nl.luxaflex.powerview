const mainDriver = require('../main-driver');

module.exports = class PowerviewHubDriver extends mainDriver {
    driverType() {
        return 'Powerview Hub';
    }
};
