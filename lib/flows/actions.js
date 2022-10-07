const { scenesAutoComplete, sceneCollectionAutocomplete } = require('../helpers');

exports.init = async function (homey) {
    const sceneSet = homey.flow.getActionCard('nl.luxaflex.powerview.actions.sceneSet');
    sceneSet
        .registerRunListener(async (args, state) => {
            let sceneId = ((args || {})['nl.luxaflex.powerview.sceneAutocomplete'] || {}).id;
            await args.device.onCapability_sceneSet(sceneId);
        })
        .registerArgumentAutocompleteListener('nl.luxaflex.powerview.sceneAutocomplete', async (query, args) => scenesAutoComplete(query, args.device));

    const sceneCollectionSet = homey.flow.getActionCard('nl.luxaflex.powerview.actions.sceneCollectionSet');
    sceneCollectionSet
        .registerRunListener(async (args, state) => {
            let sceneCollectionId = ((args || {})['nl.luxaflex.powerview.sceneCollectionAutocomplete'] || {}).id;
            await args.device.onCapability_sceneCollectionSet(sceneCollectionId);
        })
        .registerArgumentAutocompleteListener('nl.luxaflex.powerview.sceneCollectionAutocomplete', async (query, args) => sceneCollectionAutocomplete(query, args.device));

    const tiltSet = homey.flow.getActionCard('windowcoverings_tilt_set');
    tiltSet.registerRunListener(async (args, state) => {
        let value = args.windowcoverings_tilt_set;
        await args.device.onCapability_WINDOWCOVERINGS_TILT_SET(value);
    });
};