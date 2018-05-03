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
		let results = [];
		 if (data.sceneData){
		    data.sceneData.forEach((scene) => {
				 let sceneName = new Buffer(scene.name, 'base64').toString('utf8');
				 results.push(
					 {
					   "id": scene.id,
					   "name": sceneName + " (" + scene.id + ")"
					 }
				 );
			});
		 }

		return results = results.filter(( resultsItem ) => {
					return resultsItem.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;
				}).sort((a,b) => { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);});
		
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
				}).sort((a,b) => { return (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0);});
		
    }).catch(() => {
		console.log('Cannot get sceneCollections');
		throw new Error('Cannot get sceneCollections');
	});
	
});