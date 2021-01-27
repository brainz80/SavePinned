const browser = require('webextension-polyfill');

import { saveAs } from 'file-saver';
import swal from 'sweetalert';

global.browser = browser;
global.saveAs = saveAs;
global.swal = swal;