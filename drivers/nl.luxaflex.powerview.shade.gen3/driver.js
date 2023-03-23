const mainDriver = require('../main-driver');

module.exports = class PowerviewShadeDriver extends mainDriver {
    driverType() {
        return 'shade';
    }

    discovery() {
        return 'powerview-g3';
    }

    apiVersion() {
        return '3';
    }
};
