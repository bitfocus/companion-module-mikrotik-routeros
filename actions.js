exports.getActions = function(self) {

		var actions = {
			'fill_interfaces': { label: 'Fill interfaces'},
			'disableInterface': {
				label: 'Disable a port',
				options: [{
					type: 'dropdown',
					label: 'port name',
					id: 'interfaceID',
					choices: self.CHOICES_INTERFACES
				}]
			},

		};

		return(actions);

}
