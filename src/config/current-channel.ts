import { value } from './value';

export const channel = {
	username: '',
	get() {
		value.channels[this.username] ||= {};
		return value.channels[this.username];
	},
};
