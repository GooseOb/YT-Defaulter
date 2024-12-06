export const isDescendantOrTheSame = (
	child: Readonly<Element | ParentNode> | null,
	parents: readonly Readonly<ParentNode>[]
): boolean => {
	while (child !== null) {
		if (parents.includes(child)) return true;
		child = child.parentNode;
	}
	return false;
};
