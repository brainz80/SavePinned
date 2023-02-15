import browser from 'webextension-polyfill';

import Sets from './functions.js';

// autoloading tab set
browser.storage.local.clear();

browser.runtime.onStartup.addListener(() => {
	browser.windows.getCurrent().then((win) => {
		Sets.autoLoad(win.id);
	});
});