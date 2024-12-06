import { value } from './value';

export const channel = {
	username: '',
	get() {
		return (value.channels[this.username] ||= {});
	},
};
