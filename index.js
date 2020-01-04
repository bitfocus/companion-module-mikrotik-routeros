var MikroNode       = require('mikronode');
const instance_skel = require('../../instance_skel');
let actions         = require('./actions');
//var feedback      = require('./feedback');
let device;
let debug;
let log;
let packet;
let packets;


/**
 * Companion instance class for the Metus Ingets software.
 *
 * @extends instance_skel
 * @since 1.1.0
 * @author Jeffrey Davidsz <jeffrey.davidsz@vicreo.eu>
 */

class instance extends instance_skel {

	/**
	* Create an instance.
	*
	* @param {EventEmitter} system - the brains of the operation
	* @param {string} id - the instance ID
	* @param {Object} config - saved user configuration parameters
	* @since 1.1.0
	*/
	constructor(system, id, config) {
		super(system, id, config);

		this.stash        = [];
		this.command      = null;
		this.poeInterfaces = [];
		this.CHOICES_INTERFACES = [];

		Object.assign(this, {
			...actions/*,
			...feedback*/
		});

		this.actions(); // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.1.0
	 */
	actions(system) {
		var self = this;
		this.setActions(this.getActions(self));
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	action(action) {
		var cmd;
		var opt = action.options;


		switch (action.action) {

			case 'test':

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
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.1.0
	 */
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

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	destroy() {


		debug("destroy", this.id);
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.1.0
	 */
	init() {
		debug = this.debug;
		log = this.log;

		//this.initFeedbacks();
		//this.checkFeedbacks('encoder_started');

		this.init_connection();
	}

	/**
	 * INTERNAL: use setup data to initalize the tcp socket object.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	init_connection() {
		if(this.config.host !== undefined) {

		//	this.device = new MikroNode(this.config.host);

		}

	}

	/**
	 * INTERNAL: initialize feedbacks.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		// feedbacks
		//var feedbacks = this.getFeedbacks();

		//this.setFeedbackDefinitions(feedbacks);
	}

	/**
	 * INTERNAL: Routes incoming data to the appropriate function for processing.
	 *
	 * @param {string} key - the command/data type being passed
	 * @param {Object} data - the collected data
	 * @access protected
	 * @since 1.0.0
	 */
	processInformation(key,data) {

			// TODO: find out more

	}

	/**
	 * INTERNAL: use model data to define the choices for the dropdowns.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	setupChoices() {



	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.1.0
	 */
	updateConfig(config) {
		var resetConnection = false;

		if (this.config.host != config.host)
		{
			resetConnection = true;
		}

		this.config = config;

		this.actions();
		//this.initFeedbacks();
		//this.encoders = [];

		if (resetConnection === true) {
			this.init_connection();
		}
	}

}

exports = module.exports = instance;
