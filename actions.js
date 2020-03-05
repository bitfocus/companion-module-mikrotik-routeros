exports.getActions = function(CHOICES_INTERFACES) {

		var actions = {
			'disableInterface': {
				label: 'Disable or enable a port',
				options: [{
					type: 'dropdown',
					label: 'port name',
					id: 'interface',
					choices: CHOICES_INTERFACES
				},{
					type: 'dropdown',
					label: 'enable/disable',
					id: 'disabled',
					default: 'no',
					choices: [{ label: 'enable', id: 'no'},{ label: 'disable', id: 'yes'}]
				}]
			},
			'dhcp': {
				label: 'Disable or enable a DHCP',
				options: [{
					type: 'dropdown',
					label: 'port name',
					id: 'interface',
					choices: CHOICES_INTERFACES
				},{
					type: 'dropdown',
					label: 'enable/disable',
					id: 'disabled',
					default: 'no',
					choices: [{ label: 'enable', id: 'no'},{ label: 'disable', id: 'yes'}]
				}]
			},
			'poe': {
				label: 'Disable or enable POE',
				options: [{
					type: 'dropdown',
					label: 'port name',
					id: 'interface',
					choices: CHOICES_INTERFACES
				},{
					type: 'dropdown',
					label: 'options',
					id: 'options',
					default: 'auto-on',
					choices: [{ label: 'auto-on', id: 'auto-on'},{ label: 'forced-on', id: 'forced-on'},{ label: 'forced-off', id: 'forced-off'}]
				}]
			},
			'customCommand': {
				label: 'Send custum API command',
				options: [{
					label: 'command',
					type: 'textinput',
					default: '/interface/set',
					id: 'APIcommand'
				},{
					label: 'options',
					type: 'textinput',
					default: '{"disabled":"yes",".id":"ether4.1"}',
					id: 'APIoptions'
				}]
			},

		};

		return(actions);

}
