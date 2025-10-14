const options = [
    {
        //0
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: false,
        types: ['primary']
    },
    {
        //1
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'tilt']
    },
    {
        //2
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'tilt']
    },
    {
        //3
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: false,
        types: ['primary']
    },
    {
        //4
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'tilt']
    },
    {
        //5
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: false,
        types: ['tilt']
    },
    {
        //6
        invertPosition1: true,
        invertPosition2: false,
        dualmotor: false,
        types: ['primary']
    },
    {
        //7
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'secondary']
    },
    {
        //8
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'secondary']
    },
    {
        //9
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'tilt']
    },
    {
        //10
        invertPosition1: false,
        invertPosition2: false,
        dualmotor: true,
        types: ['primary', 'tilt']
    }
];

const deviceType = [
    { type: 1, options: options[0] },
    { type: 4, options: options[0] },
    { type: 5, options: options[0] },
    { type: 6, options: options[0] },
    { type: 7, options: options[6] },
    { type: 8, options: options[7] },
    { type: 9, options: options[7] },
    { type: 10, options: options[0] },
    { type: 18, options: options[1] },
    { type: 23, options: options[1] },
    { type: 26, options: options[3] },
    { type: 27, options: options[3] },
    { type: 28, options: options[3] },
    { type: 31, options: options[0] },
    { type: 33, options: options[7] },
    { type: 38, options: options[9] },
    { type: 39, options: options[4] },
    { type: 42, options: options[0] },
    { type: 43, options: options[1] },
    { type: 44, options: options[0] },
    { type: 47, options: options[7] },
    { type: 49, options: options[0] },
    { type: 51, options: options[2] },
    { type: 54, options: options[4] },
    { type: 55, options: options[4] },
    { type: 56, options: options[4] },
    { type: 62, options: options[2] },
    { type: 65, options: options[8] },
    { type: 66, options: options[5] },
    { type: 69, options: options[3] },
    { type: 70, options: options[3] },
    { type: 71, options: options[3] },
    { type: 79, options: options[8] },
    { type: 100, options: options[1] },
];

getDeviceByType = function(type, capabilities = 7) {
    console.log('getDeviceByType', type, capabilities);
    return deviceType.find(t => t.type === type) || deviceType[capabilities];
}

module.exports = {
    getDeviceByType
};