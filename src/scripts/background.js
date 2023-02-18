import browser from 'webextension-polyfill';

import { autoload } from './functions.js';

// autoloading tab set
browser.storage.local.clear();

browser.runtime.onStartup.addListener(() => {
	browser.windows.getCurrent().then((win) => {
		autoload(win.id);
	});
});