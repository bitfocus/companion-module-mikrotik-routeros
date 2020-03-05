var MikroNode       = require('mikronode');
var instance_skel   = require('../../instance_skel');
var actions         = require('./actions');
var debug;
var log;

let CHOICES_INTERFACES = [{ label: 'nothing yet', id:'0'}];

class instance extends instance_skel {

	constructor(system,id,config) {
		super(system,id,config)

		Object.assign(this, {...actions})

		this.actions()
	}

	actions(system) {
		this.setActions(actions.getActions(CHOICES_INTERFACES));
	}

	action(action) {
		var opt = action.options;

		if(this.config.host !== undefined && this.config.user !== undefined && this.config.password !==undefined) {

			var Device = new MikroNode(this.config.host);
			Device.connect().then(([login])=>login(this.config.user,this.config.password)).then(function(conn) {
				this.status(this.STATUS_OK);

				conn.closeOnDone(true); // All channels need to complete before the connection will close.
				var listenChannel=conn.openChannel("listen");

				// Each sentence that comes from the device goes through the data stream.
				listenChannel.data.subscribe(function(data) {
						// var packet=MikroNode.resultsToObj(data);
						// console.log('Interface change: ',JSON.stringify(data));
				},error=>{
						this.log('error',"Error during listenChannel subscription",error) // This shouldn't be called.
				},()=>{
						console.log("Listen channel done.");
				});

				// Tell our listen channel to notify us of changes to interfaces.
				listenChannel.write('/interface/listen').then(result=>{
						console.log("Listen channel done promise.",result);
				})
				// Catch should be called when we call /cancel (or listenChannel.close())
				.catch(error=>this.log('error',"Listen channel rejection:",error));

				// All our actions go through this.
				var actionChannel=conn.openChannel("action",false); // don't close on done... because we are running these using promises, the commands complete before each then is complete.

				switch (action.action) {

					case 'disableInterface':
						actionChannel.write('/interface/set',{'disabled':opt.disabled,'.id':opt.interface}).then(results=>{
							this.log('info', 'Setting complete: '+ opt.interface);
						})
						.catch(error=>{
								this.log('error', "An error occurred during one of the above commands: ",error);
						})
						.then(nodata=>{
									this.log('info', 'Closing channels');
									listenChannel.close(true); // This should call the /cancel command to stop the listen.
									actionChannel.close();
						});
						break;
					case 'customCommand':
						actionChannel.write(opt.APIcommand, JSON.parse(opt.APIoptions)).then(results=>{
							this.log('info', 'Setting complete: '+ opt.customCommand);
						})
						.catch(error=>{
								this.log('error', "An error occurred during one of the above commands: ",error);
						})
						.then(nodata=>{
									this.log('info', 'Closing channels');
									listenChannel.close(true); // This should call the /cancel command to stop the listen.
									actionChannel.close();
						});
						break;
					default:
						this.log('info', 'Closing channels');
						listenChannel.close(true); // This should call the /cancel command to stop the listen.
						actionChannel.close();
				}

				// This runs after all commands above, or if an error occurs.
			});
		}
	}

	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This will establish a connection to the Mikrotik'
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'IP address',
				width: 12,
				default: '192.168.88.1',
				regex: this.REGEX_IP
			},
			{
				type: 'textinput',
				id: 'user',
				label: 'User',
				width: 12,
				default: 'admin'
			},
			{
				type: 'textinput',
				id: 'password',
				label: 'Password',
				width: 12
			}
		]
	}

	destroy() {
			debug("destroy", this.id);
	}

	init() {

			debug = this.debug;
			log = this.log;

			this.status(this.STATUS_UNKNOWN);
			this.init_connection();

	}

	init_connection() {

		if(this.config.host !== undefined && this.config.user !== undefined && this.config.password !==undefined) {
			var Device = new MikroNode(this.config.host);
			Device.connect().then(([login])=>login(this.config.user,this.config.password)).then((conn)=> {
				this.status(this.STATUS_OK);
				this.log("debug","logged in");

				conn.closeOnDone(true); // All channels need to complete before the connection will close.
				var listenChannel=conn.openChannel("listen");

				// Each sentence that comes from the device goes through the data stream.
				listenChannel.data.subscribe((data)=> {
						// var packet=MikroNode.resultsToObj(data);
						console.log('Interface change: ',JSON.stringify(data));
				},error=>{
						this.log('error',"Error during listenChannel subscription",error) // This shouldn't be called.
				},()=>{
						console.log("Listen channel done.");
				});

				// Tell our listen channel to notify us of changes to interfaces.
				listenChannel.write('/interface/listen').then(result=>{
						console.log("Listen channel done promise.",result);
				})
				// Catch should be called when we call /cancel (or listenChannel.close())
				.catch(error=>this.log('error',"Listen channel rejection:",error));

				// All our actions go through this.
				var actionChannel=conn.openChannel("action",false); // don't close on done... because we are running these using promises, the commands complete before each then is complete.

				actionChannel.write('/interface/getall').then(results=>{
					//console.log(results.data);
					var formatted=MikroNode.resultsToObj(results.data);
					var columns=["name"];
					var filtered=formatted.map(line=>columns.reduce((p,c)=>{p[c]=line[c];return p},{}));
					var jsonString = JSON.stringify(filtered,true,1);
					var jsonFormatted = JSON.parse(jsonString);

					CHOICES_INTERFACES = [];
					for (let i in jsonFormatted) {
						console.log("Got: ", jsonFormatted[i].name);
						CHOICES_INTERFACES.push({label: jsonFormatted[i].name, id: jsonFormatted[i].name});
					}
					//Reload actions
					this.actions();
				})
				.catch(error=>{
						this.log('error', "An error occurred during one of the above commands: ",error);
				})
				// This runs after all commands above, or if an error occurs.
				.then(nodata=>{
						this.log("debug","fishined with first data");
						listenChannel.close(true); // This should call the /cancel command to stop the listen.
						actionChannel.close();
				});
			});

		}

	}

	updateConfig(config) {
		var resetConnection = false;

		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		if (resetConnection === true) {
			this.init_connection();
		}
	}
}

exports = module.exports = instance;
