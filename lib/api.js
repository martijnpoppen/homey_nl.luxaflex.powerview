
getShades = function (ip, apiClient) {
    const url = `http://${ip}/api/shades?refresh=true`;

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.shadeData) {
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
            throw new Error('Unable to retreive shades');
        });
};

getShade = function (ip, apiClient, id, updateBattery = false) {
    let url = `http://${ip}/api/shades/${id}?refresh=true`;

    if(updateBattery) {
        url = `http://${ip}/api/shades/${id}?updateBatteryLevel=true`;
    }

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            return data.shade
        })
        .catch((e) => {
            console.log('Unable to retreive shade:', e);
            throw new Error('Unable to retreive shade');
        });
};

getRooms = function (ip, apiClient) {
    const url = `http://${ip}/api/rooms`;

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.roomData) {
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
            throw new Error('Unable to retreive rooms');
        });
};

getScenes = function (ip, apiClient, id = null) {
    let url = `http://${ip}/api/scenes`;

    if(id) {
        url = `${url}?sceneId=${id}`
    }

    return apiClient
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.sceneData) {
                data.sceneData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });

                data.sceneData.forEach((scene) => {
                    let sceneName = Buffer.from(scene.name, 'base64').toString('utf8');

                    results.push({
                        sceneId: scene.id,
                        sceneName: sceneName,
                        roomId: scene.roomId
                    });
                });
            } else if (data.shadeIds) {
                return true;
            }

            return results;
        })
        .catch((e) => {
            console.log('Unable to retreive scenes:', e);
            throw new Error('Unable to retreive scenes');
        });
};

getSceneCollection = function (ip, apiClient, id) {
    let url = `http://${ip}/api/scenecollections`;

    if(id) {
        url = `${url}?sceneCollectionId=${id}`
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
            throw new Error('Unable to retreive sceneCollection');
        });
};

setShade = function (ip, apiClient, data, id) {
    const url = `http://${ip}/api/shades/${id}?`;

    return apiClient
        .put(url, data)
        .then((response) => {
            const data = response.data;
            return data.shade
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
