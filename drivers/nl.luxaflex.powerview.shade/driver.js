const mainDriver = require('../main-driver');

module.exports = class PowerviewShadeDriver extends mainDriver {
    driverType() {
        return 'shade';
    }
};
