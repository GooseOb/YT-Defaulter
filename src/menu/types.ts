import type { Setting } from '../config';

type Control = HTMLSelectElement | HTMLInputElement;
export type SettingControls = Record<Setting, Control>;
