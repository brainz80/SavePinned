import browser from 'webextension-polyfill';
import swal from 'sweetalert';

import { saveAs } from 'file-saver';

global.browser = browser;
global.saveAs = saveAs;
global.swal = swal;