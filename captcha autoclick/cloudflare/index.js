
// ==UserScript==
// @name         Autopass Cloudflare CAPTCHA
// @namespace    Tampermonkey Scripts
// @match        *://*/*
// @version      0.1
// @grant        none
// @run-at       document-start
// @author       jumman
// @require     https://raw.githubusercontent.com/shithil008/userscripts/main/libraries/userscripts/cloudflare-captcha/module_jquery.js
// @require     https://raw.githubusercontent.com/shithil008/userscripts/main/libraries/userscripts/cloudflare-captcha/global_module.js
// @icon         https://www.google.com/s2/favicons?sz=48&domain=cloudflare.com
// @icon64       https://www.google.com/s2/favicons?sz=64&domain=cloudflare.com
// ==/UserScript==

global_module = window['global_module'];

  async function VerifyYouAreHuman() {
    dom = await global_module.waitForElement("span[class='mark']", null, null, 200, -1);
    global_module.clickElement($(dom).eq(0)[0]);
      console.log("clicked mark");
}



async function main() {

    if (window.location.host == 'challenges.cloudflare.com' && $("div[id='success']").length > 0 && $("div[id='fail']").length > 0 && $("div[id='expired']").length > 0) {
        console.log(window.location.host);
        setTimeout(VerifyYouAreHuman, 6000);

        return;
    }

}

$(document).ready(() => main());
