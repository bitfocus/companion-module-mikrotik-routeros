exports.getActions = function(self) {

		var actions = {
			'disableInterface': {
				label: 'Disable or enable a port',
				options: [{
					type: 'dropdown',
					label: 'port name',
					id: 'interface',
					choices: self.CHOICES_INTERFACES
				},{
					type: 'dropdown',
					label: 'enable/disable',
					id: 'disabled',
					default: 'no',
					choices: [{ label: 'enable', id: 'no'},{ label: 'disable', id: 'yes'}]
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
