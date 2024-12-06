export const $ = <T extends HTMLElement>(id: string) =>
	document.getElementById(id) as T;
