import { Component, Input } from '@angular/core';
import * as moment from 'moment';
import {MatTableDataSource} from '@angular/material';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	// Constantes
	maxQueueLength = 2;
	numberOfWorkers = 2;
	costPerWorkerPerHour = 0.8;
	costPerWorkerPerHairCut = 1;
	costPerHairCut = 5;
	hoursToSimulate = 240;
	minutesToSimulate: number; // 240 horas
	openHour = moment().hour(10).minute(0);
	table1data:MatTableDataSource<any>;
	table2data:MatTableDataSource<any>;
	displayedColumns = ['arriveHour', 'attendingHour', 'serviceTime', 'leaveHour'];
	displayedColumnst1 = ['minutes', 'freq'];
	displayedColumnst2 = ['minutes', 'freq'];

	// Variables
	queue = [];
	workers = [];
	currentMinutes = 0;
	goneClients = 0;
	clients = [];
	currentHour = this.openHour;
	data = null;
	gain = 0;
	timeCost = 0;
	comissionCost = 0;
	totalCost = 0;
	utility = 0;
	loading = false;
	totalClients = 0;

	constructor() {
		let table1data = [
			{minutes: '2 - 4', freq: 10},
			{minutes: '4 - 6', freq: 15},
			{minutes: '6 - 8', freq: 20},
			{minutes: '8 - 10', freq: 35},
			{minutes: '10 - 12', freq: 50},
			{minutes: '12 - 14', freq: 40},
			{minutes: '14 - 16', freq: 20},
			{minutes: '16 - 18', freq: 5},
			{minutes: '18 - 20', freq: 5},
		];

		let table2data = [
			{minutes: '5 - 15', freq: 0.10},
			{minutes: '15 - 25', freq: 0.35},
			{minutes: '25 - 35', freq: 0.30},
			{minutes: '35 - 45', freq: 0.15},
			{minutes: '45 - 55', freq: 0.10},
		];

		this.table1data = new MatTableDataSource(table1data);
		this.table2data = new MatTableDataSource(table2data);
		this.initVariables();
	}

	toInt(string) {
		string = parseInt(string);
	}

	toFloat(string) {
		string = parseFloat(string);
	}

	initVariables(){
		this.openHour = moment().hour(10).minute(0);
		this.currentHour = this.openHour;
		this.clients = [];
		this.currentMinutes = 0;
		this.goneClients = 0;
		this.queue = [];
		this.workers = [];
		this.data = null;
		this.currentHour = this.openHour;
		this.minutesToSimulate = this.hoursToSimulate * 60;
		this.gain = 0;
		this.timeCost = 0;
		this.comissionCost = 0;
		this.totalCost = 0;
		this.utility = 0;
		this.loading = false;
		this.totalClients = 0;
		for (var i = 0; i < this.numberOfWorkers; i++) {
			this.workers.push({worker: i + 1, numberOfClients: 0, bussy: false, clientBehind: false})
		}
	}

	getNextAttending() {
		this.workers.sort((a, b) => {
			if(a.client && b.client){
				return b.client.leaveHour - a.client.leaveHour
			} else {
				return a;
			}
		}).reverse();

		return this.workers.find(worker => !worker.clientBehind);
	}

	isClientBetweenService(client) {
		return this.workers.some(worker => {
			return client.arriveHour > worker.client.attendingHour && client.arriveHour < worker.client.leaveHour;
		});
	}

	getTimeOfArrive(random){
		if (random > 0 && random <= 0.05){
			return 4;
		} else if(random > 0.05 && random <= 0.125) {
			return 6;
		} else if(random > 0.125 && random <= 0.225) {
			return 8;
		} else if(random > 0.225 && random <= 0.4) {
			return 10;
		} else if(random > 0.4 && random <= 0.65) {
			return 12;
		} else if(random > 0.65 && random <= 0.85) {
			return 14;
		} else if(random > 0.85 && random <= 0.95) {
			return 16;
		} else if(random > 0.95 && random <= 0.975) {
			return 18;
		} else if(random > 0.975 && random <= 0.999999999) {
			return 20;
		}
	}

	getTimeOfService(random) {
		if (random > 0 && random <= 0.10){
			return 15;
		} else if(random > 0.10 && random <= 0.45) {
			return 25;
		} else if(random > 0.45 && random <= 0.75) {
			return 35;
		} else if(random > 0.75 && random <= 0.90) {
			return 45;
		} else if(random > 0.90 && random <= 0.999999999) {
			return 55;
		}
	}

	formated(time) {
		if(time){
			return time.format('HH:mm');
		} else {
			return ' - '
		}
	}

	isClientArriveBiggerThanAttending(client) {
		return this.workers.some(worker => {
			return worker.client.leaveHour < client.arriveHour
		});
	}

	updateStatus(client) {
		// Se verifica que los clientes que estan siendo atendidos, ya hayan salido
		this.workers.forEach(worker => {
			// Si la hora de llegada del cliente nuevo es mayor a la hora de salida
			// del cliente atendido
			if(Object.keys(worker.client).length > 0){
				if(client.arriveHour > worker.client.leaveHour) {
					// Se desocupa al trabajador y el cliente se va.
					worker.client = {};
					worker.bussy = false;
					worker.clientBehind = false;
				}
			}
		});


		// Se verifica que los clientes de la cola (si los hay...) ya hayan pasado
		// a atencion, o siguan esperando

		//Si hay almenos un cliente esperando en la cola
		if(this.queue.length > 0 && this.queue.length <= this.maxQueueLength) {
			this.queue.forEach((waiting, index) => {
				// Si la hora de llegada del cliente es mayor a la hora
				// de atencion del cliente en espera.
				if(client.arriveHour > waiting.attendingHour) {
					// Se obtiene un trabajador disponible
					let worker = this.getNextAttending();
					// Se asigna al cliente en espera a un trabajador, se aumenta
					// el contador de clientes del trabajador y lo marca ocupado.
					worker.client = waiting;
					worker.clientBehind = false; // TODO: Revisar si afecta o no.
					worker.bussy = true;
					worker.numberOfClients++;

					this.queue.splice(index, 1);
				}
			});
		}
	}

	initSimulation() {
		this.initVariables();
		let client, rand, rand2, arriveHour, timeService;
		while(this.currentMinutes < this.minutesToSimulate){
			rand = Math.random();
			rand2 = Math.random();
			arriveHour = this.getTimeOfArrive(rand);
			timeService = this.getTimeOfService(rand2);
			client = {};
			this.currentHour = this.currentHour.add(arriveHour, 'minutes');
			client.arriveHour = moment(this.currentHour);
			client.serviceTime = timeService;
			this.clients.push(client);
			this.currentMinutes += arriveHour;
		}
		this.loading = true;

		setTimeout(() => {
			this.clients.forEach((client, index) => {

				// Los primeros clientes entran directo a servicios
				if(index < this.numberOfWorkers) {

					// Se obtiene al trabajador disponible
					let availableWorker = this.workers.find(worker => !worker.bussy);

					// Se asigna que la hora de atencion sea igual a la hora de llegada
					// porque al ser de los primeros clientes, no hay cola, por lo tanto
					// se atienden inmediatamente al llegar.
					client.attendingHour = moment(client.arriveHour);
					client.leaveHour = moment(client.arriveHour).add(client.serviceTime, 'minutes');
					// ocupar al trabajador.
					availableWorker.bussy = true;
					availableWorker.client = client;
					availableWorker.numberOfClients++;

				} else {
					// Se actualiza la cola y los clientes atendios.
					// Esto sirve para que la hora de llegada del cliente sea la
					// hora actual, y por lo tanto se recorran los clientes que
					// deberian estar en cola, atendiendose, o que termino su servicio
					this.updateStatus(client);
					this.updateStatus(client);

					// Preguntar si algun trabajador esta disponible
					if(this.workers.some(worker => worker.bussy === false)){

						// Se obtiene al trabajador disponible
						let availableWorker = this.workers.find(worker => worker.bussy === false);

						// Se asigna que la hora de atencion sea igual a la hora de llegada
						client.attendingHour = moment(client.arriveHour);
						client.leaveHour = moment(client.arriveHour).add(client.serviceTime, 'minutes');
						// ocupar al trabajador.
						availableWorker.bussy = true;
						availableWorker.clientBehind = false;
						availableWorker.client = client;
						availableWorker.numberOfClients++;
					}

					// La hora de llegada del cliente esta entre la hora de atencion
					// y la hora de salida de alguno de los clientes atendidos?
					else if(this.isClientBetweenService(client)) {

						// Hay lugar en la cola???
						if (this.queue.length < this.maxQueueLength) {
							let worker = this.getNextAttending();
							if(client.arriveHour > worker.client.leaveHour) {
								client.attendingHour = moment(client.arriveHour);
							} else {
								client.attendingHour = moment(worker.client.leaveHour);
							}
							client.leaveHour = moment(client.attendingHour).add(client.serviceTime, 'minutes');
							worker.clientBehind = true;
							this.queue.push(client);

						} else {

							// No hay lugar en la cola, por tanto el cliente se va.
							this.goneClients++;
							client.gone = true;
						}
					}
				}
			});

			this.data = new MatTableDataSource(this.clients);
			this.totalClients = this.clients.filter(c => !c.gone).length;
			this.gain = this.totalClients * this.costPerHairCut; // Ganancia bruta
			this.timeCost = this.hoursToSimulate * this.numberOfWorkers * this.costPerWorkerPerHour; // Costo por hora de trabajadores
			this.comissionCost = this.totalClients * this.costPerWorkerPerHairCut

			this.totalCost = this.comissionCost + this.timeCost;
			this.utility = this.gain - this.totalCost;
			this.loading = false;
		}, 1000);

	}
}
