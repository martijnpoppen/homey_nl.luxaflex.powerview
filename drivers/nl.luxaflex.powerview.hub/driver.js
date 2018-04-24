"use strict";

const Homey = require('homey');
const NBName = require('netbios-name');
const Service = require('netbios-name-service');

var serv = null;
 
class PowerviewDriver extends Homey.Driver {

 

	onPair( socket ) {
       
		
		var nbname = new NBName({name: 'PDBU-Hub3.0', suffix: 0x20});
		var nbname2 = new NBName({name: 'PowerView-Hub', suffix: 0x20});
		 
		 if (serv == null){
			   serv = new Service({tcpDisable:true, broadcastAddress: "255.255.255.255", udpPort:8127});
		
			   serv.start(function() {
 
			   serv.find(nbname, function(state, address){
				  console.log('Found NetBIOS name at ', address, state);
					if (ValidateIPaddress(address)){
						socket.emit('foundDevices', address, function( err, result ){
							console.log( result ) 
						});
					}
			   });
			  
			   serv.find(nbname2, function(state, address){
				  console.log('Found NetBIOS name at ', address, state);	
				  if (ValidateIPaddress(address)){
						socket.emit('foundDevices', address, function( err, result ){
							console.log( result ) 
						});
					}
			   });			  		 
		    });
			
			//stop after 4 seconds
			setTimeout(function(){  serv.stop(function() { serv = null }); }, 4000);
			
		}
		
		socket.on('list_devices', function( data, callback ) {
				console.log("Device Pairing method called.");
				console.log(data);				
				
				callback( null, [
					{
						name: "New Powerview Hub",
						data: {
							id: data.id
						}
					}
				]);
        });
		
		
		
		function ValidateIPaddress(ipaddress) 
		{
		 if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress))
		  {
			return (true)
		  }  
		  return (false)
		}
		
    }

	
}

module.exports = PowerviewDriver;