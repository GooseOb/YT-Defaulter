import { onVideoPage } from './video-page';

let lastUrl: string;
export const onPageChange = (url: string) => {
	if (lastUrl !== url) {
		lastUrl = url;
		if (
			location.pathname.startsWith('/live') ||
			location.pathname === '/watch'
		) {
			setTimeout(onVideoPage, 1_000);
		}
	}
};
