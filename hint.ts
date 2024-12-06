import { div } from './elements-creators';

export class Hint {
	constructor(prefix: string, props?: DeepReadonly<Props<HTMLDivElement>>) {
		this.element = div(props);
		this.element.className ||= SETTING_HINT_CLASS;
		this.prefix = prefix;
		this.hide();
	}
	hide(): void {
		this.element.style.display = 'none';
	}
	show(msg?: string): void {
		this.element.style.display = 'block';
		if (msg) this.element.textContent = this.prefix + msg;
	}
	private readonly prefix: string;
	element: HTMLDivElement;
}
