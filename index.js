var MikroNode       = require('mikronode');
var instance_skel   = require('../../instance_skel');
var actions         = require('./actions');
var debug;
var log;


function instance(system, id, config) {
		var self = this;

		// super-constructor
		instance_skel.apply(this, arguments);
		self.actions(); // export actions
		return self;
}

instance.prototype.CHOICES_INTERFACES = [];

instance.prototype.actions = function (system) {
	var self = this;

	self.setActions(actions.getActions(self));
};

instance.prototype.action = function (action) {
	var self = this;
	var opt = action.options;


	switch (action.action) {
		case 'test':
			break;

		case 'disableInterface':

			var Device = new MikroNode(this.config.host);
			Device.connect().then(([login])=>login('admin','5px89chm')).then(function(conn) {
				console.log("Logged in.");
				conn.closeOnDone(true); // All channels need to complete before the connection will close.
				var listenChannel=conn.openChannel("listen");

				// Each sentence that comes from the device goes through the data stream.
				listenChannel.data.subscribe(function(data) {
						// var packet=MikroNode.resultsToObj(data);
						console.log('Interface change: ',JSON.stringify(data));
				},error=>{
						console.log("Error during listenChannel subscription",error) // This shouldn't be called.
				},()=>{
						console.log("Listen channel done.");
				});

				// Tell our listen channel to notify us of changes to interfaces.
				listenChannel.write('/interface/listen').then(result=>{
						console.log("Listen channel done promise.",result);
				})
				// Catch shuold be called when we call /cancel (or listenChannel.close())
				.catch(error=>console.log("Listen channel rejection:",error));

				// All our actions go through this.
				var actionChannel=conn.openChannel("action",false); // don't close on done... because we are running these using promises, the commands complete before each then is complete.

				// Do things async. This is to prove that promises work as expected along side streams.
				actionChannel.sync(false);
				actionChannel.closeOnDone(false); // Turn off closeOnDone because the timeouts set to allow the mikrotik to reflect the changes takes too long. The channel would close.

				// These will run synchronsously (even though sync is not set to true)
				console.log("Disabling interface");
				actionChannel.write('/interface/set',{'disabled':'yes','.id':'ether4.1'}).then(results=>{
						console.log("Disable complete.");
						// when the first item comes in from the listen channel, it should send the next command.
						const {promise,resolve,reject}=MikroNode.getUnwrappedPromise();
						listenChannel.data
								.take(1)
								// This is just to prove that it grabbed the first one.
								.do(d=>console.log("Data:",MikroNode.resultsToObj(d.data)))
								.subscribe(d=>actionChannel.write('/interface/set',{'disabled':'no','.id':'ether4.1'}).then(resolve,reject));
						return promise;
				})
				.then(results=>{
						console.log("Enabled complete.");
						// return new Promise((r,x)=>setTimeout(r,1000)).then(()=>actionChannel.write('/interface/getall'));
						const {promise,resolve,reject}=MikroNode.getUnwrappedPromise();
						// when the second item comes in from the listen channel, it should send the next command.
						listenChannel.data
								.take(1)
								// This is just to prove that it grabbed the second one.
								.do(d=>console.log("Data:",MikroNode.resultsToObj(d.data)))
								.subscribe(d=>actionChannel.write('/interface/getall').then(resolve,reject));
						return promise;
				})
				.then(results=>{
						var formatted=MikroNode.resultsToObj(results.data);
						var columns=[".id","name","mac-address","comment"];
						var filtered=formatted.map(line=>columns.reduce((p,c)=>{p[c]=line[c];return p},{}));
						console.log('Interface [ID,Name,MAC-Address]: ',JSON.stringify(filtered,true,4));
				})
				.catch(error=>{
						console.log("An error occurred during one of the above commands: ",error);
				})
				// This runs after all commands above, or if an error occurs.
				.then(nodata=>{
						console.log("Closing everything.");
						listenChannel.close(true); // This should call the /cancel command to stop the listen.
						actionChannel.close();
				});
			});
			break;

		case 'fill_interfaces':

			break;
	}
}

instance.prototype.config_fields = function () {

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

instance.prototype.destroy = function () {

		debug("destroy", this.id);
}

instance.prototype.init = function () {
		var self = this;

		debug = self.debug;
		log = self.log;

		self.status(self.STATUS_UNKNOWN);
		self.init_connection();

}

instance.prototype.init_connection = function() {
	var self = this;

	if(self.config.host !== undefined && self.config.user !== undefined && self.config.password !==undefined) {

		var Device = new MikroNode(self.config.host);
		Device.connect().then(([login])=>login(self.config.user,self.config.password)).then(function(conn) {
			self.status(self.STATUS_OK);
			debug("logged in");
			console.log("logged in");

			conn.closeOnDone(true); // All channels need to complete before the connection will close.
			var listenChannel=conn.openChannel("listen");

			// Each sentence that comes from the device goes through the data stream.
			listenChannel.data.subscribe(function(data) {
					// var packet=MikroNode.resultsToObj(data);
					console.log('Interface change: ',JSON.stringify(data));
			},error=>{
					self.log('error',"Error during listenChannel subscription",error) // This shouldn't be called.
			},()=>{
					console.log("Listen channel done.");
			});

			// Tell our listen channel to notify us of changes to interfaces.
			listenChannel.write('/interface/listen').then(result=>{
					console.log("Listen channel done promise.",result);
			})
			// Catch should be called when we call /cancel (or listenChannel.close())
			.catch(error=>self.log('error',"Listen channel rejection:",error));

			// All our actions go through this.
			var actionChannel=conn.openChannel("action",false); // don't close on done... because we are running these using promises, the commands complete before each then is complete.

			actionChannel.write('/interface/getall').then(results=>{
				var formatted=MikroNode.resultsToObj(results.data);
				var columns=["name"];
				var filtered=formatted.map(line=>columns.reduce((p,c)=>{p[c]=line[c];return p},{}));
				var jsonString = JSON.stringify(filtered,true,1);
				var jsonFormatted = JSON.parse(jsonString);

				for (let i in jsonFormatted) {
					console.log("Got: ", jsonFormatted[i].name);
					instance.prototype.CHOICES_INTERFACES.push({label: jsonFormatted[i].name, id: jsonFormatted[i].name});
				}
				//Reload actions
				self.actions();
			})
			.catch(error=>{
					self.log('error', "An error occurred during one of the above commands: ",error);
			})
			// This runs after all commands above, or if an error occurs.
			.then(nodata=>{
					console.log("Closing everything.");
					listenChannel.close(true); // This should call the /cancel command to stop the listen.
					actionChannel.close();
			});
		});

	}

}

instance.prototype.updateConfig = function (config) {
	var self = this;
	var resetConnection = false;

	if (self.config.host != config.host)
	{
		resetConnection = true;
	}

	self.config = config;

	if (resetConnection === true) {
		self.init_connection();
	}
}


instance_skel.extendedBy(instance);
exports = module.exports = instance;
