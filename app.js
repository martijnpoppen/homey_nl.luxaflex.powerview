'use strict';

const Homey = require('homey');
const flowActions = require('./lib/flows/actions.js');
const apiClient = require('./lib/api-client.js');
const { EventEmitter } = require('events');

class App extends Homey.App {

    log() {
        console.log.bind(this, "[log]").apply(this, arguments);
      }
    
      error() {
        console.error.bind(this, "[error]").apply(this, arguments);
      }
	
	// -------------------- INIT ----------------------

    async onInit() {
        this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.apiClient = apiClient
        this.deviceList = [];

        this.homeyEvents = new EventEmitter();
        this.homeyEvents.setMaxListeners(100);

        await flowActions.init(this.homey);
    }
    
    async setDevice(device) {
        this.deviceList = [...this.deviceList, device];
    }

    async setDevices(devices) {
        this.deviceList = [...this.deviceList, ...devices];
    }

    async removeDevice(id) {
        try {
            this.homey.app.log('removeDevice', id);

            const filteredList = this.deviceList.filter((dl) => {
                const data = dl.getData();
                return data.id !== id;
            });

            this.deviceList = filteredList;
        } catch (error) {
            this.error(error);
        }
    }
}

module.exports = App;