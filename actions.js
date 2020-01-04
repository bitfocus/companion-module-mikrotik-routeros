module.exports = {

	/**
	* Get the available actions.
	*
	* @returns {Object[]} the available actions
	* @access public
	* @since 1.1.0
	*/

	getActions(self) {
		var actions = {};

		actions['test'] = { label: 'Test stuff' };

		actions['disableInterface'] = { label: 'Disable a port' };/*,
			options: [{
				type: 'dropdown',
				label: 'port name',
				id: 'interfaceID',
				choices: self.CHOICES_INTERFACES
			}]
		};*/

		return actions;
	}
}
