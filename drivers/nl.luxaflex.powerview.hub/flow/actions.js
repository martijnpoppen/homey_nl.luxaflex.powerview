'use strict';

const net = require('net');
const Homey = require('homey');
const http = require('http.min')

let sceneSetAction = new Homey.FlowCardAction('nl.luxaflex.powerview.actions.sceneSet');
sceneSetAction.register().registerRunListener(( args, state ) => {
		
		let sceneId = ((args || {})["nl.luxaflex.powerview.sceneAutocomplete"] || {}).id;
		let ip = ((args || {}).device || {}).ip;
		//args["nl.luxaflex.powerview.sceneAutocomplete"].id
		
		let url = "http://" + ip +"/api/scenes?sceneId=" + sceneId;
		console.log(url);		
		
		return http(url).then((result) =>{
			console.log('Code: ' + result.response.statusCode)
			console.log('Response: ' + result.data)
			
			return (result.response.statusCode == 200);			
		}).catch(() => {
			console.log('cannot set scene');
			return false;
		});
		
        // let isChanged = true; // // true or false - should be a function check
        // return Promise.resolve( isChanged );

});

let sceneCollectionSetAction = new Homey.FlowCardAction('nl.luxaflex.powerview.actions.sceneCollectionSet');
sceneCollectionSetAction.register().registerRunListener(( args, state ) => {
		
		let sceneCollectionId = ((args || {})["nl.luxaflex.powerview.sceneCollectionAutocomplete"] || {}).id;
		let ip = ((args || {}).device || {}).ip;
		//args["nl.luxaflex.powerview.sceneAutocomplete"].id
		
		let url = "http://" + ip +"/api/scenecollections?sceneCollectionId=" + sceneCollectionId;
		console.log(url);		
		
		return http(url).then((result) =>{
			console.log('Code: ' + result.response.statusCode)
			console.log('Response: ' + result.data)
			
			return (result.response.statusCode == 200);			
		}).catch(() => {
			console.log('cannot set sceneCollection');
			return false;
		});
		
        // let isChanged = true; // // true or false - should be a function check
        // return Promise.resolve( isChanged );

});

//http://192.168.150.13/api/scenecollections?sceneCollectionId=1408



let sceneSetActionArg = sceneSetAction.getArgument('nl.luxaflex.powerview.sceneAutocomplete');
sceneSetActionArg.registerAutocompleteListener( ( query, args ) => {
	//console.log("getSceneList" + JSON.stringify(args));
	
	let ip = ((args || {}).device || {}).ip;

	let url = "http://" + ip +"/api/scenes?";
	//console.log("url" + url);
	return http.json(url).then((data) => {
		//console.log(JSON.stringify(data));
		if (data.sceneData) {
			data.sceneData.sort((a,b) => { return (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0);});
		}

		let urlRooms = "http://" + ip + "/api/rooms?";
		return http.json(urlRooms).then((dataRooms) => {
			//console.log(JSON.stringify(dataRooms));
			let results = [];

			if (dataRooms.roomData) {
				dataRooms.roomData.sort((a,b) => { return (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0);});
				dataRooms.roomData.forEach((room) => {
					let roomName = new Buffer(room.name, 'base64').toString('utf8');
					 if (data.sceneData) {
						data.sceneData.forEach((scene) => {
							if (scene.roomId === room.id) {
								let sceneName = new Buffer(scene.name, 'base64').toString('utf8');
								results.push(
									 {
									   "id": scene.id,
									   "name": roomName + " - " + sceneName + " (" + scene.id + ")"
									 }
								);
							}
						});
					 }
				});
			}

			return results = results.filter(( resultsItem ) => {
						return resultsItem.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
					});

		}).catch(() => {
			console.log('Cannot get rooms');
			throw new Error('Cannot get rooms');
		});
	}).catch(() => {
		console.log('Cannot get scenes');
		throw new Error('Cannot get scenes');
	});
});

let sceneCollectionSetActionArg = sceneCollectionSetAction.getArgument('nl.luxaflex.powerview.sceneCollectionAutocomplete');
sceneCollectionSetActionArg.registerAutocompleteListener( ( query, args ) => {
	//console.log("getSceneList" + JSON.stringify(args));
	
	let ip = ((args || {}).device || {}).ip;
	let url = "http://" + ip +"/api/scenecollections?";
	//console.log("url" + url);
	return http.json(url).then((data) => {
		//console.log(JSON.stringify(data));
		let results = [];

		if (data.sceneCollectionData){
			data.sceneCollectionData.sort((a,b) => { return (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0);});
			data.sceneCollectionData.forEach((sceneCollection) => {
				 let sceneCollectionName = new Buffer(sceneCollection.name, 'base64').toString('utf8');
				 results.push(
					 {
					   "id": sceneCollection.id,
					   "name": sceneCollectionName + " (" + sceneCollection.id + ")"
					 }
				 );
			});
		}

		return results = results.filter(( resultsItem ) => {
					return resultsItem.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
				});
		
    }).catch(() => {
		console.log('Cannot get sceneCollections');
		throw new Error('Cannot get sceneCollections');
	});
	
});