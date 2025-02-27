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
            console.log('Unable to retreive shades:', e);
            throw new Error('Unable to retreive shades', e);
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
            console.log('Unable to retreive shade:', e);
            throw new Error('Unable to retreive shade');
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
            console.log('Unable to retreive rooms:', e);
            throw new Error('Unable to retreive rooms', e);
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
            console.log('Unable to retreive scenes:', e);
            throw new Error('Unable to retreive scenes', e);
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
            console.log('Unable to retreive sceneCollection:', e);
            throw new Error('Unable to retreive sceneCollection', e);
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
            console.log('Unable to set shade:', e);
            throw new Error('Unable to set shade');
        });
};

module.exports = {
    getShades,
    getShade,
    getRooms,
    getScenes,
    getSceneCollection,
    setShade
};
