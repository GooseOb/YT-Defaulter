type DeepReadonly<T> = T extends (infer R)[]
	? DeepReadonlyArray<R>
	: T extends Function
		? T
		: T extends object
			? DeepReadonlyObject<T>
			: T;
type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};

type Props<T extends HTMLElement> = Partial<T> & object;
type ControlItem<T extends HTMLElement> = { item: HTMLDivElement; elem: T };
type UrlChangeEvent = { url: string };
interface Window {
	onurlchange: (e: UrlChangeEvent) => void | null;
}
interface WindowEventMap {
	urlchange: UrlChangeEvent;
}
