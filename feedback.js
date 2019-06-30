module.exports = {

		/**
		* Get the available feedbacks.
		*
		* @returns {Object[]} the available feedbacks
		* @access public
		* @since 1.1.0
		*/

		getFeedbacks() {
			var feedbacks = {};
			console.log(this.CHOICES_LIST);
			feedbacks['interface_poe'] = {
				label: 'Change background color if the selected interface has POE',
				description: 'If the selected interface has poe, change background color of the bank',
				options: [
					{
						type: 'colorpicker',
						label: 'Foreground color',
						id: 'fg',
						default: this.rgb(255,255,255)

					},
					{
						type: 'colorpicker',
						label: 'Background color',
						id: 'bg',
						default: this.rgb(255,0,0)
					},
					{
						type: 'dropdown',
						label: 'Interface',
						id: 'interface',
						default: '1',
						choices: this.CHOICES_INTERFACES
					}
				],
				callback: (feedback, bank) => {
					if (this.poeInterfaces.includes(parseInt(feedback.options.encoder))) {
						return {
							color: feedback.options.fg,
							bgcolor: feedback.options.bg
						};
					}
				}
			};

			return feedbacks
		}
}
