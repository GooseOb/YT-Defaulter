export const getChildTree = (element: Node): any => {
	const className =
		element instanceof HTMLElement ? element.className : undefined;
	const textContent = element.textContent;
	return element.hasChildNodes()
		? {
				className,
				textContent,
				children: Array.from(element.childNodes, getChildTree),
			}
		: {
				className,
				textContent,
			};
};
