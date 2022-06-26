// ==UserScript==
// @name         YT default speed x2
// @namespace    https://greasyfork.org/ru/users/901750-gooseob
// @version      0.1.1
// @description  Хуткасьць x2 па дэфолту на ютубе
// @author       GooseOb
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// ==/UserScript==

(function() {
	const elements = {
		settingsBtns: document.getElementsByClassName('ytp-settings-button'),
		menus: document.getElementsByClassName('ytp-settings-menu')
	};

	const menuSession = texts => {
		if (window.location.pathname !== '/watch') return;
		const {
			settingsBtns: [settingsBtn],
			menus: [menu]
		} = elements;
		const isMenu = () => menu.style.display !== 'none';
		if (!isMenu()) settingsBtn.click();
		texts.forEach(text => {
			const labels = Array.from(menu.getElementsByClassName('ytp-menuitem-label'))
			if (typeof text === 'object') {
				labels.reverse();
				const {max} = text;
				while (labels.length) {
					const label = labels.pop();
					const labelValue = parseInt(label.textContent);
					if (!labelValue || labelValue > max) continue;
					label.click();
					break;
				};
			} else labels
				.filter(el => el.textContent === text)[0]
				.click();
		});
		if (isMenu()) settingsBtn.click();
	};

	let isX2 = false;

	const quality = [
		'Якасць',
		{max: 1080}
	];
	const speed = () => {
		const speedValue = isX2 ? 'Звычайны' : '2';
		isX2 = !isX2;
		return [
			'Хуткасць прайгравання',
			speedValue
		];
	};

	document.addEventListener('keyup', ({shiftKey, ctrlKey, code}) => {
		if (ctrlKey && code === 'Space') menuSession(shiftKey ? quality : speed());
	});

	setTimeout(() => {
		menuSession(quality.concat(speed()));
	}, 200);
})();