export const findInNodeList = <T extends Node>(
	list: DeepReadonly<NodeListOf<T>>,
	predicate: (item: T) => boolean
) => {
	for (const item of list) {
		if (predicate(item)) return item;
	}
	return null;
};
