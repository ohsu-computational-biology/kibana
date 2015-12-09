import $ from 'jquery';
import { set } from 'lodash';

export default function (chrome, internals) {

  chrome.getXsrfToken = function () {
    return internals.xsrfToken;
  };

  $.ajaxPrefilter(function ({ kbnXsrfToken = internals.xsrfToken }, originalOptions, jqXHR) {
    if (kbnXsrfToken) {
      jqXHR.setRequestHeader('kbn-xsrf-token', kbnXsrfToken);
    }
  });

  chrome.$setupXsrfRequestInterceptor = function ($httpProvider) {
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          const { kbnXsrfToken = internals.xsrfToken } = opts;
          var bypassKbnXsrfToken = false;
          if (opts.url.indexOf('http') > -1 && opts.url.indexOf(window.location.host) < 0) {
            //console.log("bypassing 'kbn-xsrf-token' for " + opts.url );
            bypassKbnXsrfToken = true;
          }
          if (kbnXsrfToken && !bypassKbnXsrfToken) {
            set(opts, ['headers', 'kbn-xsrf-token'], kbnXsrfToken);
          }
          return opts;
        }
      };
    });
  };
}
