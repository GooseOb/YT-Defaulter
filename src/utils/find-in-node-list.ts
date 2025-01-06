export const findInNodeList = <T extends Node>(
	list: DeepReadonly<NodeListOf<T>>,
	finder: (item: T) => boolean
) => {
	for (const item of list) {
		if (finder(item)) return item;
	}
	return null;
};
