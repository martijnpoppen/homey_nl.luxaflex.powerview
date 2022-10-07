const axios = require('axios');
const axiosThrottle = require('axios-request-throttle');

axiosThrottle.use(axios, { requestsPerSecond: 3 });

getShades = function (ip) {
    const url = `http://${ip}/api/shades`;

    return axios
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.shadeData) {
                data.shadeData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });
                data.shadeData.forEach((shade) => {
                    let shadeName = new Buffer(shade.name, 'base64').toString('utf8');

                    results.push({
                        shadeName,
                        ...shade
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

getShade = function (ip, id) {
    const url = `http://${ip}/api/shades/${id}?refresh=true`;

    return axios
        .get(url)
        .then((response) => {
            const data = response.data;
            return data.shade
        })
        .catch((e) => {
            console.log('Unable to retreive rooms:', e);
            throw new Error('Unable to retreive rooms');
        });
};

getRooms = function (ip) {
    const url = `http://${ip}/api/rooms`;

    return axios
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.roomData) {
                data.roomData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });
                data.roomData.forEach((room) => {
                    let roomName = new Buffer(room.name, 'base64').toString('utf8');

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

getScenes = function (ip, id = null) {
    let url = `http://${ip}/api/scenes`;

    if(id) {
        url = `${url}?sceneId=${id}`
    }

    return axios
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.sceneData) {
                data.sceneData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });

                data.sceneData.forEach((scene) => {
                    let sceneName = new Buffer(scene.name, 'base64').toString('utf8');

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

getSceneCollection = function (ip, id) {
    let url = `http://${ip}/api/scenecollections`;

    if(id) {
        url = `${url}?sceneCollectionId=${id}`
    }

    return axios
        .get(url)
        .then((response) => {
            const data = response.data;
            let results = [];

            if (data.sceneCollectionData) {
                data.sceneCollectionData.sort((a, b) => {
                    return a.order > b.order ? 1 : b.order > a.order ? -1 : 0;
                });

                data.sceneCollectionData.forEach((sceneCollection) => {
                    let sceneCollectionName = new Buffer(sceneCollection.name, 'base64').toString('utf8');

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

setShade = function (ip, data, id) {
    const url = `http://${ip}/api/shades/${id}?`;

    return axios
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
