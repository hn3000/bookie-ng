
import init, { MimeType } from './init';

var prefix = '/b2a11fa8-4622-11e8-a8f9-7831c1c43a5a/dw/';

const dataWorkerUrl = '/dw.bundle.js'

navigator.serviceWorker.register(dataWorkerUrl, { scope: prefix });

function makeDataURI(x, mt) {
  if (!mt) mt = 'text/html';
  x = encodeURI(x);
  return 'data:'+mt+';,'+x;
}

