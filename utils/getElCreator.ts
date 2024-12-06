export const getElCreator =
	<TTag extends keyof HTMLElementTagNameMap>(tag: TTag) =>
	<TProps extends DeepReadonly<Props<HTMLElementTagNameMap[TTag]>>>(
		props?: TProps
	) =>
		Object.assign(document.createElement(tag), props);
