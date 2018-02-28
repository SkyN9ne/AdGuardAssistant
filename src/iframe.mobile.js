/**
 * Manages iframe and it's content
 * @param $
 * @param log
 * @param selector
 * @param localization
 * @returns {{showSelectorMenu: showSelectorMenu, showSliderMenu: showSliderMenu, setButtonPosition: setButtonPosition, onCloseMenu: CustomEvent, onShowMenuItem: CustomEvent, removeIframe: removeIframe}}
 * @constructor
 */

/* global CSS, HTML, CommonUtils, Ioc, SelectorMenuController, SliderMenuControllerMobile */

var IframeControllerMobile = function ($, log, selector, localization) { // jshint ignore:line
    var iframe = null;
    var iframeElement = null;
    var currentItem = null;
    var iframePositionOffset = 5;

    var onCloseMenu = new CustomEvent();
    var onShowMenuItem = new CustomEvent();

    var views = {};

    views['mobilePopup.html'] = HTML.popup;
    views['mobileMenu.html'] = HTML.mobile_menu;

    var defaultCSS = {
        clip: 'auto',
        'z-index': 999999999999
    };

    var defaultAttributes = {
        'class': selector.ignoreClassName(),
        frameBorder: 0,
        width: 320,
        height: 'auto',
        allowTransparency: 'true',
        id: 'iframe-x2eRYVVQRsG9'
    };

    var createIframe = function (onIframeLoadCallback, styles, attrs) {
        log.debug('Creating iframe');

        if (document.querySelector('#' + defaultAttributes.id)) {
            log.error("Iframe already added");
            return;
        }

        iframe = CommonUtils.createElement('iframe');

        $(iframe).on('load', function () {
            // styles inside iframe
            appendDefaultStyleInIframe();
            onIframeLoadCallback();

            updateIframeAttrs(attrs);
            updateIframeStyles(styles);
        });

        iframeElement = iframe;
        CommonUtils.createStylesElement('adg-styles-selector', CSS.selector);
        document.documentElement.appendChild(iframeElement);
    };

    var createShadowRootElement = function(iframeElement) {
        var shadowiframeElement = iframeElement.attachShadow({mode: 'closed'});

        var shadowRootDefaultStyle = {
            display: 'block',
            position: 'relative',
            width: 0,
            height: 0,
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            'z-index': 9999999999
        };

        var style = [];

        Object.keys(shadowRootDefaultStyle).forEach(function(key) {
            style.push(key + ':' + shadowRootDefaultStyle[key] + '!important;');
        });

        style = ':host {' + style.join('') + '}';
        shadowiframeElement.innerHTML = '<style>' + style + '</style>';

        return shadowiframeElement;
    };

    var updateIframeAttrs = function(attrs) {
        iframe.removeAttribute('style');
        iframe.removeAttribute('height');

        var attributes = CommonUtils.objectAssign(defaultAttributes, attrs);

        Object.keys(attributes).forEach(function (item) {
            iframe.setAttribute(item, attributes[item]);
        });

        iframe.setAttribute('width', attributes.width);
        iframe.setAttribute('height', attributes.height === 'auto' ? iframe.contentDocument.body.scrollHeight : attributes.height);
    };

    var updateIframeStyles = function (styles) {
        var css = CommonUtils.objectAssign(defaultCSS, styles);

        Object.keys(css).forEach(function (item) {
            iframe.style[item] = css[item];
        });

        iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
    };

    var appendDefaultStyleInIframe = function() {
        try {
            log.info('Iframe loaded writing styles');
            var doc = iframe.contentDocument;
            doc.open();
            doc.write('<html><head><style type="text/css">' + CSS.common + CSS.mobile + '</style></head></html>');
            doc.close();
        } catch (ex) {
            log.error(ex);
        }
    };

    var showMenuItem = function (viewName, controller, options, styles, attrs) {
        if (currentItem === viewName) {
            return;
        }

        var onIframeLoad = function () {
            var frameElement = iframe;
            var view = CommonUtils.createElement(views[viewName]);
            appendContent(view);
            localize();

            if (!options) {
                options = {};
            }

            if (controller) {
                controller.init(frameElement, options);
            }
            updateIframeAttrs(attrs);
            updateIframeStyles(styles);

            currentItem = viewName;
            onShowMenuItem.notify();
            showIframe();
        };

        if (!iframe) {
            createIframe(onIframeLoad, styles, attrs);
            return;
        }

        onIframeLoad();
    };

    var hideIframe = function() {
        if (iframe && iframe) {
            iframe.style.display = 'none';
        }
    };

    var showIframe = function() {
        if (iframe && iframe) {
            iframe.style.display = 'block';
        }
    };

    var showSelectorMenu = function () {
        hideIframe();
        selector.close();
        var styles = {
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            margin: 'auto',
            'border-radius': '2px',
            'background': 'transparent'
        };

        showMenuItem('mobilePopup.html', null, null, styles);

        var startSelectMode = iframe.contentDocument.querySelector('.start-select-mode');
        var cancelSelectMode = iframe.contentDocument.querySelector('.cancel-select-mode');

        startSelectMode.addEventListener('click', startSelect);
        cancelSelectMode.addEventListener('click', removeIframe);
    };

    var startSelect = function() {
        hideIframe();
        var controller = Ioc.get(SelectorMenuController);
        controller.startSelector();
    };

    var showSliderMenu = function(element) {
        var controller = Ioc.get(SliderMenuControllerMobile);
        var options = {
            element: element
        };
        var styles = {
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)'
        };

        showMenuItem('mobileMenu.html', controller, options, styles);
    };

    var localize = function () {
        var elements = iframe.contentDocument.querySelectorAll('[i18n]');
        for (var i = 0; i < elements.length; i++) {
            var message = localization.getMessage(elements[i].getAttribute('i18n'));
            localization.translateElement(elements[i], message);
        }

        var elementsWithTitle = iframe.contentDocument.querySelectorAll('[i18n-title]');
        for (var j = 0; j < elementsWithTitle.length; j++) {
            var title = localization.getMessage(elementsWithTitle[j].getAttribute('i18n-title'));
            elementsWithTitle[j].setAttribute('title', title);
        }
    };

    var appendContent = function (view) {
        var body = iframe.contentDocument.body;
        for (var i = 0; i < body.children.length; i++) {
            body.removeChild(body.children[i]);
        }
        body.appendChild(view);
    };

    // e.isTrusted checking for prevent programmatically events
    // see: https://github.com/AdguardTeam/AdguardAssistant/issues/134
    var removeIframe = function (e) {
        if (e && e.isTrusted === false) {
            return false;
        }

        if (!iframeElement) {
            return false;
        }

        document.removeEventListener('click', removeIframe);
        window.removeEventListener('orientationchange', showSelectorMenu);
        document.documentElement.removeChild(iframeElement);
        iframe = null;
        iframeElement = null;
        currentItem = null;
        selector.close();
        onCloseMenu.notify();
    };

    return {
        showSelectorMenu: showSelectorMenu,
        showSliderMenu: showSliderMenu,
        onCloseMenu: onCloseMenu,
        onShowMenuItem: onShowMenuItem,
        removeIframe: removeIframe,
        startSelect: startSelect
    };
};
