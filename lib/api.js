getApiUri = function (isV3 = false) {
    return isV3 ? 'home' : 'api';
};

getShades = function (ip, apiClient, isV3 = false) {
    let url = `http://${ip}/${getApiUri(isV3)}/shades?refresh=true`;

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if(isV3) {
                data.forEach((shade) => {
                    results.push({
                        shadeName: shade.ptName,
                        address: ip,
                        ...shade
                    });
                });
            } else if (data.shadeData) {
                data.shadeData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });
                data.shadeData.forEach((shade) => {
                    let shadeName = Buffer.from(shade.name, 'base64').toString('utf8');

                    results.push({
                        shadeName,
                        address: ip,
                        ...shade
                    });
                });
            }

            return results;
        })
        .catch((e) => {
            const error = apiError('Unable to retreive shades', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

getShade = function (ip, apiClient, id, isV3 = false, updateBattery = false, ) {
    let url = `http://${ip}/${getApiUri(isV3)}/shades/${id}?refresh=true`;

    if (updateBattery) {
        url = `http://${ip}/${getApiUri(isV3)}/shades/${id}?updateBatteryLevel=true`;
    }

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            
            if(isV3) {
                return data;
            }

            return data.shade;
        })
        .catch((e) => {
            const error = apiError('Unable to retreive shade', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

getRooms = function (ip, apiClient, isV3 = false) {
    const url = `http://${ip}/${getApiUri(isV3)}/rooms`;

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (isV3) {
                data.forEach((room) => {
                    results.push({
                        roomName: room.ptName,
                        roomId: room.id
                    });
                });
            } else if (data.roomData) {
                data.roomData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });
                data.roomData.forEach((room) => {
                    let roomName = Buffer.from(room.name, 'base64').toString('utf8');

                    results.push({
                        roomName: roomName,
                        roomId: room.id
                    });
                });
            }

            return results;
        })
        .catch((e) => {
            const error = apiError('Unable to retreive rooms', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

getScenes = function (ip, apiClient, isV3 = false, id = null) {
    let url = `http://${ip}/${getApiUri(isV3)}/scenes`;
    let action = 'get';

    if (id && !isV3) {
        url = `${url}?sceneId=${id}`;
    } else if (id && isV3) {
        url = `${url}/${id}/activate`;
        action = 'put';
    }

    return apiClient[action](url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (isV3 && action === 'get') {
                data.forEach((scene) => {
                    const roomId = scene.roomIds && scene.roomIds.length ? scene.roomIds[0] : 0;

                    results.push({
                        sceneId: scene.id,
                        sceneName: scene.ptName,
                        roomId: roomId
                    });
                });
            } else {
                if (data.sceneData) {
                    data.sceneData.sort((a, b) => {
                        return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                    });

                    data.sceneData.forEach((scene) => {
                        const sceneName = Buffer.from(scene.name, 'base64').toString('utf8');
                        const roomId = scene.roomIds && scene.roomIds.length ? scene.roomIds[0] : scene.roomId;

                        results.push({
                            sceneId: scene.id,
                            sceneName: sceneName,
                            roomId: roomId
                        });
                    });
                } else if (data.shadeIds) {
                    return true;
                }
            }

            return results;
        })
        .catch((e) => {
            const error = apiError('Unable to retreive scenes', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

getSceneCollection = function (ip, apiClient, isV3 = false, id = null) {
    let url = `http://${ip}/${getApiUri(isV3)}/scenecollections`;

    if (id) {
        url = `${url}?sceneCollectionId=${id}`;
    }

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.sceneCollectionData) {
                data.sceneCollectionData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });

                data.sceneCollectionData.forEach((sceneCollection) => {
                    let sceneCollectionName = Buffer.from(sceneCollection.name, 'base64').toString('utf8');

                    results.push({
                        sceneId: sceneCollection.id,
                        sceneName: sceneCollectionName
                    });
                });
            }

            return results;
        })
        .catch((e) => {
            const error = apiError('Unable to retreive sceneCollection', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

setShade = function (ip, apiClient, data, id, isV3 = false) {
    let url = `http://${ip}/${getApiUri(isV3)}/shades/${id}?`;

    if(isV3) {
        url = `http://${ip}/${getApiUri(isV3)}/shades/positions?ids=${id}`;
    }

    return apiClient
        .put(url, data)
        .then((response) => {
            const data = response.data;

            if(isV3) {
                return data;
            }

            return data.shade;
        })
        .catch((e) => {
            const error = apiError('Unable to set shade', e);
            console.log(`${error.message} (${ip})`);
            throw error;
        });
};

// ---------------------------------------------------------------------------
// Gen 3 gateway helpers
//
// A Gen 3 home can contain multiple gateways. Only the primary gateway serves
// the /home/* API, every secondary answers those calls with:
//   { errMsg: 'Multi-Gateway environment - this is not the primary gateway' }
//
// The /gateway endpoints are served by primary and secondary gateways alike,
// which is what makes it possible to tell them apart:
//   GET /gateway      -> { config: { serialNumber, networkStatus: {...},
//                                    mgwStatus: { running }, mgwConfig: { primary } } }
//   GET /gateway/info -> { serialNumber, fwVersion }
//   GET /home         -> { gateways: [{ name, serial, mac }], shades, rooms, scenes }
// ---------------------------------------------------------------------------

const MULTI_GATEWAY_SECONDARY_ERRMSG = 'not the primary gateway';

getResponseErrMsg = function (e) {
    return (e && e.response && e.response.data && e.response.data.errMsg) || null;
};

isMultiGatewaySecondaryError = function (e) {
    const errMsg = getResponseErrMsg(e);

    return !!errMsg && errMsg.toLowerCase().includes(MULTI_GATEWAY_SECONDARY_ERRMSG);
};

apiError = function (message, e) {
    const errMsg = getResponseErrMsg(e);
    const error = new Error(errMsg ? `${message} - ${errMsg}` : `${message} - ${(e && e.message) || 'unknown error'}`);

    error.response = e && e.response;
    error.isMultiGatewaySecondary = isMultiGatewaySecondaryError(e);

    return error;
};

getGatewayConfig = function (ip, apiClient) {
    return apiClient.get(`http://${ip}/gateway`).then((response) => (response.data && response.data.config) || null);
};

getGatewayInfo = function (ip, apiClient) {
    return apiClient.get(`http://${ip}/gateway/info`).then((response) => response.data || null);
};

getGateways = function (ip, apiClient) {
    return apiClient
        .get(`http://${ip}/home`)
        .then((response) => (response.data && response.data.gateways) || [])
        .catch(() => []);
};

getGatewayDetails = async function (ip, apiClient) {
    const details = {
        address: ip,
        reachable: false,
        multiGateway: false,
        primary: false,
        serialNumber: null,
        macAddress: null,
        name: null
    };

    try {
        const config = await getGatewayConfig(ip, apiClient);

        if (!config) {
            return details;
        }

        const multiGateway = !!(config.mgwStatus && config.mgwStatus.running);

        return {
            ...details,
            reachable: true,
            multiGateway,
            // a home without multi-gateway running has no mgwConfig, that single gateway is always the primary
            primary: !multiGateway || !!(config.mgwConfig && config.mgwConfig.primary),
            serialNumber: config.serialNumber || null,
            macAddress: (config.networkStatus && config.networkStatus.primaryMacAddress) || null,
            name: config.hubName || null
        };
    } catch (e) {
        console.log(`Unable to read gateway config of ${ip}:`, getResponseErrMsg(e) || e.message);

        return details;
    }
};

findPrimaryGateway = async function (addresses, apiClient) {
    const unique = [...new Set((addresses || []).filter(Boolean))];
    const details = await Promise.all(unique.map((ip) => getGatewayDetails(ip, apiClient)));
    const primary = details.find((d) => d.reachable && d.primary) || null;

    if (primary && !primary.name) {
        const gateways = await getGateways(primary.address, apiClient);
        const match = gateways.find((g) => (primary.serialNumber && g.serial === primary.serialNumber) || (primary.macAddress && g.mac === primary.macAddress));

        if (match && match.name) {
            primary.name = match.name;
        }
    }

    return { details, primary };
};

module.exports = {
    getShades,
    getShade,
    getRooms,
    getScenes,
    getSceneCollection,
    setShade,
    getGatewayConfig,
    getGatewayInfo,
    getGateways,
    getGatewayDetails,
    findPrimaryGateway,
    isMultiGatewaySecondaryError
};
