import { value } from './value';

export const channel: Ref<Cfg> & { set: (username: string) => void } = {
	value: null,
	set(username: string) {
		this.value = value.channels[username] ||= {};
	},
};
