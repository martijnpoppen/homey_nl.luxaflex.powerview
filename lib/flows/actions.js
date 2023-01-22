const { scenesAutoComplete, sceneCollectionAutocomplete } = require('../helpers');

exports.init = async function (homey) {
    const update_data = homey.flow.getActionCard('update_data');
    update_data.registerRunListener(async (args, state) => {
        await args.device.onCapability_UPDATE_DATA(true);
    });

    const sceneSet = homey.flow.getActionCard('nl.luxaflex.powerview.actions.sceneSet');
    sceneSet
        .registerRunListener(async (args, state) => {
            let sceneId = ((args || {})['nl.luxaflex.powerview.sceneAutocomplete'] || {}).id;
            await args.device.onCapability_sceneSet(sceneId);
        })
        .registerArgumentAutocompleteListener('nl.luxaflex.powerview.sceneAutocomplete', async (query, args) => scenesAutoComplete(query, args.device, homey.app.apiClient));

    const sceneCollectionSet = homey.flow.getActionCard('nl.luxaflex.powerview.actions.sceneCollectionSet');
    sceneCollectionSet
        .registerRunListener(async (args, state) => {
            let sceneCollectionId = ((args || {})['nl.luxaflex.powerview.sceneCollectionAutocomplete'] || {}).id;
            await args.device.onCapability_sceneCollectionSet(sceneCollectionId);
        })
        .registerArgumentAutocompleteListener('nl.luxaflex.powerview.sceneCollectionAutocomplete', async (query, args) => sceneCollectionAutocomplete(query, args.device, homey.app.apiClient));

    const tiltSet = homey.flow.getActionCard('windowcoverings_tilt_set');
    tiltSet.registerRunListener(async (args, state) => {
        let value = args.windowcoverings_tilt_set;
        await args.device.onCapability_WINDOWCOVERINGS_TILT_SET(value);
    });

    const setBoth = homey.flow.getActionCard('windowcoverings_set_both');
    setBoth.registerRunListener(async (args, state) => {
        let value1 = args.windowcoverings_set;
        let value2 = args.windowcoverings_tilt_set;
        await args.device.onCapability_WINDOWCOVERINGS_SET_BOTH(value1, value2);
    });
};
