import { ref } from '../utils/ref';
import { value } from './value';

export const username = ref('');

export const channel = () => (value.channels[username.val] ||= {});
